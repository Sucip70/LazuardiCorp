package staticgen_test

import (
	"testing"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

func TestParseDocument_schemaVersionWrapper(t *testing.T) {
	raw := []byte(`{
		"schemaVersion": "1.0.0",
		"pages": [{
			"id": "page_home",
			"name": "Home",
			"path": "/",
			"rootIds": ["root"],
			"nodes": {
				"root": {
					"id": "root",
					"type": "Text",
					"parentId": null,
					"children": [],
					"props": { "content": "Hello preview" }
				}
			}
		}]
	}`)

	doc, err := staticgen.ParseDocument(raw)
	if err != nil {
		t.Fatalf("ParseDocument: %v", err)
	}
	if len(doc.RootIDs) != 1 || doc.RootIDs[0] != "root" {
		t.Fatalf("unexpected rootIds: %#v", doc.RootIDs)
	}
	if doc.Nodes["root"].Props["content"] != "Hello preview" {
		t.Fatalf("unexpected node content: %#v", doc.Nodes["root"].Props)
	}
}
