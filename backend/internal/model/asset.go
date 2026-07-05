package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Asset stores uploaded media metadata. Files live in object storage (S3 or local).
type Asset struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID        uuid.UUID `gorm:"type:uuid;index;not null" json:"project_id"`
	UserID           uuid.UUID `gorm:"type:uuid;index;not null" json:"user_id"`
	PublicID         string    `gorm:"uniqueIndex;not null" json:"public_id"`
	Filename         string    `gorm:"not null" json:"filename"`
	OriginalFilename string    `json:"original_filename"`
	MimeType         string    `gorm:"not null" json:"mime_type"`
	SizeBytes        int64     `json:"size_bytes"`
	Width            int       `json:"width"`
	Height           int       `json:"height"`
	Alt              string    `json:"alt"`
	StorageProvider  string    `gorm:"not null" json:"storage_provider"`
	StorageKey       string    `gorm:"not null" json:"storage_key"`
	URL              string    `gorm:"not null" json:"url"`
	ThumbnailKey     string    `json:"thumbnail_key"`
	ThumbnailURL     string    `json:"thumbnail_url"`
	OptimizedKey     string    `json:"optimized_key"`
	OptimizedURL     string    `json:"optimized_url"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (a *Asset) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
