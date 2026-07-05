package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Project struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID           uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	Name             string         `gorm:"not null" json:"name"`
	Slug             string         `gorm:"not null" json:"slug"`
	Description      string         `json:"description"`
	Settings         datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"settings"`
	IsTemplate       bool           `gorm:"default:false" json:"is_template"`
	TemplateSourceID *uuid.UUID     `gorm:"type:uuid" json:"template_source_id,omitempty"`
	Pages            []Page         `json:"pages,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type Page struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID uuid.UUID      `gorm:"type:uuid;index;not null" json:"project_id"`
	Name      string         `gorm:"not null" json:"name"`
	Path      string         `gorm:"not null" json:"path"`
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	IsHome    bool           `gorm:"default:false" json:"is_home"`
	Meta      datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"meta"`
	Document  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"document"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

func (p *Page) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
