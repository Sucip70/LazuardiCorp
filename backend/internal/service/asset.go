package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/assetutil"
	"github.com/lazuardicorp/backend/internal/cdnutil"
	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/imaging"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
	"github.com/lazuardicorp/backend/internal/storage"
)

type AssetService struct {
	assets      *repository.AssetRepository
	projects    *repository.ProjectRepository
	storage     storage.ObjectStorage
	cfg         config.AssetConfig
	cdnBase     string
	invalidator *CacheInvalidator
}

func NewAssetService(
	assets *repository.AssetRepository,
	projects *repository.ProjectRepository,
	store storage.ObjectStorage,
	cfg config.AssetConfig,
	cdn config.CDNConfig,
	invalidator *CacheInvalidator,
) *AssetService {
	cdnBase := ""
	if cdn.Enabled {
		cdnBase = cdn.BaseURL
	}
	return &AssetService{assets: assets, projects: projects, storage: store, cfg: cfg, cdnBase: cdnBase, invalidator: invalidator}
}

type UploadInput struct {
	UserID           uuid.UUID
	ProjectID        uuid.UUID
	OriginalFilename string
	Alt              string
	Reader           io.Reader
}

func (s *AssetService) Upload(ctx context.Context, input UploadInput) (dto.AssetResponse, error) {
	if _, err := s.projects.FindByID(input.ProjectID, input.UserID); err != nil {
		return dto.AssetResponse{}, err
	}

	data, err := imaging.ReadAll(input.Reader, s.cfg.MaxSizeBytes)
	if err != nil {
		return dto.AssetResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	mimeType, err := assetutil.ValidateUpload(data, input.OriginalFilename, s.cfg.MaxSizeBytes, s.cfg.AllowedMIMEs)
	if err != nil {
		return dto.AssetResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	variants, err := imaging.ProcessRaster(data, mimeType)
	if err != nil {
		return dto.AssetResponse{}, fmt.Errorf("%w: image processing failed: %v", ErrInvalidInput, err)
	}

	assetID := uuid.New()
	publicID := fmt.Sprintf("asset_%s", strings.ReplaceAll(assetID.String()[:8], "-", ""))
	safeName := assetutil.SanitizeFilename(input.OriginalFilename)
	ext := assetutil.ExtensionForMime(mimeType)
	if !strings.HasSuffix(strings.ToLower(safeName), ext) {
		safeName = strings.TrimSuffix(safeName, filepathExt(safeName)) + ext
	}

	baseKey := fmt.Sprintf("projects/%s/assets/%s/%s", input.ProjectID, assetID, safeName)
	thumbKey := fmt.Sprintf("projects/%s/assets/%s/thumb%s", input.ProjectID, assetID, extForMime(variants.ThumbnailMime, ext))
	optKey := fmt.Sprintf("projects/%s/assets/%s/optimized%s", input.ProjectID, assetID, extForMime(variants.OptimizedMime, ext))

	if err := s.storage.Put(ctx, baseKey, bytes.NewReader(variants.Original), mimeType, int64(len(variants.Original))); err != nil {
		return dto.AssetResponse{}, err
	}

	thumbURL := ""
	optURL := ""
	if len(variants.Thumbnail) > 0 && mimeType != "image/svg+xml" {
		if err := s.storage.Put(ctx, thumbKey, bytes.NewReader(variants.Thumbnail), variants.ThumbnailMime, int64(len(variants.Thumbnail))); err == nil {
			thumbURL = s.storage.PublicURL(thumbKey)
		}
	}
	if len(variants.Optimized) > 0 && mimeType != "image/svg+xml" {
		if err := s.storage.Put(ctx, optKey, bytes.NewReader(variants.Optimized), variants.OptimizedMime, int64(len(variants.Optimized))); err == nil {
			optURL = s.storage.PublicURL(optKey)
		}
	}

	asset := &model.Asset{
		ID:               assetID,
		ProjectID:        input.ProjectID,
		UserID:           input.UserID,
		PublicID:         publicID,
		Filename:         safeName,
		OriginalFilename: input.OriginalFilename,
		MimeType:         mimeType,
		SizeBytes:        int64(len(variants.Original)),
		Width:            variants.Width,
		Height:           variants.Height,
		Alt:              input.Alt,
		StorageProvider:  s.storage.ProviderName(),
		StorageKey:       baseKey,
		URL:              s.storage.PublicURL(baseKey),
		ThumbnailKey:     thumbKey,
		ThumbnailURL:     thumbURL,
		OptimizedKey:     optKey,
		OptimizedURL:     optURL,
	}
	if err := s.assets.Create(asset); err != nil {
		_ = s.storage.Delete(ctx, baseKey, thumbKey, optKey)
		return dto.AssetResponse{}, err
	}
	if s.invalidator != nil {
		s.invalidator.InvalidateProject(ctx, input.ProjectID)
	}

	return toAssetResponse(asset, s.cdnBase), nil
}

func (s *AssetService) List(userID, projectID uuid.UUID) ([]dto.AssetResponse, error) {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return nil, err
	}
	assets, err := s.assets.ListByProject(projectID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AssetResponse, 0, len(assets))
	for i := range assets {
		out = append(out, toAssetResponse(&assets[i], s.cdnBase))
	}
	return out, nil
}

func (s *AssetService) Get(userID, projectID, assetID uuid.UUID) (dto.AssetResponse, error) {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return dto.AssetResponse{}, err
	}
	asset, err := s.assets.FindByID(projectID, assetID)
	if err != nil {
		return dto.AssetResponse{}, err
	}
	return toAssetResponse(asset, s.cdnBase), nil
}

func (s *AssetService) Delete(ctx context.Context, userID, projectID, assetID uuid.UUID) error {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return err
	}
	asset, err := s.assets.FindByID(projectID, assetID)
	if err != nil {
		return err
	}
	if err := s.assets.Delete(projectID, assetID); err != nil {
		return err
	}
	if err := s.storage.Delete(ctx, asset.StorageKey, asset.ThumbnailKey, asset.OptimizedKey); err != nil {
		return err
	}
	if s.invalidator != nil {
		s.invalidator.InvalidateProject(ctx, projectID)
	}
	return nil
}

func (s *AssetService) PurgeProjectAssets(ctx context.Context, projectID uuid.UUID) error {
	assets, err := s.assets.DeleteByProject(projectID)
	if err != nil {
		return err
	}
	for _, asset := range assets {
		if err := s.storage.Delete(ctx, asset.StorageKey, asset.ThumbnailKey, asset.OptimizedKey); err != nil {
			return err
		}
	}
	return nil
}

// ResolveURL returns the best URL for an asset reference (public ID or UUID).
func (s *AssetService) ResolveURL(projectID uuid.UUID, ref string, preferOptimized bool) (string, error) {
	asset, err := s.assets.FindByRef(projectID, ref)
	if err != nil {
		return "", err
	}
	if preferOptimized && asset.OptimizedURL != "" {
		return asset.OptimizedURL, nil
	}
	return asset.URL, nil
}

// ListModelAssets returns raw assets for export bundling.
func (s *AssetService) ListModelAssets(projectID uuid.UUID) ([]model.Asset, error) {
	return s.assets.ListByProject(projectID)
}

// OpenAsset returns readable content for export (prefers optimized variant).
func (s *AssetService) OpenAsset(ctx context.Context, asset *model.Asset, preferOptimized bool) (io.ReadCloser, string, error) {
	key := asset.StorageKey
	mime := asset.MimeType
	if preferOptimized && asset.OptimizedKey != "" {
		key = asset.OptimizedKey
		mime = optimizedMime(asset.MimeType)
	}
	rc, err := s.storage.Get(ctx, key)
	if err != nil {
		return nil, "", err
	}
	return rc, mime, nil
}

func toAssetResponse(asset *model.Asset, cdnBase string) dto.AssetResponse {
	return dto.AssetResponse{
		ID:               asset.ID.String(),
		PublicID:         asset.PublicID,
		ProjectID:        asset.ProjectID.String(),
		Filename:         asset.Filename,
		OriginalFilename: asset.OriginalFilename,
		MimeType:         asset.MimeType,
		SizeBytes:        asset.SizeBytes,
		Width:            asset.Width,
		Height:           asset.Height,
		Alt:              asset.Alt,
		URL:              cdnutil.RewriteAssetURL(asset.URL, cdnBase),
		ThumbnailURL:     cdnutil.RewriteAssetURL(asset.ThumbnailURL, cdnBase),
		OptimizedURL:     cdnutil.RewriteAssetURL(asset.OptimizedURL, cdnBase),
		CreatedAt:        asset.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func filepathExt(name string) string {
	if i := strings.LastIndex(name, "."); i >= 0 {
		return name[i:]
	}
	return ""
}

func extForMime(mime, fallback string) string {
	ext := assetutil.ExtensionForMime(mime)
	if ext == ".bin" {
		return fallback
	}
	return ext
}

func optimizedMime(original string) string {
	if original == "image/png" {
		return "image/png"
	}
	return "image/jpeg"
}
