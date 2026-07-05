package database

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/templates"
)

func Connect(databaseURL string, log *zap.Logger) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Project{},
		&model.Page{},
		&model.Asset{},
		&model.Component{},
		&model.ProjectDeployConfig{},
		&model.Deployment{},
		&model.DeploymentDomain{},
		&model.Template{},
		&model.TemplateVersion{},
		&model.UserTemplate{},
	); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	if err := templates.SeedBuiltin(db, log); err != nil {
		return nil, fmt.Errorf("seed templates: %w", err)
	}

	log.Info("database connected and migrated")
	return db, nil
}
