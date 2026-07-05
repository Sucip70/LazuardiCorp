package cdnutil

import "strings"

// RewriteAssetURL maps storage URLs to a CDN origin (CloudFront, Cloudflare, etc.).
func RewriteAssetURL(originalURL, cdnBase string) string {
	if cdnBase == "" || originalURL == "" {
		return originalURL
	}
	if idx := strings.Index(originalURL, "/files/"); idx >= 0 {
		return strings.TrimRight(cdnBase, "/") + originalURL[idx:]
	}
	if idx := strings.Index(originalURL, "/projects/"); idx >= 0 {
		return strings.TrimRight(cdnBase, "/") + "/" + strings.TrimPrefix(originalURL[idx:], "/")
	}
	return originalURL
}
