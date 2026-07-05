package dto

import "encoding/json"

type CreateProjectRequest struct {
	Name        string          `json:"name" binding:"required"`
	Slug        string          `json:"slug" binding:"required"`
	Description string          `json:"description"`
	Settings    json.RawMessage `json:"settings"`
	IsTemplate  bool            `json:"is_template"`
}

type UpdateProjectRequest struct {
	Name        *string          `json:"name"`
	Slug        *string          `json:"slug"`
	Description *string          `json:"description"`
	Settings    *json.RawMessage `json:"settings"`
	IsTemplate  *bool            `json:"is_template"`
}

type DuplicateProjectRequest struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

type ProjectResponse struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	Name        string          `json:"name"`
	Slug        string          `json:"slug"`
	Description string          `json:"description"`
	Settings    json.RawMessage `json:"settings"`
	IsTemplate  bool            `json:"is_template"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}

type ProjectListResponse struct {
	Projects []ProjectResponse `json:"projects"`
}

type LegacyProjectPayload struct {
	Data json.RawMessage `json:"data" binding:"required"`
}

type LegacyProjectResponse struct {
	ID   string          `json:"id"`
	Data json.RawMessage `json:"data"`
}
