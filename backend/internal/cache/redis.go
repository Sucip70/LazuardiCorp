package cache

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/lazuardicorp/backend/internal/config"
)

type RedisStore struct {
	client *redis.Client
	prefix string
}

func NewRedis(cfg config.RedisConfig) (*RedisStore, error) {
	if cfg.URL == "" {
		return nil, fmt.Errorf("redis URL is empty")
	}
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse redis URL: %w", err)
	}
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	return &RedisStore{client: client, prefix: prefix}, nil
}

func (r *RedisStore) Enabled() bool { return true }

func (r *RedisStore) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *RedisStore) Get(ctx context.Context, key string) ([]byte, error) {
	val, err := r.client.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrCacheMiss{Key: key}
	}
	return val, err
}

func (r *RedisStore) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

func (r *RedisStore) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

func (r *RedisStore) DeleteByPrefix(ctx context.Context, prefix string) (int, error) {
	var cursor uint64
	deleted := 0
	for {
		keys, next, err := r.client.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			return deleted, err
		}
		if len(keys) > 0 {
			if err := r.client.Del(ctx, keys...).Err(); err != nil {
				return deleted, err
			}
			deleted += len(keys)
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return deleted, nil
}

func (r *RedisStore) Exists(ctx context.Context, key string) (bool, error) {
	n, err := r.client.Exists(ctx, key).Result()
	return n > 0, err
}

func (r *RedisStore) Close() error {
	return r.client.Close()
}

// NewStore returns Redis when configured, otherwise a no-op store.
func NewStore(cfg config.RedisConfig) (Store, error) {
	if !cfg.Enabled || cfg.URL == "" {
		return NewNoop(), nil
	}
	return NewRedis(cfg)
}
