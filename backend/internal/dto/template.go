package dto

import "encoding/json"

type TemplateSummaryResponse struct {
	ID           string `json:"id"`
	Slug         string `json:"slug"`
	Name         string `json:"name"`
	Category     string `json:"category"`
	Description  string `json:"description"`
	PreviewImage string `json:"preview_image"`
	Version      int    `json:"version"`
	IsBuiltin    bool   `json:"is_builtin"`
	CreatedAt    string `json:"created_at"`
}

type TemplateDetailResponse struct {
	TemplateSummaryResponse
	JSONData json.RawMessage `json:"json_data,omitempty"`
}

type TemplateListResponse struct {
	Templates  []TemplateSummaryResponse `json:"templates"`
	Categories []string                  `json:"categories,omitempty"`
}

type TemplateVersionResponse struct {
	Version   int             `json:"version"`
	Changelog string          `json:"changelog"`
	JSONData  json.RawMessage `json:"json_data,omitempty"`
	CreatedAt string          `json:"created_at"`
}

type TemplateVersionListResponse struct {
	Versions []TemplateVersionResponse `json:"versions"`
}

type ApplyTemplateRequest struct {
	TemplateID     string `json:"template_id" binding:"required"`
	Name           string `json:"name" binding:"required"`
	Slug           string `json:"slug" binding:"required"`
	UserTemplateID string `json:"user_template_id"`
	Version        *int   `json:"version"`
}

type SaveProjectAsTemplateRequest struct {
	Name         string `json:"name" binding:"required"`
	Category     string `json:"category" binding:"required"`
	Description  string `json:"description"`
	PreviewImage string `json:"preview_image"`
	Changelog    string `json:"changelog"`
}

type CreateUserTemplateRequest struct {
	TemplateID string          `json:"template_id" binding:"required"`
	Name       string          `json:"name" binding:"required"`
	CustomData json.RawMessage `json:"custom_data"`
}

type UpdateUserTemplateRequest struct {
	Name       *string          `json:"name"`
	CustomData *json.RawMessage `json:"custom_data"`
}

type UserTemplateResponse struct {
	ID           string                    `json:"id"`
	Name         string                    `json:"name"`
	TemplateID   string                    `json:"template_id"`
	CustomData   json.RawMessage           `json:"custom_data"`
	Template     TemplateSummaryResponse   `json:"template"`
	CreatedAt    string                    `json:"created_at"`
	UpdatedAt    string                    `json:"updated_at"`
}

type UserTemplateListResponse struct {
	UserTemplates []UserTemplateResponse `json:"user_templates"`
}
