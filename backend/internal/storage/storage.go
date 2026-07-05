package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/lazuardicorp/backend/internal/config"
)

// ObjectStorage abstracts cloud/local blob storage.
type ObjectStorage interface {
	Put(ctx context.Context, key string, body io.Reader, contentType string, size int64) error
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, keys ...string) error
	PublicURL(key string) string
	ProviderName() string
}

func New(cfg config.StorageConfig) (ObjectStorage, error) {
	switch cfg.Driver {
	case "s3":
		return NewS3Storage(cfg)
	case "local", "":
		return NewLocalStorage(cfg)
	default:
		return nil, fmt.Errorf("unsupported storage driver: %s", cfg.Driver)
	}
}
