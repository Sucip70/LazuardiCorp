package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/service"
)

type DeployHandler struct {
	deploy *service.DeployService
}

func NewDeployHandler(deploy *service.DeployService) *DeployHandler {
	return &DeployHandler{deploy: deploy}
}

func (h *DeployHandler) GetConfig(c *gin.Context) {
	cfg, err := h.deploy.GetConfig(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *DeployHandler) UpdateConfig(c *gin.Context) {
	var req dto.UpdateDeployConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	cfg, err := h.deploy.UpdateConfig(mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *DeployHandler) Deploy(c *gin.Context) {
	var req dto.TriggerDeployRequest
	_ = c.ShouldBindJSON(&req)
	dep, err := h.deploy.TriggerDeploy(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, dep)
}

func (h *DeployHandler) ListDeployments(c *gin.Context) {
	items, err := h.deploy.ListDeployments(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *DeployHandler) GetDeployment(c *gin.Context) {
	dep, err := h.deploy.GetDeployment(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "deploymentId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, dep)
}

func (h *DeployHandler) CreatePreviewLink(c *gin.Context) {
	link, err := h.deploy.CreatePreviewLink(c.Request.Context(), mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, link)
}

func (h *DeployHandler) AddDomain(c *gin.Context) {
	var req dto.AddDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	domain, err := h.deploy.AddDomain(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, domain)
}

func (h *DeployHandler) ListDomains(c *gin.Context) {
	items, err := h.deploy.ListDomains(mustUserID(c), parseUUID(c, "id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *DeployHandler) RemoveDomain(c *gin.Context) {
	if err := h.deploy.RemoveDomain(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), parseUUID(c, "domainId")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *DeployHandler) VerifyDomain(c *gin.Context) {
	domain, err := h.deploy.VerifyDomain(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), parseUUID(c, "domainId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, domain)
}

func (h *DeployHandler) DNSInstructions(c *gin.Context) {
	info, err := h.deploy.DNSInstructions(mustUserID(c), parseUUID(c, "id"), parseUUID(c, "domainId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, info)
}

func (h *DeployHandler) ProvisionSSL(c *gin.Context) {
	var req dto.SSLProvisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	resp, err := h.deploy.ProvisionSSL(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *DeployHandler) CreateCloudFront(c *gin.Context) {
	var req dto.CreateCloudFrontRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}
	resp, err := h.deploy.CreateCloudFront(c.Request.Context(), mustUserID(c), parseUUID(c, "id"), req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// PublicPreview redirects to the staged preview URL for a deployment token.
func (h *DeployHandler) PublicPreview(c *gin.Context) {
	token := c.Param("token")
	dep, err := h.deploy.ResolvePreviewToken(token)
	if err != nil {
		writeError(c, err)
		return
	}
	url := dep.PreviewURL
	if url == "" {
		url = dep.URL
	}
	if url == "" {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Error: "preview not ready"})
		return
	}
	c.Redirect(http.StatusFound, url)
}
