package service

import (
	"context"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/lazuardicorp/backend/internal/cache"
)

// CacheInvalidator centralizes cache busting when data changes.
type CacheInvalidator struct {
	store cache.Store
	log   *zap.Logger
}

func NewCacheInvalidator(store cache.Store, log *zap.Logger) *CacheInvalidator {
	return &CacheInvalidator{store: store, log: log}
}

func (c *CacheInvalidator) enabled() bool {
	return c != nil && c.store != nil && c.store.Enabled()
}

func (c *CacheInvalidator) InvalidatePage(ctx context.Context, projectID, pageID uuid.UUID) {
	if !c.enabled() {
		return
	}
	_ = c.store.Delete(ctx, cache.PreviewKey(projectID, pageID))
}

func (c *CacheInvalidator) InvalidateProject(ctx context.Context, projectID uuid.UUID) {
	if !c.enabled() {
		return
	}
	if n, err := c.store.DeleteByPrefix(ctx, cache.PreviewProjectPattern(projectID)); err == nil {
		c.log.Debug("invalidated preview cache", zap.String("project_id", projectID.String()), zap.Int("keys", n))
	}
}

func (c *CacheInvalidator) InvalidateUserProjects(ctx context.Context, userID uuid.UUID) {
	if !c.enabled() {
		return
	}
	_ = c.store.Delete(ctx, cache.UserProjectsKey(userID))
}

func (c *CacheInvalidator) InvalidateComponents(ctx context.Context) {
	if !c.enabled() {
		return
	}
	_ = c.store.Delete(ctx, cache.ComponentsKey())
}

func (c *CacheInvalidator) InvalidateAllProjectAPI(ctx context.Context, projectID uuid.UUID) {
	if !c.enabled() {
		return
	}
	_, _ = c.store.DeleteByPrefix(ctx, cache.PreviewProjectPattern(projectID))
}
