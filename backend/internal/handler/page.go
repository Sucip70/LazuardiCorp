package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

type PageHandler struct {
	pages   *service.PageService
	preview *service.PreviewService
}

func NewPageHandler(pages *service.PageService, preview *service.PreviewService) *PageHandler {
	return &PageHandler{pages: pages, preview: preview}
}

func (h *PageHandler) List(c *gin.Context) {
	items, err := h.pages.List(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.PageListResponse{Pages: items})
}

func (h *PageHandler) Create(c *gin.Context) {
	var req dto.CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.pages.Create(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *PageHandler) Get(c *gin.Context) {
	item, err := h.pages.Get(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) Update(c *gin.Context) {
	var req dto.UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.pages.Update(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) Delete(c *gin.Context) {
	if err := h.pages.Delete(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PageHandler) LoadDocument(c *gin.Context) {
	item, err := h.pages.LoadDocument(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) SaveDocument(c *gin.Context) {
	var req dto.SavePageDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.pages.SaveDocument(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) Preview(c *gin.Context) {
	html, err := h.preview.GetHTML(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), parseUUID(c, "pageId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("X-Preview-Cache", c.GetHeader("X-Cache"))
	c.String(http.StatusOK, html)
}
