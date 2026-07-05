package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/generator"
	"github.com/lazuardicorp/backend/internal/service"
)

type ProjectHandler struct {
	projects *service.ProjectService
	export   *service.ExportService
}

func NewProjectHandler(projects *service.ProjectService, export *service.ExportService) *ProjectHandler {
	return &ProjectHandler{projects: projects, export: export}
}

func (h *ProjectHandler) List(c *gin.Context) {
	items, err := h.projects.List(mustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.ProjectListResponse{Projects: items})
}

func (h *ProjectHandler) Create(c *gin.Context) {
	var req dto.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.projects.Create(mustUserID(c), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProjectHandler) Get(c *gin.Context) {
	item, err := h.projects.Get(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ProjectHandler) Update(c *gin.Context) {
	var req dto.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.projects.Update(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ProjectHandler) Delete(c *gin.Context) {
	if err := h.projects.Delete(c.Request.Context(), mustUserID(c), parseUUID(c, "id")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ProjectHandler) Duplicate(c *gin.Context) {
	var req dto.DuplicateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.projects.Duplicate(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProjectHandler) ListTemplates(c *gin.Context) {
	items, err := h.projects.ListTemplates()
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.ProjectListResponse{Projects: items})
}

func (h *ProjectHandler) Export(c *gin.Context) {
	format := generator.ParseFormat(c.Query("format"))
	data, filename, err := h.export.ExportProjectZIP(mustUserID(c), parseUUID(c, "id"), format)
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("X-Export-Format", format.String())
	c.Data(http.StatusOK, "application/zip", data)
}

// Legacy routes for existing frontend (/api/projects)
func (h *ProjectHandler) LegacyList(c *gin.Context) {
	items, err := h.projects.LegacyList(mustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *ProjectHandler) LegacyCreate(c *gin.Context) {
	var req dto.LegacyProjectPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.projects.LegacyCreate(mustUserID(c), req.Data)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProjectHandler) LegacyGet(c *gin.Context) {
	item, err := h.projects.LegacyGet(mustUserID(c), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ProjectHandler) LegacyUpdate(c *gin.Context) {
	var req dto.LegacyProjectPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	item, err := h.projects.LegacyUpdate(mustUserID(c), c.Param("id"), req.Data)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ProjectHandler) LegacyDelete(c *gin.Context) {
	if err := h.projects.LegacyDelete(c.Request.Context(), mustUserID(c), c.Param("id")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
