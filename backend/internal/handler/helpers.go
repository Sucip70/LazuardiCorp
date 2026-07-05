package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/middleware"
)

func mustUserID(c *gin.Context) uuid.UUID {
	return middleware.MustUserID(c)
}

func parseUUID(c *gin.Context, param string) uuid.UUID {
	id, _ := uuid.Parse(c.Param(param))
	return id
}
