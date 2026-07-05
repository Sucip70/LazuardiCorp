package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Component struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name            string         `gorm:"uniqueIndex;not null" json:"name"`
	Category        string         `gorm:"not null" json:"category"`
	DefaultProps    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"default_props"`
	DefaultStyles   datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"default_styles"`
	PropSchema      datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"prop_schema"`
	AcceptsChildren bool           `gorm:"default:false" json:"accepts_children"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Component) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
