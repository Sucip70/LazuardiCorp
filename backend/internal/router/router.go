package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/lazuardicorp/backend/internal/cache"
	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/handler"
	"github.com/lazuardicorp/backend/internal/middleware"
	"github.com/lazuardicorp/backend/internal/service"
	"github.com/lazuardicorp/backend/internal/storage"
)

type Dependencies struct {
	Config   config.Config
	Log      *zap.Logger
	Cache    cache.Store
	Auth     *service.AuthService
	Projects *service.ProjectService
	Pages    *service.PageService
	Assets   *service.AssetService
	Export   *service.ExportService
	Preview  *service.PreviewService
	Components *service.ComponentService
	Deploy     *service.DeployService
	Templates  *service.TemplateService
	Storage    storage.ObjectStorage
}

func New(deps Dependencies) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(deps.Log))
	r.Use(middleware.Logging(deps.Log))
	r.Use(middleware.CORS(deps.Config.CORSOrigin))
	r.Use(middleware.CDNCacheHeaders(deps.Config.CDN))

	authHandler := handler.NewAuthHandler(deps.Auth)
	projectHandler := handler.NewProjectHandler(deps.Projects, deps.Export)
	pageHandler := handler.NewPageHandler(deps.Pages, deps.Preview)
	assetHandler := handler.NewAssetHandler(deps.Assets)
	componentHandler := handler.NewComponentHandler(deps.Components)
	deployHandler := handler.NewDeployHandler(deps.Deploy)
	templateHandler := handler.NewTemplateHandler(deps.Templates)
	authMiddleware := middleware.Auth(deps.Auth)

	if local, ok := deps.Storage.(*storage.LocalStorage); ok {
		files := r.Group("/files")
		files.Use(middleware.CDNCacheHeaders(deps.Config.CDN))
		files.Static("", local.BasePath())
	}

	r.GET("/health", func(c *gin.Context) {
		status := gin.H{"status": "ok", "cache": "disabled"}
		if deps.Cache != nil && deps.Cache.Enabled() {
			status["cache"] = "redis"
			if err := deps.Cache.Ping(c.Request.Context()); err != nil {
				status["cache"] = "redis_error"
			}
		}
		c.JSON(http.StatusOK, status)
	})

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authMiddleware, authHandler.Logout)
			auth.GET("/me", authMiddleware, authHandler.Me)
			auth.PUT("/me", authMiddleware, authHandler.UpdateProfile)
			auth.PUT("/password", authMiddleware, authHandler.ChangePassword)
		}

		v1.GET("/components",
			middleware.HTTPCache(deps.Cache, deps.Config.Cache.ComponentsTTL, middleware.GlobalKey("/components")),
			componentHandler.List,
		)

		tmpl := v1.Group("/templates")
		{
			tmpl.GET("",
				middleware.HTTPCache(deps.Cache, deps.Config.Cache.APITTL, middleware.GlobalKey("/templates")),
				templateHandler.List,
			)
			tmpl.GET("/categories", templateHandler.ListCategories)
			tmpl.GET("/:id", templateHandler.Get)
			tmpl.GET("/:id/versions", templateHandler.ListVersions)
			tmpl.GET("/:id/versions/:version", templateHandler.GetVersion)
		}

		protected := v1.Group("")
		protected.Use(authMiddleware)
		{
			protected.POST("/templates/apply", templateHandler.Apply)

			protected.GET("/user/templates", templateHandler.ListUserTemplates)
			protected.POST("/user/templates", templateHandler.CreateUserTemplate)
			protected.PUT("/user/templates/:id", templateHandler.UpdateUserTemplate)
			protected.DELETE("/user/templates/:id", templateHandler.DeleteUserTemplate)

			protected.GET("/templates/mine",
				middleware.HTTPCache(deps.Cache, deps.Config.Cache.APITTL, middleware.UserScopedKey("templates-mine:")),
				templateHandler.ListMine,
			)

			projects := protected.Group("/projects")
			{
				projects.GET("",
					middleware.HTTPCache(deps.Cache, deps.Config.Cache.APITTL, middleware.UserProjectsListKey()),
					projectHandler.List,
				)
				projects.POST("", projectHandler.Create)
				projects.GET("/:id",
					middleware.HTTPCache(deps.Cache, deps.Config.Cache.APITTL, middleware.UserScopedKey("project:")),
					projectHandler.Get,
				)
				projects.PUT("/:id", projectHandler.Update)
				projects.DELETE("/:id", projectHandler.Delete)
				projects.POST("/:id/duplicate", projectHandler.Duplicate)
				projects.POST("/:id/as-template", templateHandler.SaveProjectAsTemplate)
				projects.GET("/:id/export", projectHandler.Export)

				deployCfg := projects.Group("/:id/deploy")
				{
					deployCfg.GET("/config", deployHandler.GetConfig)
					deployCfg.PUT("/config", deployHandler.UpdateConfig)
					deployCfg.POST("", deployHandler.Deploy)
					deployCfg.GET("/history", deployHandler.ListDeployments)
					deployCfg.GET("/history/:deploymentId", deployHandler.GetDeployment)
					deployCfg.POST("/preview-link", deployHandler.CreatePreviewLink)
					deployCfg.POST("/cloudfront", deployHandler.CreateCloudFront)
					deployCfg.POST("/ssl", deployHandler.ProvisionSSL)
				}

				domains := projects.Group("/:id/domains")
				{
					domains.GET("", deployHandler.ListDomains)
					domains.POST("", deployHandler.AddDomain)
					domains.DELETE("/:domainId", deployHandler.RemoveDomain)
					domains.POST("/:domainId/verify", deployHandler.VerifyDomain)
					domains.GET("/:domainId/dns", deployHandler.DNSInstructions)
				}

				assets := projects.Group("/:id/assets")
				{
					assets.GET("", assetHandler.List)
					assets.POST("", assetHandler.Upload)
					assets.GET("/:assetId", assetHandler.Get)
					assets.DELETE("/:assetId", assetHandler.Delete)
				}

				pages := projects.Group("/:id/pages")
				{
					pages.GET("", pageHandler.List)
					pages.POST("", pageHandler.Create)
					pages.GET("/:pageId", pageHandler.Get)
					pages.PUT("/:pageId", pageHandler.Update)
					pages.DELETE("/:pageId", pageHandler.Delete)
					pages.GET("/:pageId/document", pageHandler.LoadDocument)
					pages.PUT("/:pageId/document", pageHandler.SaveDocument)
					pages.GET("/:pageId/preview", pageHandler.Preview)
				}
			}
		}
	}

	legacy := r.Group("/api/projects")
	legacy.Use(authMiddleware)
	{
		legacy.GET("", projectHandler.LegacyList)
		legacy.POST("", projectHandler.LegacyCreate)
		legacy.GET("/:id", projectHandler.LegacyGet)
		legacy.PUT("/:id", projectHandler.LegacyUpdate)
		legacy.DELETE("/:id", projectHandler.LegacyDelete)
	}

	r.GET("/preview/:token", deployHandler.PublicPreview)

	return r
}
