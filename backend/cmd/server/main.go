package main

import (
	"fmt"

	"go.uber.org/zap"

	"github.com/lazuardicorp/backend/internal/cache"
	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/database"
	"github.com/lazuardicorp/backend/internal/deploy"
	"github.com/lazuardicorp/backend/internal/logger"
	"github.com/lazuardicorp/backend/internal/repository"
	"github.com/lazuardicorp/backend/internal/router"
	"github.com/lazuardicorp/backend/internal/service"
	"github.com/lazuardicorp/backend/internal/storage"
)

func main() {
	cfg := config.Load()

	log, err := logger.New()
	if err != nil {
		panic(err)
	}
	defer log.Sync()

	db, err := database.Connect(cfg.DatabaseURL, log)
	if err != nil {
		log.Fatal("database connection failed", zap.Error(err))
	}

	cacheStore, err := cache.NewStore(cfg.Redis)
	if err != nil {
		log.Fatal("redis init failed", zap.Error(err))
	}
	if cacheStore.Enabled() {
		log.Info("redis cache connected")
	} else {
		log.Info("redis not configured — caching disabled")
	}

	store, err := storage.New(cfg.Storage)
	if err != nil {
		log.Fatal("storage init failed", zap.Error(err))
	}
	log.Info("storage backend ready", zap.String("provider", store.ProviderName()))

	userRepo := repository.NewUserRepository(db)
	projectRepo := repository.NewProjectRepository(db)
	pageRepo := repository.NewPageRepository(db)
	assetRepo := repository.NewAssetRepository(db)
	componentRepo := repository.NewComponentRepository(db)
	deployRepo := repository.NewDeployRepository(db)
	templateRepo := repository.NewTemplateRepository(db)

	invalidator := service.NewCacheInvalidator(cacheStore, log)
	sessionService := service.NewSessionService(cacheStore, cfg.JWTExpiry)

	authService := service.NewAuthService(userRepo, sessionService, cfg)
	assetService := service.NewAssetService(assetRepo, projectRepo, store, cfg.Assets, cfg.CDN, invalidator)
	projectService := service.NewProjectService(projectRepo, pageRepo, assetService, invalidator)
	pageService := service.NewPageService(projectRepo, pageRepo, invalidator)
	exportService := service.NewExportService(projectService, pageService, assetService)
	previewService := service.NewPreviewService(exportService, pageRepo, projectRepo, cacheStore, cfg.Cache.PreviewTTL, invalidator)
	componentService := service.NewComponentService(componentRepo, cacheStore, cfg.Cache.ComponentsTTL, invalidator)

	deployRegistry, err := deploy.NewRegistry(cfg.Deploy)
	if err != nil {
		log.Warn("S3 deploy provider unavailable", zap.Error(err))
	}
	deployService := service.NewDeployService(projectService, exportService, deployRepo, deployRegistry, cfg.Deploy, log)
	pageService.SetAutoDeployTrigger(deployService)
	templateService := service.NewTemplateService(templateRepo, projectRepo, pageRepo, invalidator)

	engine := router.New(router.Dependencies{
		Config:     cfg,
		Log:        log,
		Cache:      cacheStore,
		Auth:       authService,
		Projects:   projectService,
		Pages:      pageService,
		Assets:     assetService,
		Export:     exportService,
		Preview:    previewService,
		Components: componentService,
		Deploy:     deployService,
		Templates:  templateService,
		Storage:    store,
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Info("server starting", zap.String("addr", addr))
	if err := engine.Run(addr); err != nil {
		log.Fatal("server stopped", zap.Error(err))
	}
}
