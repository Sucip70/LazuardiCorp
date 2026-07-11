package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

type ProjectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(project *model.Project) error {
	return r.db.Create(project).Error
}

func (r *ProjectRepository) Update(project *model.Project) error {
	return r.db.Save(project).Error
}

func (r *ProjectRepository) Delete(id, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var project model.Project
		if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}

		// Clear FK from deploy config → last deployment before removing deployments.
		if err := tx.Model(&model.ProjectDeployConfig{}).
			Where("project_id = ?", id).
			Update("last_deployment_id", nil).Error; err != nil {
			return err
		}

		if err := tx.Where("project_id = ?", id).Delete(&model.DeploymentDomain{}).Error; err != nil {
			return err
		}
		if err := tx.Where("project_id = ?", id).Delete(&model.Deployment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("project_id = ?", id).Delete(&model.ProjectDeployConfig{}).Error; err != nil {
			return err
		}
		if err := tx.Where("project_id = ?", id).Delete(&model.Asset{}).Error; err != nil {
			return err
		}
		if err := tx.Where("project_id = ?", id).Delete(&model.Page{}).Error; err != nil {
			return err
		}

		result := tx.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Project{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func (r *ProjectRepository) FindByID(id, userID uuid.UUID) (*model.Project, error) {
	var project model.Project
	err := r.db.Preload("Pages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Where("id = ? AND user_id = ?", id, userID).First(&project).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &project, err
}

func (r *ProjectRepository) ListByUser(userID uuid.UUID) ([]model.Project, error) {
	var projects []model.Project
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&projects).Error
	return projects, err
}

func (r *ProjectRepository) ListTemplates() ([]model.Project, error) {
	var projects []model.Project
	err := r.db.Where("is_template = ?", true).Order("name ASC").Find(&projects).Error
	return projects, err
}

func (r *ProjectRepository) FindByIDOnly(id uuid.UUID) (*model.Project, error) {
	var project model.Project
	err := r.db.Preload("Pages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&project, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &project, err
}

func (r *ProjectRepository) SlugExists(userID uuid.UUID, slug string, excludeID *uuid.UUID) (bool, error) {
	query := r.db.Model(&model.Project{}).Where("user_id = ? AND slug = ?", userID, slug)
	if excludeID != nil {
		query = query.Where("id <> ?", *excludeID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
