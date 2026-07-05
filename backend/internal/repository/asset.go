package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lazuardicorp/backend/internal/model"
)

type AssetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) *AssetRepository {
	return &AssetRepository{db: db}
}

func (r *AssetRepository) Create(asset *model.Asset) error {
	return r.db.Create(asset).Error
}

func (r *AssetRepository) FindByID(projectID uuid.UUID, assetID uuid.UUID) (*model.Asset, error) {
	var asset model.Asset
	err := r.db.Where("project_id = ? AND id = ?", projectID, assetID).First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &asset, err
}

func (r *AssetRepository) FindByRef(projectID uuid.UUID, ref string) (*model.Asset, error) {
	var asset model.Asset
	err := r.db.Where("project_id = ? AND (public_id = ? OR id::text = ?)", projectID, ref, ref).First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &asset, err
}

func (r *AssetRepository) ListByProject(projectID uuid.UUID) ([]model.Asset, error) {
	var assets []model.Asset
	err := r.db.Where("project_id = ?", projectID).Order("created_at DESC").Find(&assets).Error
	return assets, err
}

func (r *AssetRepository) Delete(projectID, assetID uuid.UUID) error {
	result := r.db.Where("project_id = ? AND id = ?", projectID, assetID).Delete(&model.Asset{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AssetRepository) DeleteByProject(projectID uuid.UUID) ([]model.Asset, error) {
	var assets []model.Asset
	if err := r.db.Where("project_id = ?", projectID).Find(&assets).Error; err != nil {
		return nil, err
	}
	if err := r.db.Where("project_id = ?", projectID).Delete(&model.Asset{}).Error; err != nil {
		return nil, err
	}
	return assets, nil
}
