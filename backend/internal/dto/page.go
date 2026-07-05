package dto

import "encoding/json"

type CreatePageRequest struct {
	Name      string          `json:"name" binding:"required"`
	Path      string          `json:"path" binding:"required"`
	SortOrder int             `json:"sort_order"`
	IsHome    bool            `json:"is_home"`
	Meta      json.RawMessage `json:"meta"`
	Document  json.RawMessage `json:"document"`
}

type UpdatePageRequest struct {
	Name      *string          `json:"name"`
	Path      *string          `json:"path"`
	SortOrder *int             `json:"sort_order"`
	IsHome    *bool            `json:"is_home"`
	Meta      *json.RawMessage `json:"meta"`
	Document  *json.RawMessage `json:"document"`
}

type SavePageDocumentRequest struct {
	Document json.RawMessage `json:"document" binding:"required"`
}

type PageResponse struct {
	ID        string          `json:"id"`
	ProjectID string          `json:"project_id"`
	Name      string          `json:"name"`
	Path      string          `json:"path"`
	SortOrder int             `json:"sort_order"`
	IsHome    bool            `json:"is_home"`
	Meta      json.RawMessage `json:"meta"`
	Document  json.RawMessage `json:"document"`
	CreatedAt string          `json:"created_at"`
	UpdatedAt string          `json:"updated_at"`
}

type PageListResponse struct {
	Pages []PageResponse `json:"pages"`
}

type PageDocumentResponse struct {
	PageID   string          `json:"page_id"`
	Document json.RawMessage `json:"document"`
}
