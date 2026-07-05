package cache

import (
	"context"
	"time"
)

// NoopStore disables caching — used when REDIS_URL is not configured.
type NoopStore struct{}

func NewNoop() *NoopStore { return &NoopStore{} }

func (n *NoopStore) Enabled() bool { return false }

func (n *NoopStore) Ping(_ context.Context) error { return nil }

func (n *NoopStore) Get(_ context.Context, key string) ([]byte, error) {
	return nil, ErrCacheMiss{Key: key}
}

func (n *NoopStore) Set(_ context.Context, _ string, _ []byte, _ time.Duration) error {
	return nil
}

func (n *NoopStore) Delete(_ context.Context, _ ...string) error { return nil }

func (n *NoopStore) DeleteByPrefix(_ context.Context, _ string) (int, error) {
	return 0, nil
}

func (n *NoopStore) Exists(_ context.Context, _ string) (bool, error) {
	return false, nil
}
