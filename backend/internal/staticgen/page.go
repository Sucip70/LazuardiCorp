package staticgen

import (
	"fmt"
	"strings"
)

// PageBuildInput describes one page to render.
type PageBuildInput struct {
	Name     string
	Path     string
	Meta     PageMeta
	Document []byte
}

// SiteBuildInput is everything needed to generate a static site bundle.
type SiteBuildInput struct {
	ProjectName string
	ProjectSlug string
	Theme       ThemeSettings
	Pages       []PageBuildInput
	Assets      []ExportAsset
}

// SiteBundle is a map of relative file paths to file contents.
type SiteBundle map[string][]byte

// BuildSiteBundle converts page JSON documents into HTML/CSS/JS files.
func BuildSiteBundle(input SiteBuildInput) (SiteBundle, error) {
	if len(input.Pages) == 0 {
		return nil, fmt.Errorf("no pages to export")
	}

	pagePaths := buildPagePathMap(input.Pages)
	bundle := SiteBundle{}

	var perPageCSS strings.Builder

	for _, page := range input.Pages {
		doc, err := ParseDocument(page.Document)
		if err != nil {
			return nil, fmt.Errorf("page %q: %w", page.Name, err)
		}

		renderer := NewRenderer(doc, pagePaths, page.Path)
		body, err := renderer.RenderBody()
		if err != nil {
			return nil, fmt.Errorf("page %q render: %w", page.Name, err)
		}

		if css := renderer.CSS().String(); css != "" {
			perPageCSS.WriteString(fmt.Sprintf("/* Page: %s (%s) */\n%s\n\n", page.Name, page.Path, css))
		}

		htmlFile := PagePathToHTMLFile(page.Path)
		eventsJSON := renderer.Events().EventsJSON()
		html := buildHTMLPage(buildPageHTMLOptions{
			Title:       pickTitle(page.Meta, page.Name),
			Description: page.Meta.Description,
			Keywords:    page.Meta.Keywords,
			OGImage:     page.Meta.OGImage,
			Robots:      page.Meta.Robots,
			Canonical:   page.Meta.Canonical,
			Theme:       input.Theme,
			Body:        body,
			EventsJSON:  eventsJSON,
			Depth:       htmlFileDepth(htmlFile),
		})
		bundle[htmlFile] = []byte(html)
	}

	cssContent := baseStylesCSS + "\n\n" + themeCSS(input.Theme) + "\n\n" + perPageCSS.String()
	bundle["css/styles.css"] = []byte(strings.TrimSpace(cssContent) + "\n")

	mainJS := NewEventCollector().GenerateJS(pagePaths)
	bundle["js/main.js"] = []byte(mainJS + "\n")

	for _, asset := range input.Assets {
		bundle[asset.ExportPath] = asset.Data
	}
	if len(input.Assets) == 0 {
		bundle["assets/images/.gitkeep"] = []byte("")
	}
	bundle["README.md"] = []byte(fmt.Sprintf("# %s\n\nStatic export from Lazuardi No-Code Builder.\n\nOpen `index.html` in a browser or deploy the folder to any static host.\n", input.ProjectName))

	return bundle, nil
}

type buildPageHTMLOptions struct {
	Title       string
	Description string
	Keywords    []string
	OGImage     string
	Robots      string
	Canonical   string
	Theme       ThemeSettings
	Body        string
	EventsJSON  string
	Depth       int
}

func buildHTMLPage(opts buildPageHTMLOptions) string {
	prefix := assetPrefix(opts.Depth)
	keywords := strings.Join(opts.Keywords, ", ")

	var b strings.Builder
	b.WriteString("<!DOCTYPE html>\n")
	b.WriteString("<html lang=\"en\">\n")
	b.WriteString("<head>\n")
	b.WriteString("  <meta charset=\"UTF-8\" />\n")
	b.WriteString("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n")
	if opts.Description != "" {
		b.WriteString(fmt.Sprintf("  <meta name=\"description\" content=\"%s\" />\n", escapeAttr(opts.Description)))
	}
	if keywords != "" {
		b.WriteString(fmt.Sprintf("  <meta name=\"keywords\" content=\"%s\" />\n", escapeAttr(keywords)))
	}
	if opts.Robots != "" {
		b.WriteString(fmt.Sprintf("  <meta name=\"robots\" content=\"%s\" />\n", escapeAttr(opts.Robots)))
	}
	if opts.OGImage != "" {
		b.WriteString(fmt.Sprintf("  <meta property=\"og:image\" content=\"%s\" />\n", escapeAttr(opts.OGImage)))
	}
	if opts.Canonical != "" {
		b.WriteString(fmt.Sprintf("  <link rel=\"canonical\" href=\"%s\" />\n", escapeAttr(opts.Canonical)))
	}
	b.WriteString(fmt.Sprintf("  <title>%s</title>\n", escape(opts.Title)))

	// CDN: Tailwind CSS (utility classes from editor)
	b.WriteString("  <script src=\"https://cdn.tailwindcss.com\"></script>\n")
	// CDN: Google Fonts (Inter by default, customizable via theme)
	fontParam := strings.ReplaceAll(opts.Theme.FontFamily, " ", "+")
	if fontParam == "" {
		fontParam = "Inter"
	}
	b.WriteString(fmt.Sprintf("  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n"))
	b.WriteString(fmt.Sprintf("  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n"))
	b.WriteString(fmt.Sprintf("  <link href=\"https://fonts.googleapis.com/css2?family=%s:wght@400;500;600;700&display=swap\" rel=\"stylesheet\" />\n", fontParam))

	b.WriteString(fmt.Sprintf("  <link rel=\"stylesheet\" href=\"%scss/styles.css\" />\n", prefix))
	b.WriteString("</head>\n")
	b.WriteString("<body>\n")
	b.WriteString("  <main>\n")
	for _, line := range strings.Split(strings.TrimRight(opts.Body, "\n"), "\n") {
		if line == "" {
			continue
		}
		b.WriteString("    ")
		b.WriteString(line)
		b.WriteByte('\n')
	}
	b.WriteString("  </main>\n")
	b.WriteString(fmt.Sprintf("  <script>const LAZ_EVENTS = %s;</script>\n", opts.EventsJSON))
	b.WriteString(fmt.Sprintf("  <script src=\"%sjs/main.js\" defer></script>\n", prefix))
	b.WriteString("</body>\n")
	b.WriteString("</html>\n")
	return b.String()
}

func themeCSS(theme ThemeSettings) string {
	return fmt.Sprintf(`:root {
  --laz-primary: %s;
  --laz-radius: %s;
  --laz-font: %s;
}

body {
  font-family: var(--laz-font);
}`, theme.PrimaryColor, theme.BorderRadius, theme.FontFamily)
}

func pickTitle(meta PageMeta, fallback string) string {
	if meta.Title != "" {
		return meta.Title
	}
	return fallback
}

func assetPrefix(depth int) string {
	if depth <= 0 {
		return ""
	}
	return strings.Repeat("../", depth)
}

func htmlFileDepth(htmlFile string) int {
	clean := strings.TrimSuffix(htmlFile, ".html")
	if clean == "index" {
		return 0
	}
	return strings.Count(clean, "/") + 1
}

// PagePathToHTMLFile maps a route path to a relative HTML file path.
//   /        -> index.html
//   /about   -> about.html
//   /docs/x  -> docs/x.html
func PagePathToHTMLFile(pagePath string) string {
	if pagePath == "/" || pagePath == "" {
		return "index.html"
	}
	clean := strings.Trim(pagePath, "/")
	if !strings.Contains(clean, "/") {
		return clean + ".html"
	}
	return clean + ".html"
}

func buildPagePathMap(pages []PageBuildInput) map[string]string {
	m := make(map[string]string, len(pages))
	for _, p := range pages {
		path := p.Path
		if path == "" {
			path = "/"
		}
		m[path] = PagePathToHTMLFile(path)
	}
	return m
}
