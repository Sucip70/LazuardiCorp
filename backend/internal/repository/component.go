package repository

import (
	"github.com/lazuardicorp/backend/internal/model"
	"gorm.io/gorm"
)

type ComponentRepository struct {
	db *gorm.DB
}

func NewComponentRepository(db *gorm.DB) *ComponentRepository {
	return &ComponentRepository{db: db}
}

func (r *ComponentRepository) ListActive() ([]model.Component, error) {
	var components []model.Component
	err := r.db.Where("deleted_at IS NULL").Order("category ASC, name ASC").Find(&components).Error
	return components, err
}
