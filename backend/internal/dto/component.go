package dto

import "encoding/json"

type ComponentResponse struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	AcceptsChildren bool            `json:"accepts_children"`
	DefaultProps    json.RawMessage `json:"default_props"`
	DefaultStyles   json.RawMessage `json:"default_styles"`
}

type ComponentListResponse struct {
	Components []ComponentResponse `json:"components"`
}
