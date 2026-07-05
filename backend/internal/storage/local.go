package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/lazuardicorp/backend/internal/config"
)

type LocalStorage struct {
	basePath string
	publicURL string
}

func NewLocalStorage(cfg config.StorageConfig) (*LocalStorage, error) {
	base := cfg.LocalPath
	if base == "" {
		base = "./storage"
	}
	if err := os.MkdirAll(base, 0o755); err != nil {
		return nil, fmt.Errorf("create storage dir: %w", err)
	}
	publicURL := strings.TrimRight(cfg.PublicBaseURL, "/")
	if publicURL == "" {
		publicURL = "http://localhost:8080/files"
	}
	return &LocalStorage{basePath: base, publicURL: publicURL}, nil
}

func (s *LocalStorage) ProviderName() string { return "local" }

func (s *LocalStorage) fullPath(key string) string {
	return filepath.Join(s.basePath, filepath.FromSlash(key))
}

func (s *LocalStorage) Put(_ context.Context, key string, body io.Reader, _ string, _ int64) error {
	path := s.fullPath(key)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, body)
	return err
}

func (s *LocalStorage) Get(_ context.Context, key string) (io.ReadCloser, error) {
	return os.Open(s.fullPath(key))
}

func (s *LocalStorage) Delete(_ context.Context, keys ...string) error {
	for _, key := range keys {
		if key == "" {
			continue
		}
		if err := os.Remove(s.fullPath(key)); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

func (s *LocalStorage) PublicURL(key string) string {
	return s.publicURL + "/" + strings.TrimPrefix(key, "/")
}

// BasePath exposes the root directory for static file serving.
func (s *LocalStorage) BasePath() string { return s.basePath }
