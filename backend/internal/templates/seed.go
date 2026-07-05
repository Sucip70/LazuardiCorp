package templates

import (
	_ "embed"
	"encoding/json"

	"go.uber.org/zap"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

//go:embed data/landing.json
var landingJSON []byte

//go:embed data/business.json
var businessJSON []byte

//go:embed data/portfolio.json
var portfolioJSON []byte

//go:embed data/blog.json
var blogJSON []byte

//go:embed data/ecommerce.json
var ecommerceJSON []byte

type seedEntry struct {
	Slug         string
	Category     string
	Name         string
	Description  string
	PreviewImage string
	JSON         []byte
}

var builtinSeeds = []seedEntry{
	{
		Slug:         "saas-landing",
		Category:     model.TemplateCategoryLanding,
		Name:         "SaaS Landing Page",
		Description:  "Marketing landing page with header, hero, features, and footer.",
		PreviewImage: "https://placehold.co/640x400/2563eb/ffffff?text=SaaS+Landing",
		JSON:         landingJSON,
	},
	{
		Slug:         "corporate-business",
		Category:     model.TemplateCategoryBusiness,
		Name:         "Corporate Business",
		Description:  "Professional business site with services section and hero.",
		PreviewImage: "https://placehold.co/640x400/1e40af/ffffff?text=Business",
		JSON:         businessJSON,
	},
	{
		Slug:         "creative-portfolio",
		Category:     model.TemplateCategoryPortfolio,
		Name:         "Creative Portfolio",
		Description:  "Dark portfolio layout to showcase selected work.",
		PreviewImage: "https://placehold.co/640x400/7c3aed/ffffff?text=Portfolio",
		JSON:         portfolioJSON,
	},
	{
		Slug:         "tech-blog",
		Category:     model.TemplateCategoryBlog,
		Name:         "Tech Blog",
		Description:  "Blog article layout with rich typography and images.",
		PreviewImage: "https://placehold.co/640x400/111827/ffffff?text=Blog",
		JSON:         blogJSON,
	},
	{
		Slug:         "modern-store",
		Category:     model.TemplateCategoryEcommerce,
		Name:         "Modern Store",
		Description:  "E-commerce product page with gallery and add-to-cart.",
		PreviewImage: "https://placehold.co/640x400/059669/ffffff?text=E-Commerce",
		JSON:         ecommerceJSON,
	},
}

// SeedBuiltin inserts pre-built templates when the table is empty.
func SeedBuiltin(db *gorm.DB, log *zap.Logger) error {
	var count int64
	if err := db.Model(&model.Template{}).Where("is_builtin = ?", true).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	for _, entry := range builtinSeeds {
		if !json.Valid(entry.JSON) {
			log.Warn("skip invalid template json", zap.String("slug", entry.Slug))
			continue
		}
		tmpl := model.Template{
			Slug:         entry.Slug,
			Name:         entry.Name,
			Category:     entry.Category,
			Description:  entry.Description,
			PreviewImage: entry.PreviewImage,
			JSONData:     datatypes.JSON(entry.JSON),
			Version:      1,
			IsBuiltin:    true,
		}
		if err := db.Create(&tmpl).Error; err != nil {
			return err
		}
		ver := model.TemplateVersion{
			TemplateID: tmpl.ID,
			Version:    1,
			JSONData:   datatypes.JSON(entry.JSON),
			Changelog:  "Initial release",
		}
		if err := db.Create(&ver).Error; err != nil {
			return err
		}
	}
	log.Info("seeded built-in templates", zap.Int("count", len(builtinSeeds)))
	return nil
}
