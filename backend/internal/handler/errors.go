package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/repository"
	"github.com/lazuardicorp/backend/internal/service"
)

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Error: err.Error()})
	case errors.Is(err, repository.ErrConflict):
		c.JSON(http.StatusConflict, dto.ErrorResponse{Error: err.Error()})
	case errors.Is(err, service.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "unauthorized"})
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "internal server error"})
	}
}
