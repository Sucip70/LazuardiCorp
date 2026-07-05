package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

type TemplateRepository struct {
	db *gorm.DB
}

func NewTemplateRepository(db *gorm.DB) *TemplateRepository {
	return &TemplateRepository{db: db}
}

func (r *TemplateRepository) List(category string, includeUser bool, userID *uuid.UUID) ([]model.Template, error) {
	query := r.db.Model(&model.Template{}).Order("category ASC, name ASC")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if includeUser && userID != nil {
		query = query.Where("is_builtin = ? OR user_id = ?", true, *userID)
	} else {
		query = query.Where("is_builtin = ?", true)
	}
	var items []model.Template
	err := query.Find(&items).Error
	return items, err
}

func (r *TemplateRepository) FindByID(id uuid.UUID) (*model.Template, error) {
	var tmpl model.Template
	err := r.db.First(&tmpl, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &tmpl, err
}

func (r *TemplateRepository) FindBySlug(slug string) (*model.Template, error) {
	var tmpl model.Template
	err := r.db.First(&tmpl, "slug = ?", slug).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &tmpl, err
}

func (r *TemplateRepository) Create(tmpl *model.Template) error {
	return r.db.Create(tmpl).Error
}

func (r *TemplateRepository) Update(tmpl *model.Template) error {
	return r.db.Save(tmpl).Error
}

func (r *TemplateRepository) Delete(id uuid.UUID) error {
	result := r.db.Delete(&model.Template{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TemplateRepository) ListVersions(templateID uuid.UUID) ([]model.TemplateVersion, error) {
	var versions []model.TemplateVersion
	err := r.db.Where("template_id = ?", templateID).Order("version DESC").Find(&versions).Error
	return versions, err
}

func (r *TemplateRepository) FindVersion(templateID uuid.UUID, version int) (*model.TemplateVersion, error) {
	var ver model.TemplateVersion
	err := r.db.Where("template_id = ? AND version = ?", templateID, version).First(&ver).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &ver, err
}

func (r *TemplateRepository) CreateVersion(ver *model.TemplateVersion) error {
	return r.db.Create(ver).Error
}

func (r *TemplateRepository) ListUserTemplates(userID uuid.UUID) ([]model.UserTemplate, error) {
	var items []model.UserTemplate
	err := r.db.Preload("Template").Where("user_id = ?", userID).Order("updated_at DESC").Find(&items).Error
	return items, err
}

func (r *TemplateRepository) FindUserTemplate(id, userID uuid.UUID) (*model.UserTemplate, error) {
	var item model.UserTemplate
	err := r.db.Preload("Template").Where("id = ? AND user_id = ?", id, userID).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &item, err
}

func (r *TemplateRepository) CreateUserTemplate(item *model.UserTemplate) error {
	return r.db.Create(item).Error
}

func (r *TemplateRepository) UpdateUserTemplate(item *model.UserTemplate) error {
	return r.db.Save(item).Error
}

func (r *TemplateRepository) DeleteUserTemplate(id, userID uuid.UUID) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.UserTemplate{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TemplateRepository) DistinctCategories() ([]string, error) {
	var categories []string
	err := r.db.Model(&model.Template{}).
		Where("is_builtin = ?", true).
		Distinct("category").
		Order("category ASC").
		Pluck("category", &categories).Error
	return categories, err
}
