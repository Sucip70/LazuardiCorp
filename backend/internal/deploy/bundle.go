package deploy

import (
	"bytes"
	"context"
	"fmt"
	"mime"
	"path/filepath"
	"strings"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

// ContentTypeForPath returns the MIME type for a static file path.
func ContentTypeForPath(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js", ".mjs":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".woff2":
		return "font/woff2"
	case ".woff":
		return "font/woff"
	case ".ttf":
		return "font/ttf"
	case ".ico":
		return "image/x-icon"
	case ".txt":
		return "text/plain; charset=utf-8"
	case ".xml":
		return "application/xml"
	default:
		if ct := mime.TypeByExtension(ext); ct != "" {
			return ct
		}
		return "application/octet-stream"
	}
}

// CacheControlForPath returns cache headers for static assets.
func CacheControlForPath(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".html", ".htm":
		return "public, max-age=60"
	default:
		return "public, max-age=31536000, immutable"
	}
}

// BundleToZip converts a site bundle to a ZIP archive (used by Netlify deploy API).
func BundleToZip(bundle staticgen.SiteBundle, root string) ([]byte, error) {
	return staticgen.ZipBundle(bundle, root)
}

// UploadFunc uploads a single file to remote storage.
type UploadFunc func(ctx context.Context, key string, body []byte, contentType, cacheControl string) error

// SyncBundle uploads all files in a bundle under prefix.
func SyncBundle(ctx context.Context, prefix string, bundle staticgen.SiteBundle, upload UploadFunc) error {
	prefix = strings.Trim(prefix, "/")
	for name, content := range bundle {
		key := name
		if prefix != "" {
			key = prefix + "/" + strings.TrimPrefix(name, "/")
		}
		key = strings.ReplaceAll(key, "\\", "/")
		if err := upload(ctx, key, content, ContentTypeForPath(name), CacheControlForPath(name)); err != nil {
			return fmt.Errorf("upload %s: %w", key, err)
		}
	}
	return nil
}

// ReaderFromBytes wraps bytes for upload APIs expecting io.Reader.
func ReaderFromBytes(b []byte) *bytes.Reader {
	return bytes.NewReader(b)
}
