package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	TemplateCategoryLanding   = "landing"
	TemplateCategoryBusiness  = "business"
	TemplateCategoryPortfolio = "portfolio"
	TemplateCategoryBlog      = "blog"
	TemplateCategoryEcommerce = "ecommerce"
)

var TemplateCategories = []string{
	TemplateCategoryLanding,
	TemplateCategoryBusiness,
	TemplateCategoryPortfolio,
	TemplateCategoryBlog,
	TemplateCategoryEcommerce,
}

// Template is a reusable site starter (built-in or user-created).
type Template struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Slug         string         `gorm:"uniqueIndex;not null" json:"slug"`
	Name         string         `gorm:"not null" json:"name"`
	Category     string         `gorm:"index;not null" json:"category"`
	Description  string         `json:"description"`
	PreviewImage string         `json:"preview_image"`
	JSONData     datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"json_data"`
	Version      int            `gorm:"not null;default:1" json:"version"`
	IsBuiltin    bool           `gorm:"not null;default:false" json:"is_builtin"`
	UserID       *uuid.UUID     `gorm:"type:uuid;index" json:"user_id,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

func (t *Template) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// TemplateVersion stores immutable snapshots for template versioning.
type TemplateVersion struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	TemplateID uuid.UUID      `gorm:"type:uuid;index;not null" json:"template_id"`
	Version    int            `gorm:"not null" json:"version"`
	JSONData   datatypes.JSON `gorm:"type:jsonb;not null" json:"json_data"`
	Changelog  string         `json:"changelog"`
	CreatedAt  time.Time      `json:"created_at"`
}

func (v *TemplateVersion) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

// UserTemplate links a user to a template with optional custom overrides.
type UserTemplate struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	TemplateID uuid.UUID      `gorm:"type:uuid;index;not null" json:"template_id"`
	Name       string         `gorm:"not null" json:"name"`
	CustomData datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"custom_data"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`

	Template Template `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
}

func (u *UserTemplate) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
