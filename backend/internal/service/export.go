package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/generator"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

type ExportService struct {
	projects *ProjectService
	pages    *PageService
	assets   *AssetService
}

func NewExportService(projects *ProjectService, pages *PageService, assets *AssetService) *ExportService {
	return &ExportService{projects: projects, pages: pages, assets: assets}
}

func (s *ExportService) ExportProjectZIP(userID, projectID uuid.UUID, format generator.ExportFormat) ([]byte, string, error) {
	input, err := s.buildProjectInput(userID, projectID)
	if err != nil {
		return nil, "", err
	}
	return generator.Generate(input, format)
}

func (s *ExportService) ExportProjectZIPLegacy(userID, projectID uuid.UUID) ([]byte, string, error) {
	return s.ExportProjectZIP(userID, projectID, generator.FormatStatic)
}

// BuildStaticBundle renders the project as a deployable static site file map.
func (s *ExportService) BuildStaticBundle(userID, projectID uuid.UUID) (staticgen.SiteBundle, error) {
	input, err := s.buildProjectInput(userID, projectID)
	if err != nil {
		return nil, err
	}
	return staticgen.BuildSiteBundle(input.ToStaticgen())
}

func (s *ExportService) buildProjectInput(userID, projectID uuid.UUID) (generator.ProjectInput, error) {
	project, err := s.projects.GetOwnedProject(userID, projectID)
	if err != nil {
		return generator.ProjectInput{}, err
	}
	pages, err := s.pages.ListModelPages(projectID)
	if err != nil {
		return generator.ProjectInput{}, err
	}

	exportAssets, err := s.buildExportAssets(context.Background(), projectID)
	if err != nil {
		return generator.ProjectInput{}, err
	}
	catalog := staticgen.BuildExportCatalog(exportAssets)

	pageInputs := make([]generator.PageInput, 0, len(pages))
	for _, page := range pages {
		rewritten, err := staticgen.RewriteDocumentAssets(page.Document, catalog)
		if err != nil {
			return generator.ProjectInput{}, fmt.Errorf("rewrite assets for page %q: %w", page.Name, err)
		}
		pageInputs = append(pageInputs, generator.PageInput{
			Name:     page.Name,
			Path:     page.Path,
			Meta:     staticgen.ParsePageMeta(json.RawMessage(page.Meta)),
			Document: rewritten,
		})
	}

	return generator.ProjectInput{
		ProjectName: project.Name,
		ProjectSlug: project.Slug,
		Theme:       staticgen.ParseThemeSettings(json.RawMessage(project.Settings)),
		Pages:       pageInputs,
		Assets:      exportAssets,
	}, nil
}

func (s *ExportService) buildExportAssets(ctx context.Context, projectID uuid.UUID) ([]staticgen.ExportAsset, error) {
	modelAssets, err := s.assets.ListModelAssets(projectID)
	if err != nil {
		return nil, err
	}
	if len(modelAssets) == 0 {
		return nil, nil
	}

	sources := make([]staticgen.AssetSource, 0, len(modelAssets))
	for i := range modelAssets {
		asset := modelAssets[i]
		sources = append(sources, staticgen.AssetSource{
			ID:       asset.ID.String(),
			PublicID: asset.PublicID,
			Filename: asset.Filename,
			MimeType: asset.MimeType,
			Read: func(a model.Asset) func(bool) ([]byte, error) {
				return func(preferOptimized bool) ([]byte, error) {
					rc, _, err := s.assets.OpenAsset(ctx, &a, preferOptimized)
					if err != nil {
						return nil, err
					}
					defer rc.Close()
					return io.ReadAll(rc)
				}
			}(asset),
		})
	}
	return staticgen.BundleProjectAssets(sources, true)
}

// ExportPageHTML renders a single page to standalone HTML (useful for previews).
func (s *ExportService) ExportPageHTML(userID, projectID uuid.UUID, page model.Page) (string, error) {
	project, err := s.projects.GetOwnedProject(userID, projectID)
	if err != nil {
		return "", err
	}

	allPages, err := s.pages.ListModelPages(projectID)
	if err != nil {
		return "", err
	}

	pageInputs := make([]staticgen.PageBuildInput, 0, len(allPages))
	for _, p := range allPages {
		pageInputs = append(pageInputs, staticgen.PageBuildInput{
			Name:     p.Name,
			Path:     p.Path,
			Meta:     staticgen.ParsePageMeta(json.RawMessage(p.Meta)),
			Document: p.Document,
		})
	}

	bundle, err := staticgen.BuildSiteBundle(staticgen.SiteBuildInput{
		ProjectName: project.Name,
		ProjectSlug: project.Slug,
		Theme:       staticgen.ParseThemeSettings(json.RawMessage(project.Settings)),
		Pages:       pageInputs,
	})
	if err != nil {
		return "", err
	}

	htmlFile := staticgen.PagePathToHTMLFile(page.Path)
	content, ok := bundle[htmlFile]
	if !ok {
		return "", fmt.Errorf("rendered file not found: %s", htmlFile)
	}
	return string(content), nil
}
