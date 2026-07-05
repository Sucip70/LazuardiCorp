package service

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	"github.com/lazuardicorp/backend/internal/model"
)

func TestParseTemplateJSON(t *testing.T) {
	raw := []byte(`{
		"description": "Demo",
		"settings": {"theme": {"primaryColor": "#000"}},
		"pages": [{
			"name": "Home",
			"path": "/",
			"isHome": true,
			"rootIds": ["a"],
			"nodes": {"a": {"id": "a", "type": "Container"}}
		}]
	}`)
	parsed, err := parseTemplateJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Description != "Demo" {
		t.Fatalf("description %q", parsed.Description)
	}
	if len(parsed.Pages) != 1 || parsed.Pages[0].Name != "Home" {
		t.Fatalf("pages: %+v", parsed.Pages)
	}
}

func TestBuildTemplatePayload(t *testing.T) {
	project := &model.Project{
		ID:          uuid.New(),
		Name:        "Test",
		Slug:        "test",
		Description: "desc",
		Settings:    datatypes.JSON([]byte(`{"theme":{}}`)),
	}
	pages := []model.Page{{
		ID:        uuid.New(),
		Name:      "Home",
		Path:      "/",
		IsHome:    true,
		Document:  datatypes.JSON([]byte(`{"rootIds":["x"],"nodes":{}}`)),
		Meta:      datatypes.JSON([]byte(`{"title":"Home"}`)),
	}}
	payload, err := buildTemplatePayload(project, pages)
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal(payload, &doc); err != nil {
		t.Fatal(err)
	}
	pagesRaw, ok := doc["pages"].([]any)
	if !ok || len(pagesRaw) != 1 {
		t.Fatalf("pages payload: %v", doc["pages"])
	}
}

func TestSlugify(t *testing.T) {
	if slugify("My Cool Site") != "my-cool-site" {
		t.Fatalf("got %q", slugify("My Cool Site"))
	}
}
