package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

const UserIDKey = "userID"

func Auth(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "missing bearer token"})
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		userID, err := auth.ParseToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "invalid token"})
			return
		}
		if err := auth.ValidateSession(c.Request.Context(), token); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "session expired or revoked"})
			return
		}
		c.Set(UserIDKey, userID)
		c.Set("authToken", token)
		c.Next()
	}
}

func MustUserID(c *gin.Context) uuid.UUID {
	value, ok := c.Get(UserIDKey)
	if !ok {
		return uuid.Nil
	}
	id, ok := value.(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return id
}
