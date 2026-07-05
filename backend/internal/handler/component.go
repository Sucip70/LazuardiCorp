package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

type ComponentHandler struct {
	components *service.ComponentService
}

func NewComponentHandler(components *service.ComponentService) *ComponentHandler {
	return &ComponentHandler{components: components}
}

func (h *ComponentHandler) List(c *gin.Context) {
	items, err := h.components.List(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.ComponentListResponse{Components: items})
}
