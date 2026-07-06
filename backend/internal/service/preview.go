package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/cache"
	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

type PreviewService struct {
	export      *ExportService
	pages       *repository.PageRepository
	projects    *repository.ProjectRepository
	store       cache.Store
	ttl         time.Duration
	invalidator *CacheInvalidator
}

func NewPreviewService(
	export *ExportService,
	pages *repository.PageRepository,
	projects *repository.ProjectRepository,
	store cache.Store,
	ttl time.Duration,
	invalidator *CacheInvalidator,
) *PreviewService {
	return &PreviewService{
		export: export, pages: pages, projects: projects,
		store: store, ttl: ttl, invalidator: invalidator,
	}
}

func (s *PreviewService) GetHomeHTML(ctx context.Context, userID, projectID uuid.UUID) (string, error) {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return "", err
	}
	pages, err := s.pages.ListByProject(projectID)
	if err != nil {
		return "", err
	}
	if len(pages) == 0 {
		return "", repository.ErrNotFound
	}

	var home *model.Page
	for i := range pages {
		if pages[i].IsHome {
			home = &pages[i]
			break
		}
	}
	if home == nil {
		home = &pages[0]
	}
	return s.GetHTML(ctx, userID, projectID, home.ID)
}

func (s *PreviewService) GetHTML(ctx context.Context, userID, projectID, pageID uuid.UUID) (string, error) {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return "", err
	}
	page, err := s.pages.FindByID(pageID, projectID)
	if err != nil {
		return "", err
	}

	key := cache.PreviewKey(projectID, pageID)
	if s.store != nil && s.store.Enabled() {
		if cached, err := s.store.Get(ctx, key); err == nil && len(cached) > 0 {
			return string(cached), nil
		}
	}

	html, err := s.export.ExportPageHTML(userID, projectID, *page)
	if err != nil {
		return "", err
	}

	if s.store != nil && s.store.Enabled() {
		_ = s.store.Set(ctx, key, []byte(html), s.ttl)
	}
	return html, nil
}

type ComponentService struct {
	repo        *repository.ComponentRepository
	store       cache.Store
	ttl         time.Duration
	invalidator *CacheInvalidator
}

func NewComponentService(
	repo *repository.ComponentRepository,
	store cache.Store,
	ttl time.Duration,
	invalidator *CacheInvalidator,
) *ComponentService {
	return &ComponentService{repo: repo, store: store, ttl: ttl, invalidator: invalidator}
}

func (s *ComponentService) List(ctx context.Context) ([]dto.ComponentResponse, error) {
	if s.store != nil && s.store.Enabled() {
		if cached, err := s.store.Get(ctx, cache.ComponentsKey()); err == nil {
			var out []dto.ComponentResponse
			if json.Unmarshal(cached, &out) == nil {
				return out, nil
			}
		}
	}

	components, err := s.repo.ListActive()
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComponentResponse, 0, len(components))
	for i := range components {
		out = append(out, toComponentResponse(&components[i]))
	}

	if s.store != nil && s.store.Enabled() {
		if encoded, err := json.Marshal(out); err == nil {
			_ = s.store.Set(ctx, cache.ComponentsKey(), encoded, s.ttl)
		}
	}
	return out, nil
}

func toComponentResponse(c *model.Component) dto.ComponentResponse {
	return dto.ComponentResponse{
		ID:              c.ID.String(),
		Name:            c.Name,
		Category:        c.Category,
		AcceptsChildren: c.AcceptsChildren,
		DefaultProps:    rawJSON(c.DefaultProps),
		DefaultStyles:   rawJSON(c.DefaultStyles),
	}
}
