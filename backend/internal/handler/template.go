package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

type TemplateHandler struct {
	templates *service.TemplateService
}

func NewTemplateHandler(templates *service.TemplateService) *TemplateHandler {
	return &TemplateHandler{templates: templates}
}

func (h *TemplateHandler) ListMine(c *gin.Context) {
	items, err := h.templates.ListForUser(mustUserID(c), c.Query("category"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *TemplateHandler) List(c *gin.Context) {
	category := c.Query("category")
	items, err := h.templates.List(category)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *TemplateHandler) ListCategories(c *gin.Context) {
	items, err := h.templates.List("")
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": items.Categories})
}

func (h *TemplateHandler) Get(c *gin.Context) {
	includeData := c.Query("include") == "data" || c.Query("include_data") == "true"
	item, err := h.templates.Get(parseUUID(c, "id"), includeData)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *TemplateHandler) ListVersions(c *gin.Context) {
	items, err := h.templates.ListVersions(parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *TemplateHandler) GetVersion(c *gin.Context) {
	version, err := strconv.Atoi(c.Param("version"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid version"})
		return
	}
	includeData := c.Query("include") == "data"
	item, err := h.templates.GetVersion(parseUUID(c, "id"), version, includeData)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *TemplateHandler) Apply(c *gin.Context) {
	var req dto.ApplyTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	project, err := h.templates.Apply(mustUserID(c), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (h *TemplateHandler) SaveProjectAsTemplate(c *gin.Context) {
	var req dto.SaveProjectAsTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.templates.SaveProjectAsTemplate(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *TemplateHandler) ListUserTemplates(c *gin.Context) {
	items, err := h.templates.ListUserTemplates(mustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *TemplateHandler) CreateUserTemplate(c *gin.Context) {
	var req dto.CreateUserTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.templates.CreateUserTemplate(mustUserID(c), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *TemplateHandler) UpdateUserTemplate(c *gin.Context) {
	var req dto.UpdateUserTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.templates.UpdateUserTemplate(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *TemplateHandler) DeleteUserTemplate(c *gin.Context) {
	if err := h.templates.DeleteUserTemplate(mustUserID(c), parseUUID(c, "id")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
