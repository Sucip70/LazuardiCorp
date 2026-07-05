package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

type AssetHandler struct {
	assets *service.AssetService
}

func NewAssetHandler(assets *service.AssetService) *AssetHandler {
	return &AssetHandler{assets: assets}
}

func (h *AssetHandler) List(c *gin.Context) {
	items, err := h.assets.List(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.AssetListResponse{Assets: items})
}

func (h *AssetHandler) Get(c *gin.Context) {
	item, err := h.assets.Get(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "assetId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *AssetHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "file is required"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "cannot read uploaded file"})
		return
	}
	defer src.Close()

	item, err := h.assets.Upload(c.Request.Context(), service.UploadInput{
		UserID:           mustUserID(c),
		ProjectID:        parseUUID(c, "id"),
		OriginalFilename: file.Filename,
		Alt:              c.PostForm("alt"),
		Reader:           src,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, dto.UploadAssetResponse{Asset: item})
}

func (h *AssetHandler) Delete(c *gin.Context) {
	if err := h.assets.Delete(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), parseUUID(c, "assetId")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
