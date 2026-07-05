package generator_test

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/lazuardicorp/backend/internal/generator"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

const examplePageJSON = `{
  "rootIds": ["root"],
  "nodes": {
    "root": {
      "id": "root",
      "type": "Container",
      "parentId": null,
      "children": ["hero", "cta"],
      "props": { "tag": "main", "layout": "flex" },
      "styles": { "className": "min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-8" }
    },
    "hero": {
      "id": "hero",
      "type": "Heading",
      "parentId": "root",
      "children": [],
      "props": { "text": "Welcome to My Site", "level": 1 },
      "styles": { "className": "text-4xl font-bold text-gray-900" }
    },
    "cta": {
      "id": "cta",
      "type": "Button",
      "parentId": "root",
      "children": [],
      "props": { "label": "Get Started", "variant": "primary" },
      "events": {
        "onClick": { "action": "scrollTo", "payload": { "selector": "#features" } }
      }
    }
  }
}`

func exampleInput() generator.ProjectInput {
	return generator.ProjectInput{
		ProjectName: "Demo Site",
		ProjectSlug: "demo-site",
		Theme:       staticgen.ThemeSettings{FontFamily: "Inter, sans-serif", PrimaryColor: "#2563eb"},
		Pages: []generator.PageInput{
			{
				Name: "Home", Path: "/",
				Meta:     staticgen.PageMeta{Title: "Home", Description: "Welcome"},
				Document: []byte(examplePageJSON),
			},
			{
				Name: "About", Path: "/about",
				Meta:     staticgen.PageMeta{Title: "About Us"},
				Document: []byte(examplePageJSON),
			},
		},
	}
}

func TestGenerateBundle_Static(t *testing.T) {
	bundle, err := generator.GenerateBundle(exampleInput(), generator.FormatStatic)
	if err != nil {
		t.Fatal(err)
	}
	assertContainsFiles(t, bundle, "index.html", "about.html", "css/styles.css", "js/main.js")
	if !strings.Contains(string(bundle["index.html"]), "Welcome to My Site") {
		t.Error("expected rendered content in index.html")
	}
}

func TestGenerateBundle_NextJS(t *testing.T) {
	bundle, err := generator.GenerateBundle(exampleInput(), generator.FormatNextJS)
	if err != nil {
		t.Fatal(err)
	}
	assertContainsFiles(t, bundle,
		"package.json", "app/layout.tsx", "app/page.tsx", "app/about/page.tsx",
		"components/StaticPage.tsx", "lib/interactivity.ts", "content/index.json",
	)
}

func TestGenerateBundle_Nuxt(t *testing.T) {
	bundle, err := generator.GenerateBundle(exampleInput(), generator.FormatNuxt)
	if err != nil {
		t.Fatal(err)
	}
	assertContainsFiles(t, bundle,
		"package.json", "nuxt.config.ts", "app.vue",
		"pages/index.vue", "pages/about.vue", "components/StaticPage.vue",
	)
}

func TestGenerateZIP(t *testing.T) {
	data, filename, err := generator.Generate(exampleInput(), generator.FormatStatic)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) < 100 {
		t.Fatalf("zip too small: %d bytes", len(data))
	}
	if !strings.HasSuffix(filename, "-static.zip") {
		t.Fatalf("unexpected filename: %s", filename)
	}
}

func TestParseFormat(t *testing.T) {
	if generator.ParseFormat("nextjs") != generator.FormatNextJS {
		t.Fatal("expected nextjs format")
	}
	if generator.ParseFormat("nuxt") != generator.FormatNuxt {
		t.Fatal("expected nuxt format")
	}
}

func TestGenerateFromLandingExample(t *testing.T) {
	raw, err := os.ReadFile("../../../shared/schemas/examples/landing-page.json")
	if err != nil {
		t.Skip("landing page example not available")
	}

	var full struct {
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		Settings struct {
			Theme map[string]string `json:"theme"`
		} `json:"settings"`
		Pages []struct {
			Name    string         `json:"name"`
			Path    string         `json:"path"`
			RootIDs []string       `json:"rootIds"`
			Nodes   map[string]any `json:"nodes"`
		} `json:"pages"`
	}
	if err := json.Unmarshal(raw, &full); err != nil {
		t.Fatal(err)
	}

	page := full.Pages[0]
	docBytes, _ := json.Marshal(map[string]any{"rootIds": page.RootIDs, "nodes": page.Nodes})
	input := generator.ProjectInput{
		ProjectName: full.Name,
		ProjectSlug: full.Slug,
		Theme: staticgen.ThemeSettings{
			FontFamily:   full.Settings.Theme["fontFamily"],
			PrimaryColor: full.Settings.Theme["primaryColor"],
		},
		Pages: []generator.PageInput{{
			Name: page.Name, Path: page.Path,
			Document: docBytes,
		}},
	}

	for _, format := range []generator.ExportFormat{generator.FormatStatic, generator.FormatNextJS, generator.FormatNuxt} {
		bundle, err := generator.GenerateBundle(input, format)
		if err != nil {
			t.Fatalf("format %s: %v", format, err)
		}
		if len(bundle) < 5 {
			t.Fatalf("format %s: too few files (%d)", format, len(bundle))
		}
	}
}

func assertContainsFiles(t *testing.T, bundle generator.ProjectBundle, files ...string) {
	t.Helper()
	for _, f := range files {
		if _, ok := bundle[f]; !ok {
			t.Errorf("missing file: %s", f)
		}
	}
}
