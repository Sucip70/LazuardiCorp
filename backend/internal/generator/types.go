package generator

import (
	"github.com/lazuardicorp/backend/internal/staticgen"
)

// ProjectInput is the normalized input for all export formats.
type ProjectInput struct {
	ProjectName string
	ProjectSlug string
	Theme       staticgen.ThemeSettings
	Pages       []PageInput
	Assets      []staticgen.ExportAsset
	CSSMode     CSSMode // tailwind-cdn (default) or custom-only
}

type PageInput struct {
	Name     string
	Path     string
	Meta     staticgen.PageMeta
	Document []byte
}

type CSSMode string

const (
	CSSModeTailwindCDN CSSMode = "tailwind-cdn"
	CSSModeCustomOnly  CSSMode = "custom"
)

// ProjectBundle is a map of relative paths to file contents ready for ZIP.
type ProjectBundle = staticgen.SiteBundle

// RenderedPage holds pre-rendered output for one route.
type RenderedPage struct {
	Name         string
	Path         string
	Title        string
	Description  string
	RouteSegment string
	BodyHTML     string
	EventsJSON   string
	DocumentJSON string
	HTMLFile     string
	Depth        int
}

// FromStaticgen converts staticgen input to generator input.
func FromStaticgen(in staticgen.SiteBuildInput) ProjectInput {
	pages := make([]PageInput, 0, len(in.Pages))
	for _, p := range in.Pages {
		pages = append(pages, PageInput{
			Name: p.Name, Path: p.Path, Meta: p.Meta, Document: p.Document,
		})
	}
	return ProjectInput{
		ProjectName: in.ProjectName,
		ProjectSlug: in.ProjectSlug,
		Theme:       in.Theme,
		Pages:       pages,
		Assets:      in.Assets,
		CSSMode:     CSSModeTailwindCDN,
	}
}

// ToStaticgen converts back for legacy callers.
func (in ProjectInput) ToStaticgen() staticgen.SiteBuildInput {
	pages := make([]staticgen.PageBuildInput, 0, len(in.Pages))
	for _, p := range in.Pages {
		pages = append(pages, staticgen.PageBuildInput{
			Name: p.Name, Path: p.Path, Meta: p.Meta, Document: p.Document,
		})
	}
	return staticgen.SiteBuildInput{
		ProjectName: in.ProjectName,
		ProjectSlug: in.ProjectSlug,
		Theme:       in.Theme,
		Pages:       pages,
		Assets:      in.Assets,
	}
}
