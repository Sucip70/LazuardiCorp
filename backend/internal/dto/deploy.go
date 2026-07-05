package dto

type DeployConfigResponse struct {
	ProjectID        string `json:"project_id"`
	Provider         string `json:"provider"`
	AutoDeployOnSave bool   `json:"auto_deploy_on_save"`
	ProductionDomain string `json:"production_domain,omitempty"`
	NetlifySiteID    string `json:"netlify_site_id,omitempty"`
	VercelProjectID  string `json:"vercel_project_id,omitempty"`
	S3Bucket         string `json:"s3_bucket,omitempty"`
	S3Prefix         string `json:"s3_prefix,omitempty"`
	CloudFrontID     string `json:"cloudfront_distribution_id,omitempty"`
	ExternalSiteURL  string `json:"external_site_url,omitempty"`
	LastDeploymentID string `json:"last_deployment_id,omitempty"`
}

type UpdateDeployConfigRequest struct {
	Provider         *string `json:"provider"`
	AutoDeployOnSave *bool   `json:"auto_deploy_on_save"`
	ProductionDomain *string `json:"production_domain"`
	NetlifySiteID    *string `json:"netlify_site_id"`
	VercelProjectID  *string `json:"vercel_project_id"`
	S3Bucket         *string `json:"s3_bucket"`
	S3Prefix         *string `json:"s3_prefix"`
	CloudFrontID     *string `json:"cloudfront_distribution_id"`
}

type TriggerDeployRequest struct {
	Provider string `json:"provider"`
	Preview  bool   `json:"preview"`
}

type DeploymentResponse struct {
	ID           string            `json:"id"`
	ProjectID    string            `json:"project_id"`
	Provider     string            `json:"provider"`
	Status       string            `json:"status"`
	IsPreview    bool              `json:"is_preview"`
	PreviewToken string            `json:"preview_token,omitempty"`
	URL          string            `json:"url,omitempty"`
	PreviewURL   string            `json:"preview_url,omitempty"`
	ExternalID   string            `json:"external_id,omitempty"`
	ErrorMessage string            `json:"error_message,omitempty"`
	TriggeredBy  string            `json:"triggered_by"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	StartedAt    string            `json:"started_at,omitempty"`
	CompletedAt  string            `json:"completed_at,omitempty"`
	CreatedAt    string            `json:"created_at"`
}

type DeploymentListResponse struct {
	Deployments []DeploymentResponse `json:"deployments"`
}

type AddDomainRequest struct {
	Hostname  string `json:"hostname" binding:"required"`
	IsPrimary bool   `json:"is_primary"`
}

type DNSRecordResponse struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Value    string `json:"value"`
	Priority int    `json:"priority,omitempty"`
	TTL      int    `json:"ttl,omitempty"`
	Purpose  string `json:"purpose,omitempty"`
}

type DomainResponse struct {
	ID         string              `json:"id"`
	ProjectID  string              `json:"project_id"`
	Hostname   string              `json:"hostname"`
	IsPrimary  bool                `json:"is_primary"`
	Status     string              `json:"status"`
	SSLStatus  string              `json:"ssl_status"`
	DNSRecords []DNSRecordResponse `json:"dns_records"`
	VerifiedAt string              `json:"verified_at,omitempty"`
	CreatedAt  string              `json:"created_at"`
}

type DomainListResponse struct {
	Domains []DomainResponse `json:"domains"`
}

type PreviewLinkResponse struct {
	Token     string `json:"token"`
	URL       string `json:"url"`
	ExpiresAt string `json:"expires_at"`
}

type DNSInstructionsResponse struct {
	Provider     string                `json:"provider"`
	Instructions []string              `json:"instructions"`
	Records      []DNSRecordResponse   `json:"records"`
}

type SSLProvisionRequest struct {
	Hostname string `json:"hostname" binding:"required"`
}

type SSLProvisionResponse struct {
	Hostname   string              `json:"hostname"`
	SSLStatus  string              `json:"ssl_status"`
	DNSRecords []DNSRecordResponse `json:"dns_records"`
	OrderID    string              `json:"order_id,omitempty"`
}

type CreateCloudFrontRequest struct {
	Bucket string `json:"bucket"`
}

type CreateCloudFrontResponse struct {
	DistributionID     string              `json:"distribution_id"`
	DistributionDomain string              `json:"distribution_domain"`
	DNSRecords         []DNSRecordResponse `json:"dns_records"`
}
