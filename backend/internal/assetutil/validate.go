package assetutil

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gabriel-vasile/mimetype"
)

var defaultAllowedMIMEs = map[string]struct{}{
	"image/jpeg":    {},
	"image/png":     {},
	"image/webp":    {},
	"image/gif":     {},
	"image/svg+xml": {},
}

// ValidateUpload checks file size and MIME type using magic-byte detection.
func ValidateUpload(data []byte, filename string, maxBytes int64, allowedMIMEs []string) (string, error) {
	if int64(len(data)) == 0 {
		return "", fmt.Errorf("empty file")
	}
	if int64(len(data)) > maxBytes {
		return "", fmt.Errorf("file exceeds maximum size of %d bytes", maxBytes)
	}

	detected := mimetype.Detect(data).String()
	allowed := buildAllowedSet(allowedMIMEs)
	if _, ok := allowed[detected]; !ok {
		ext := strings.ToLower(filepath.Ext(filename))
		if ext == ".svg" && strings.Contains(string(data[:min(256, len(data))]), "<svg") {
			return "image/svg+xml", nil
		}
		return "", fmt.Errorf("unsupported file type: %s", detected)
	}
	return detected, nil
}

func buildAllowedSet(allowedMIMEs []string) map[string]struct{} {
	if len(allowedMIMEs) == 0 {
		return defaultAllowedMIMEs
	}
	set := make(map[string]struct{}, len(allowedMIMEs))
	for _, mime := range allowedMIMEs {
		mime = strings.TrimSpace(mime)
		if mime != "" {
			set[mime] = struct{}{}
		}
	}
	return set
}

func SanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '.', r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, name)
	if name == "" || name == "." {
		return "upload.bin"
	}
	return name
}

func ExtensionForMime(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/svg+xml":
		return ".svg"
	default:
		return ".bin"
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
