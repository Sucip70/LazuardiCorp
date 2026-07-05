package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

type PageRepository struct {
	db *gorm.DB
}

func NewPageRepository(db *gorm.DB) *PageRepository {
	return &PageRepository{db: db}
}

func (r *PageRepository) Create(page *model.Page) error {
	return r.db.Create(page).Error
}

func (r *PageRepository) Update(page *model.Page) error {
	return r.db.Save(page).Error
}

func (r *PageRepository) Delete(id, projectID uuid.UUID) error {
	result := r.db.Where("id = ? AND project_id = ?", id, projectID).Delete(&model.Page{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PageRepository) FindByID(id, projectID uuid.UUID) (*model.Page, error) {
	var page model.Page
	err := r.db.Where("id = ? AND project_id = ?", id, projectID).First(&page).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &page, err
}

func (r *PageRepository) ListByProject(projectID uuid.UUID) ([]model.Page, error) {
	var pages []model.Page
	err := r.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&pages).Error
	return pages, err
}

func (r *PageRepository) PathExists(projectID uuid.UUID, path string, excludeID *uuid.UUID) (bool, error) {
	query := r.db.Model(&model.Page{}).Where("project_id = ? AND path = ?", projectID, path)
	if excludeID != nil {
		query = query.Where("id <> ?", *excludeID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *PageRepository) ClearHome(projectID uuid.UUID, exceptID *uuid.UUID) error {
	query := r.db.Model(&model.Page{}).Where("project_id = ?", projectID)
	if exceptID != nil {
		query = query.Where("id <> ?", *exceptID)
	}
	return query.Update("is_home", false).Error
}
