package generator

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

// RenderContext holds shared state while rendering all pages.
type RenderContext struct {
	Pages     []RenderedPage
	PagePaths map[string]string
	CSSExtra  string
	Theme     staticgen.ThemeSettings
}

// RenderPages parses JSON documents and renders HTML bodies for every page.
func RenderPages(input ProjectInput) (*RenderContext, error) {
	if len(input.Pages) == 0 {
		return nil, fmt.Errorf("no pages to generate")
	}

	pagePathMap := buildPagePathMap(input.Pages)
	var cssBuilder strings.Builder
	rendered := make([]RenderedPage, 0, len(input.Pages))

	for _, page := range input.Pages {
		doc, err := staticgen.ParseDocument(page.Document)
		if err != nil {
			return nil, fmt.Errorf("page %q: %w", page.Name, err)
		}

		renderer := staticgen.NewRenderer(doc, pagePathMap, page.Path)
		body, err := renderer.RenderBody()
		if err != nil {
			return nil, fmt.Errorf("page %q render: %w", page.Name, err)
		}

		if css := renderer.CSS().String(); css != "" {
			cssBuilder.WriteString(fmt.Sprintf("/* %s (%s) */\n%s\n\n", page.Name, page.Path, css))
		}

		htmlFile := staticgen.PagePathToHTMLFile(page.Path)
		title := page.Meta.Title
		if title == "" {
			title = page.Name
		}

		docJSON, _ := json.Marshal(doc)
		rendered = append(rendered, RenderedPage{
			Name:         page.Name,
			Path:         page.Path,
			Title:        title,
			Description:  page.Meta.Description,
			RouteSegment: routeSegment(page.Path),
			BodyHTML:     body,
			EventsJSON:   renderer.Events().EventsJSON(),
			DocumentJSON: string(docJSON),
			HTMLFile:     htmlFile,
			Depth:        htmlFileDepth(htmlFile),
		})
	}

	return &RenderContext{
		Pages:     rendered,
		PagePaths: pagePathMap,
		CSSExtra:  cssBuilder.String(),
		Theme:     input.Theme,
	}, nil
}

func buildPagePathMap(pages []PageInput) map[string]string {
	m := make(map[string]string, len(pages))
	for _, p := range pages {
		path := p.Path
		if path == "" {
			path = "/"
		}
		m[path] = staticgen.PagePathToHTMLFile(path)
	}
	return m
}

// routeSegment converts /about -> about, / -> index, /docs/intro -> docs/intro
func routeSegment(path string) string {
	if path == "/" || path == "" {
		return "index"
	}
	return strings.Trim(path, "/")
}

func htmlFileDepth(htmlFile string) int {
	clean := strings.TrimSuffix(htmlFile, ".html")
	if clean == "index" {
		return 0
	}
	return strings.Count(clean, "/") + 1
}

func pickThemeFont(theme staticgen.ThemeSettings) string {
	if theme.FontFamily != "" {
		return theme.FontFamily
	}
	return "Inter, system-ui, sans-serif"
}

func pickPrimary(theme staticgen.ThemeSettings) string {
	if theme.PrimaryColor != "" {
		return theme.PrimaryColor
	}
	return "#2563eb"
}
