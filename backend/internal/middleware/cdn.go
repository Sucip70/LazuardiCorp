package middleware

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/config"
)

// CDNCacheHeaders adds CDN-friendly Cache-Control headers for static assets.
func CDNCacheHeaders(cfg config.CDNConfig) gin.HandlerFunc {
	maxAge := cfg.MaxAge
	if maxAge <= 0 {
		maxAge = 86400
	}
	cacheControl := fmt.Sprintf("public, max-age=%d, immutable", maxAge)

	return func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, "/files/") {
			c.Next()
			return
		}
		c.Header("Cache-Control", cacheControl)
		if cfg.BaseURL != "" {
			c.Header("CDN-Cache-Control", cacheControl)
			c.Header("X-CDN-Base", cfg.BaseURL)
		}
		c.Next()
	}
}
