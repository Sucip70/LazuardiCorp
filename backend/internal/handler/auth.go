package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/middleware"
	"github.com/lazuardicorp/backend/internal/service"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	resp, err := h.auth.Register(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	resp, err := h.auth.Login(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := middleware.MustUserID(c)
	resp, err := h.auth.Me(userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, _ := c.Get("authToken")
	tokenStr, _ := token.(string)
	if err := h.auth.Logout(c.Request.Context(), tokenStr); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
