package middleware

import (
	"bytes"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/cache"
)

type responseCapture struct {
	gin.ResponseWriter
	body       bytes.Buffer
	statusCode int
}

func (w *responseCapture) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseCapture) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// HTTPCache caches successful GET JSON responses in Redis.
func HTTPCache(store cache.Store, ttl time.Duration, keyFn func(c *gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if store == nil || !store.Enabled() || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		key := keyFn(c)
		if key == "" {
			c.Next()
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if cached, err := store.Get(ctx, key); err == nil && len(cached) > 0 {
			c.Header("X-Cache", "HIT")
			c.Data(http.StatusOK, "application/json; charset=utf-8", cached)
			c.Abort()
			return
		}

		capture := &responseCapture{ResponseWriter: c.Writer, statusCode: http.StatusOK}
		c.Writer = capture
		c.Next()

		if capture.statusCode != http.StatusOK || capture.body.Len() == 0 {
			return
		}

		c.Header("X-Cache", "MISS")
		_ = store.Set(ctx, key, capture.body.Bytes(), ttl)
	}
}

// UserScopedKey builds a cache key from the authenticated user and request path.
func UserScopedKey(prefix string) func(*gin.Context) string {
	return func(c *gin.Context) string {
		userID, ok := c.Get(UserIDKey)
		if !ok {
			return ""
		}
		id, ok := userID.(uuid.UUID)
		if !ok {
			return ""
		}
		path := prefix
		if param := c.Param("id"); param != "" {
			path = prefix + param
		}
		return cache.APIResponseKey("GET", path, id.String())
	}
}

// UserProjectsListKey caches GET /projects for the current user.
func UserProjectsListKey() func(*gin.Context) string {
	return func(c *gin.Context) string {
		id := MustUserID(c)
		if id == uuid.Nil {
			return ""
		}
		return cache.UserProjectsKey(id)
	}
}

// GlobalKey builds a cache key without user scope.
func GlobalKey(path string) func(*gin.Context) string {
	return func(c *gin.Context) string {
		return cache.APIResponseKey("GET", path, "global")
	}
}
