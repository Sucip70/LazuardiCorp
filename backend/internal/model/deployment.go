package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	DeployProviderNetlify = "netlify"
	DeployProviderVercel  = "vercel"
	DeployProviderS3      = "s3"

	DeployStatusPending    = "pending"
	DeployStatusBuilding   = "building"
	DeployStatusUploading  = "uploading"
	DeployStatusLive       = "live"
	DeployStatusFailed     = "failed"
	DeployStatusPreview    = "preview"

	SSLStatusNone       = "none"
	SSLStatusPending    = "pending"
	SSLStatusIssuing    = "issuing"
	SSLStatusActive     = "active"
	SSLStatusFailed     = "failed"
	DomainStatusPending = "pending"
	DomainStatusVerified = "verified"
)

type ProjectDeployConfig struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID          uuid.UUID `gorm:"type:uuid;uniqueIndex;not null" json:"project_id"`
	Provider           string    `gorm:"not null;default:'s3'" json:"provider"`
	AutoDeployOnSave   bool      `gorm:"default:false" json:"auto_deploy_on_save"`
	ProductionDomain   string    `json:"production_domain,omitempty"`
	NetlifySiteID      string    `json:"netlify_site_id,omitempty"`
	VercelProjectID    string    `json:"vercel_project_id,omitempty"`
	S3Bucket           string    `json:"s3_bucket,omitempty"`
	S3Prefix           string    `json:"s3_prefix,omitempty"`
	CloudFrontID       string    `json:"cloudfront_distribution_id,omitempty"`
	ExternalSiteURL    string    `json:"external_site_url,omitempty"`
	LastDeploymentID   *uuid.UUID `gorm:"type:uuid" json:"last_deployment_id,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Deployment struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID     uuid.UUID      `gorm:"type:uuid;index;not null" json:"project_id"`
	Provider      string         `gorm:"not null" json:"provider"`
	Status        string         `gorm:"not null;default:'pending'" json:"status"`
	IsPreview     bool           `gorm:"default:false" json:"is_preview"`
	PreviewToken  string         `gorm:"index" json:"preview_token,omitempty"`
	URL           string         `json:"url,omitempty"`
	PreviewURL    string         `json:"preview_url,omitempty"`
	ExternalID    string         `json:"external_id,omitempty"`
	ErrorMessage  string         `json:"error_message,omitempty"`
	TriggeredBy   string         `gorm:"default:'manual'" json:"triggered_by"`
	Metadata      datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	StartedAt     *time.Time     `json:"started_at,omitempty"`
	CompletedAt   *time.Time     `json:"completed_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type DeploymentDomain struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID    uuid.UUID      `gorm:"type:uuid;index;not null" json:"project_id"`
	DeploymentID *uuid.UUID     `gorm:"type:uuid;index" json:"deployment_id,omitempty"`
	Hostname     string         `gorm:"not null;index" json:"hostname"`
	IsPrimary    bool           `gorm:"default:false" json:"is_primary"`
	Status       string         `gorm:"default:'pending'" json:"status"`
	SSLStatus    string         `gorm:"default:'none'" json:"ssl_status"`
	DNSRecords   datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"dns_records"`
	VerifiedAt   *time.Time     `json:"verified_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

func (c *ProjectDeployConfig) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (d *Deployment) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

func (d *DeploymentDomain) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}
