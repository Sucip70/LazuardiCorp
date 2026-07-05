package cache

import (
	"context"
	"time"
)

// Store is the cache backend (Redis in production, memory/noop for dev/tests).
type Store interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
	DeleteByPrefix(ctx context.Context, prefix string) (int, error)
	Exists(ctx context.Context, key string) (bool, error)
	Ping(ctx context.Context) error
	Enabled() bool
}

// ErrCacheMiss is returned when a key is not found.
type ErrCacheMiss struct{ Key string }

func (e ErrCacheMiss) Error() string { return "cache miss: " + e.Key }
