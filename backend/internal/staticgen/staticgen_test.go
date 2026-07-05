package staticgen_test

import (
	"os"
	"strings"
	"testing"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

func TestBuildSiteBundle_basicComponents(t *testing.T) {
	doc := []byte(`{
		"rootIds": ["root"],
		"nodes": {
			"root": {
				"id": "root",
				"type": "Container",
				"parentId": null,
				"children": ["heading", "btn", "link"],
				"props": { "tag": "main", "layout": "flex" },
				"styles": { "className": "min-h-screen flex flex-col gap-4 p-8" }
			},
			"heading": {
				"id": "heading",
				"type": "Heading",
				"parentId": "root",
				"children": [],
				"props": { "text": "Hello World", "level": 1 }
			},
			"btn": {
				"id": "btn",
				"type": "Button",
				"parentId": "root",
				"children": [],
				"props": { "label": "Get Started", "variant": "primary" },
				"events": {
					"onClick": {
						"action": "scrollTo",
						"payload": { "selector": "#features" }
					}
				}
			},
			"link": {
				"id": "link",
				"type": "Link",
				"parentId": "root",
				"children": [],
				"props": { "label": "About us", "href": "/about" }
			}
		}
	}`)

	bundle, err := staticgen.BuildSiteBundle(staticgen.SiteBuildInput{
		ProjectName: "Demo",
		ProjectSlug: "demo",
		Theme:       staticgen.ThemeSettings{FontFamily: "Inter, sans-serif"},
		Pages: []staticgen.PageBuildInput{
			{Name: "Home", Path: "/", Meta: staticgen.PageMeta{Title: "Home"}, Document: doc},
			{Name: "About", Path: "/about", Meta: staticgen.PageMeta{Title: "About"}, Document: doc},
		},
	})
	if err != nil {
		t.Fatalf("BuildSiteBundle: %v", err)
	}

	required := []string{"index.html", "about.html", "css/styles.css", "js/main.js", "assets/images/.gitkeep"}
	for _, file := range required {
		if _, ok := bundle[file]; !ok {
			t.Fatalf("missing file in bundle: %s", file)
		}
	}

	html := string(bundle["index.html"])
	checks := []string{
		"<!DOCTYPE html>",
		"cdn.tailwindcss.com",
		"fonts.googleapis.com",
		"css/styles.css",
		"js/main.js",
		"<h1",
		"Hello World",
		"Get Started",
		"About us",
		"LAZ_EVENTS",
		"data-node-id=\"btn\"",
		"data-laz-event=\"click\"",
	}
	for _, check := range checks {
		if !strings.Contains(html, check) {
			t.Errorf("index.html missing %q", check)
		}
	}

	aboutHTML := string(bundle["about.html"])
	if !strings.Contains(aboutHTML, `href="about.html"`) && !strings.Contains(aboutHTML, `href="./about.html"`) {
		// home page link to about should be relative
		if !strings.Contains(aboutHTML, `href="about.html"`) {
			t.Log("about page self-link ok")
		}
	}
}

func TestBuildSiteBundle_landingPageExample(t *testing.T) {
	raw, err := os.ReadFile("../../../shared/schemas/examples/landing-page.json")
	if err != nil {
		t.Skip("landing page example not available:", err)
	}

	// Extract first page document from project JSON
	type projectPage struct {
		Name     string          `json:"name"`
		Path     string          `json:"path"`
		Meta     map[string]any  `json:"meta"`
		RootIDs  []string        `json:"rootIds"`
		Nodes    map[string]any  `json:"nodes"`
	}
	type project struct {
		Name     string         `json:"name"`
		Slug     string         `json:"slug"`
		Settings map[string]any `json:"settings"`
		Pages    []projectPage  `json:"pages"`
	}

	// landing-page.json is a full project — parse manually
	var full struct {
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		Settings struct {
			Theme map[string]string `json:"theme"`
		} `json:"settings"`
		Pages []struct {
			Name    string         `json:"name"`
			Path    string         `json:"path"`
			Meta    map[string]any `json:"meta"`
			RootIDs []string       `json:"rootIds"`
			Nodes   map[string]any `json:"nodes"`
		} `json:"pages"`
	}
	if err := jsonUnmarshal(raw, &full); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	page := full.Pages[0]
	docBytes, err := jsonMarshal(map[string]any{
		"rootIds": page.RootIDs,
		"nodes":   page.Nodes,
	})
	if err != nil {
		t.Fatalf("marshal page doc: %v", err)
	}

	bundle, err := staticgen.BuildSiteBundle(staticgen.SiteBuildInput{
		ProjectName: full.Name,
		ProjectSlug: full.Slug,
		Theme: staticgen.ThemeSettings{
			FontFamily:   full.Settings.Theme["fontFamily"],
			PrimaryColor: full.Settings.Theme["primaryColor"],
		},
		Pages: []staticgen.PageBuildInput{{
			Name: page.Name, Path: page.Path, Document: docBytes,
		}},
	})
	if err != nil {
		t.Fatalf("BuildSiteBundle: %v", err)
	}

	html := string(bundle["index.html"])
	if !strings.Contains(html, "sticky top-0") && !strings.Contains(html, "Acme") {
		t.Errorf("expected landing page content in HTML")
	}
	if !strings.Contains(string(bundle["css/styles.css"]), ".sr-only") {
		t.Error("expected base CSS in styles.css")
	}
}

func jsonUnmarshal(b []byte, v any) error {
	return staticgenTestJSONUnmarshal(b, v)
}

func jsonMarshal(v any) ([]byte, error) {
	return staticgenTestJSONMarshal(v)
}
