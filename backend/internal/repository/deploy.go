package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

type DeployRepository struct {
	db *gorm.DB
}

func NewDeployRepository(db *gorm.DB) *DeployRepository {
	return &DeployRepository{db: db}
}

func (r *DeployRepository) GetOrCreateConfig(projectID uuid.UUID) (*model.ProjectDeployConfig, error) {
	var cfg model.ProjectDeployConfig
	err := r.db.Where("project_id = ?", projectID).First(&cfg).Error
	if err == nil {
		return &cfg, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	cfg = model.ProjectDeployConfig{
		ProjectID: projectID,
		Provider:  model.DeployProviderS3,
	}
	if err := r.db.Create(&cfg).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (r *DeployRepository) UpdateConfig(cfg *model.ProjectDeployConfig) error {
	return r.db.Save(cfg).Error
}

func (r *DeployRepository) CreateDeployment(dep *model.Deployment) error {
	return r.db.Create(dep).Error
}

func (r *DeployRepository) UpdateDeployment(dep *model.Deployment) error {
	return r.db.Save(dep).Error
}

func (r *DeployRepository) FindDeployment(id, projectID uuid.UUID) (*model.Deployment, error) {
	var dep model.Deployment
	err := r.db.Where("id = ? AND project_id = ?", id, projectID).First(&dep).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &dep, err
}

func (r *DeployRepository) FindDeploymentByPreviewToken(token string) (*model.Deployment, error) {
	var dep model.Deployment
	err := r.db.Where("preview_token = ? AND is_preview = ?", token, true).First(&dep).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &dep, err
}

func (r *DeployRepository) ListDeployments(projectID uuid.UUID, limit int) ([]model.Deployment, error) {
	if limit <= 0 {
		limit = 20
	}
	var deps []model.Deployment
	err := r.db.Where("project_id = ?", projectID).
		Order("created_at DESC").
		Limit(limit).
		Find(&deps).Error
	return deps, err
}

func (r *DeployRepository) CreateDomain(domain *model.DeploymentDomain) error {
	return r.db.Create(domain).Error
}

func (r *DeployRepository) UpdateDomain(domain *model.DeploymentDomain) error {
	return r.db.Save(domain).Error
}

func (r *DeployRepository) FindDomain(id, projectID uuid.UUID) (*model.DeploymentDomain, error) {
	var domain model.DeploymentDomain
	err := r.db.Where("id = ? AND project_id = ?", id, projectID).First(&domain).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &domain, err
}

func (r *DeployRepository) FindDomainByHostname(projectID uuid.UUID, hostname string) (*model.DeploymentDomain, error) {
	var domain model.DeploymentDomain
	err := r.db.Where("project_id = ? AND hostname = ?", projectID, hostname).First(&domain).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &domain, err
}

func (r *DeployRepository) ListDomains(projectID uuid.UUID) ([]model.DeploymentDomain, error) {
	var domains []model.DeploymentDomain
	err := r.db.Where("project_id = ?", projectID).Order("is_primary DESC, created_at ASC").Find(&domains).Error
	return domains, err
}

func (r *DeployRepository) DeleteDomain(id, projectID uuid.UUID) error {
	result := r.db.Where("id = ? AND project_id = ?", id, projectID).Delete(&model.DeploymentDomain{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *DeployRepository) ClearPrimaryDomain(projectID uuid.UUID) error {
	return r.db.Model(&model.DeploymentDomain{}).
		Where("project_id = ?", projectID).
		Update("is_primary", false).Error
}
