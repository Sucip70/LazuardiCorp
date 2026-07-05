package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

type TemplateService struct {
	templates *repository.TemplateRepository
	projects  *repository.ProjectRepository
	pages     *repository.PageRepository
	invalidator *CacheInvalidator
}

func NewTemplateService(
	templates *repository.TemplateRepository,
	projects *repository.ProjectRepository,
	pages *repository.PageRepository,
	invalidator *CacheInvalidator,
) *TemplateService {
	return &TemplateService{
		templates: templates, projects: projects, pages: pages, invalidator: invalidator,
	}
}

func (s *TemplateService) List(category string) (dto.TemplateListResponse, error) {
	items, err := s.templates.List(category, false, nil)
	if err != nil {
		return dto.TemplateListResponse{}, err
	}
	categories, _ := s.templates.DistinctCategories()
	out := make([]dto.TemplateSummaryResponse, 0, len(items))
	for i := range items {
		out = append(out, toTemplateSummary(&items[i]))
	}
	return dto.TemplateListResponse{Templates: out, Categories: categories}, nil
}

func (s *TemplateService) ListForUser(userID uuid.UUID, category string) (dto.TemplateListResponse, error) {
	items, err := s.templates.List(category, true, &userID)
	if err != nil {
		return dto.TemplateListResponse{}, err
	}
	categories, _ := s.templates.DistinctCategories()
	out := make([]dto.TemplateSummaryResponse, 0, len(items))
	for i := range items {
		out = append(out, toTemplateSummary(&items[i]))
	}
	return dto.TemplateListResponse{Templates: out, Categories: categories}, nil
}

func (s *TemplateService) Get(id uuid.UUID, includeData bool) (dto.TemplateDetailResponse, error) {
	tmpl, err := s.templates.FindByID(id)
	if err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	resp := dto.TemplateDetailResponse{TemplateSummaryResponse: toTemplateSummary(tmpl)}
	if includeData {
		resp.JSONData = rawJSON(tmpl.JSONData)
	}
	return resp, nil
}

func (s *TemplateService) ListVersions(templateID uuid.UUID) (dto.TemplateVersionListResponse, error) {
	if _, err := s.templates.FindByID(templateID); err != nil {
		return dto.TemplateVersionListResponse{}, err
	}
	versions, err := s.templates.ListVersions(templateID)
	if err != nil {
		return dto.TemplateVersionListResponse{}, err
	}
	out := make([]dto.TemplateVersionResponse, 0, len(versions))
	for i := range versions {
		out = append(out, dto.TemplateVersionResponse{
			Version:   versions[i].Version,
			Changelog: versions[i].Changelog,
			CreatedAt: versions[i].CreatedAt.Format(timeRFC3339),
		})
	}
	return dto.TemplateVersionListResponse{Versions: out}, nil
}

func (s *TemplateService) GetVersion(templateID uuid.UUID, version int, includeData bool) (dto.TemplateVersionResponse, error) {
	ver, err := s.templates.FindVersion(templateID, version)
	if err != nil {
		return dto.TemplateVersionResponse{}, err
	}
	resp := dto.TemplateVersionResponse{
		Version:   ver.Version,
		Changelog: ver.Changelog,
		CreatedAt: ver.CreatedAt.Format(timeRFC3339),
	}
	if includeData {
		resp.JSONData = rawJSON(ver.JSONData)
	}
	return resp, nil
}

func (s *TemplateService) Apply(userID uuid.UUID, req dto.ApplyTemplateRequest) (dto.ProjectResponse, error) {
	templateID, err := uuid.Parse(req.TemplateID)
	if err != nil {
		return dto.ProjectResponse{}, fmt.Errorf("%w: invalid template_id", ErrInvalidInput)
	}
	tmpl, err := s.templates.FindByID(templateID)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	if !tmpl.IsBuiltin && (tmpl.UserID == nil || *tmpl.UserID != userID) {
		return dto.ProjectResponse{}, ErrUnauthorized
	}

	jsonData := tmpl.JSONData
	if req.Version != nil && *req.Version != tmpl.Version {
		ver, err := s.templates.FindVersion(templateID, *req.Version)
		if err != nil {
			return dto.ProjectResponse{}, err
		}
		jsonData = ver.JSONData
	}

	if req.UserTemplateID != "" {
		utID, err := uuid.Parse(req.UserTemplateID)
		if err != nil {
			return dto.ProjectResponse{}, fmt.Errorf("%w: invalid user_template_id", ErrInvalidInput)
		}
		ut, err := s.templates.FindUserTemplate(utID, userID)
		if err != nil {
			return dto.ProjectResponse{}, err
		}
		if ut.TemplateID != templateID {
			return dto.ProjectResponse{}, fmt.Errorf("%w: user template does not match template", ErrInvalidInput)
		}
		if len(ut.CustomData) > 0 && string(ut.CustomData) != "{}" {
			jsonData = ut.CustomData
		}
	}

	exists, err := s.projects.SlugExists(userID, req.Slug, nil)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	if exists {
		return dto.ProjectResponse{}, fmt.Errorf("%w: slug already exists", repository.ErrConflict)
	}

	parsed, err := parseTemplateJSON(jsonData)
	if err != nil {
		return dto.ProjectResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	settings := parsed.Settings
	if len(settings) == 0 {
		settings = []byte("{}")
	}

	project := &model.Project{
		UserID:           userID,
		Name:             req.Name,
		Slug:             req.Slug,
		Description:      parsed.Description,
		Settings:         datatypes.JSON(settings),
		TemplateSourceID: &tmpl.ID,
	}
	if err := s.projects.Create(project); err != nil {
		return dto.ProjectResponse{}, err
	}

	if len(parsed.Pages) == 0 {
		home := &model.Page{
			ProjectID: project.ID,
			Name:      "Home",
			Path:      "/",
			IsHome:    true,
			Document:  datatypes.JSON([]byte(`{"rootIds":[],"nodes":{}}`)),
		}
		if err := s.pages.Create(home); err != nil {
			return dto.ProjectResponse{}, err
		}
	} else {
		for i, page := range parsed.Pages {
			doc, _ := json.Marshal(map[string]any{
				"rootIds": page.RootIDs,
				"nodes":   page.Nodes,
			})
			meta, _ := json.Marshal(page.Meta)
			p := &model.Page{
				ProjectID: project.ID,
				Name:      page.Name,
				Path:      page.Path,
				SortOrder: page.SortOrder,
				IsHome:    page.IsHome,
				Meta:      datatypes.JSON(meta),
				Document:  datatypes.JSON(doc),
			}
			if p.Name == "" {
				p.Name = fmt.Sprintf("Page %d", i+1)
			}
			if p.Path == "" {
				p.Path = "/"
			}
			if err := s.pages.Create(p); err != nil {
				return dto.ProjectResponse{}, err
			}
		}
	}

	if s.invalidator != nil {
		s.invalidator.InvalidateUserProjects(context.Background(), userID)
	}
	return toProjectResponse(project), nil
}

func (s *TemplateService) SaveProjectAsTemplate(userID, projectID uuid.UUID, req dto.SaveProjectAsTemplateRequest) (dto.TemplateDetailResponse, error) {
	project, err := s.projects.FindByID(projectID, userID)
	if err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	pages, err := s.pages.ListByProject(projectID)
	if err != nil {
		return dto.TemplateDetailResponse{}, err
	}

	payload, err := buildTemplatePayload(project, pages)
	if err != nil {
		return dto.TemplateDetailResponse{}, err
	}

	slug := fmt.Sprintf("%s-%s", slugify(req.Name), uuid.NewString()[:8])
	tmpl := &model.Template{
		Slug:         slug,
		Name:         req.Name,
		Category:     req.Category,
		Description:  req.Description,
		PreviewImage: req.PreviewImage,
		JSONData:     datatypes.JSON(payload),
		Version:      1,
		IsBuiltin:    false,
		UserID:       &userID,
	}
	if err := s.templates.Create(tmpl); err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	changelog := req.Changelog
	if changelog == "" {
		changelog = "Saved from project"
	}
	if err := s.templates.CreateVersion(&model.TemplateVersion{
		TemplateID: tmpl.ID,
		Version:    1,
		JSONData:   datatypes.JSON(payload),
		Changelog:  changelog,
	}); err != nil {
		return dto.TemplateDetailResponse{}, err
	}

	resp := dto.TemplateDetailResponse{TemplateSummaryResponse: toTemplateSummary(tmpl)}
	resp.JSONData = rawJSON(tmpl.JSONData)
	return resp, nil
}

func (s *TemplateService) PublishTemplateVersion(userID, templateID uuid.UUID, changelog string) (dto.TemplateDetailResponse, error) {
	tmpl, err := s.templates.FindByID(templateID)
	if err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	if tmpl.UserID == nil || *tmpl.UserID != userID {
		return dto.TemplateDetailResponse{}, ErrUnauthorized
	}

	newVersion := tmpl.Version + 1
	if err := s.templates.CreateVersion(&model.TemplateVersion{
		TemplateID: tmpl.ID,
		Version:    newVersion,
		JSONData:   tmpl.JSONData,
		Changelog:  changelog,
	}); err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	tmpl.Version = newVersion
	if err := s.templates.Update(tmpl); err != nil {
		return dto.TemplateDetailResponse{}, err
	}
	resp := dto.TemplateDetailResponse{TemplateSummaryResponse: toTemplateSummary(tmpl)}
	resp.JSONData = rawJSON(tmpl.JSONData)
	return resp, nil
}

func (s *TemplateService) ListUserTemplates(userID uuid.UUID) (dto.UserTemplateListResponse, error) {
	items, err := s.templates.ListUserTemplates(userID)
	if err != nil {
		return dto.UserTemplateListResponse{}, err
	}
	out := make([]dto.UserTemplateResponse, 0, len(items))
	for i := range items {
		out = append(out, toUserTemplateResponse(&items[i]))
	}
	return dto.UserTemplateListResponse{UserTemplates: out}, nil
}

func (s *TemplateService) CreateUserTemplate(userID uuid.UUID, req dto.CreateUserTemplateRequest) (dto.UserTemplateResponse, error) {
	templateID, err := uuid.Parse(req.TemplateID)
	if err != nil {
		return dto.UserTemplateResponse{}, fmt.Errorf("%w: invalid template_id", ErrInvalidInput)
	}
	if _, err := s.templates.FindByID(templateID); err != nil {
		return dto.UserTemplateResponse{}, err
	}
	item := &model.UserTemplate{
		UserID:     userID,
		TemplateID: templateID,
		Name:       req.Name,
		CustomData: jsonOrEmpty(req.CustomData),
	}
	if err := s.templates.CreateUserTemplate(item); err != nil {
		return dto.UserTemplateResponse{}, err
	}
	created, err := s.templates.FindUserTemplate(item.ID, userID)
	if err != nil {
		return dto.UserTemplateResponse{}, err
	}
	return toUserTemplateResponse(created), nil
}

func (s *TemplateService) UpdateUserTemplate(userID, id uuid.UUID, req dto.UpdateUserTemplateRequest) (dto.UserTemplateResponse, error) {
	item, err := s.templates.FindUserTemplate(id, userID)
	if err != nil {
		return dto.UserTemplateResponse{}, err
	}
	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.CustomData != nil {
		item.CustomData = jsonOrEmpty(*req.CustomData)
	}
	if err := s.templates.UpdateUserTemplate(item); err != nil {
		return dto.UserTemplateResponse{}, err
	}
	return toUserTemplateResponse(item), nil
}

func (s *TemplateService) DeleteUserTemplate(userID, id uuid.UUID) error {
	return s.templates.DeleteUserTemplate(id, userID)
}

type templatePage struct {
	Name      string         `json:"name"`
	Path      string         `json:"path"`
	SortOrder int            `json:"sortOrder"`
	IsHome    bool           `json:"isHome"`
	Meta      map[string]any `json:"meta"`
	RootIDs   []string       `json:"rootIds"`
	Nodes     map[string]any `json:"nodes"`
}

type parsedTemplate struct {
	Description string
	Settings    json.RawMessage
	Pages       []templatePage
}

func parseTemplateJSON(raw []byte) (parsedTemplate, error) {
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return parsedTemplate{}, err
	}
	out := parsedTemplate{
		Description: strVal(doc["description"]),
	}
	if settings, ok := doc["settings"]; ok {
		out.Settings, _ = json.Marshal(settings)
	}
	pagesRaw, ok := doc["pages"].([]any)
	if !ok {
		return out, nil
	}
	for _, p := range pagesRaw {
		pageMap, ok := p.(map[string]any)
		if !ok {
			continue
		}
		page := templatePage{
			Name:      strVal(pageMap["name"]),
			Path:      strVal(pageMap["path"]),
			IsHome:    boolVal(pageMap["isHome"]),
			SortOrder: intVal(pageMap["sortOrder"]),
		}
		if meta, ok := pageMap["meta"].(map[string]any); ok {
			page.Meta = meta
		}
		if rootIds, ok := pageMap["rootIds"].([]any); ok {
			for _, id := range rootIds {
				if s, ok := id.(string); ok {
					page.RootIDs = append(page.RootIDs, s)
				}
			}
		}
		if nodes, ok := pageMap["nodes"].(map[string]any); ok {
			page.Nodes = nodes
		}
		out.Pages = append(out.Pages, page)
	}
	return out, nil
}

func buildTemplatePayload(project *model.Project, pages []model.Page) ([]byte, error) {
	pagePayloads := make([]map[string]any, 0, len(pages))
	for _, page := range pages {
		var doc map[string]any
		_ = json.Unmarshal(page.Document, &doc)
		var meta map[string]any
		_ = json.Unmarshal(page.Meta, &meta)
		pagePayloads = append(pagePayloads, map[string]any{
			"id":        page.ID.String(),
			"name":      page.Name,
			"path":      page.Path,
			"sortOrder": page.SortOrder,
			"isHome":    page.IsHome,
			"meta":      meta,
			"rootIds":   doc["rootIds"],
			"nodes":     doc["nodes"],
		})
	}
	var settings any
	_ = json.Unmarshal(project.Settings, &settings)
	payload := map[string]any{
		"schemaVersion": "1.0.0",
		"name":          project.Name,
		"slug":          project.Slug,
		"description":   project.Description,
		"settings":      settings,
		"pages":         pagePayloads,
	}
	return json.Marshal(payload)
}

func toTemplateSummary(t *model.Template) dto.TemplateSummaryResponse {
	return dto.TemplateSummaryResponse{
		ID:           t.ID.String(),
		Slug:         t.Slug,
		Name:         t.Name,
		Category:     t.Category,
		Description:  t.Description,
		PreviewImage: t.PreviewImage,
		Version:      t.Version,
		IsBuiltin:    t.IsBuiltin,
		CreatedAt:    t.CreatedAt.Format(timeRFC3339),
	}
}

func toUserTemplateResponse(u *model.UserTemplate) dto.UserTemplateResponse {
	resp := dto.UserTemplateResponse{
		ID:         u.ID.String(),
		Name:       u.Name,
		TemplateID: u.TemplateID.String(),
		CustomData: rawJSON(u.CustomData),
		CreatedAt:  u.CreatedAt.Format(timeRFC3339),
		UpdatedAt:  u.UpdatedAt.Format(timeRFC3339),
	}
	if u.Template.ID != uuid.Nil {
		resp.Template = toTemplateSummary(&u.Template)
	}
	return resp
}

func strVal(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func boolVal(v any) bool {
	if b, ok := v.(bool); ok {
		return b
	}
	return false
}

func intVal(v any) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	default:
		return 0
	}
}

func slugify(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			out = append(out, c)
		} else if c >= 'A' && c <= 'Z' {
			out = append(out, c+32)
		} else if c == ' ' || c == '-' || c == '_' {
			if len(out) > 0 && out[len(out)-1] != '-' {
				out = append(out, '-')
			}
		}
	}
	if len(out) == 0 {
		return "template"
	}
	return string(out)
}
