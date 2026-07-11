package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

type projectAssetCleaner interface {
	PurgeProjectAssets(ctx context.Context, projectID uuid.UUID) error
}

type ProjectService struct {
	projects    *repository.ProjectRepository
	pages       *repository.PageRepository
	assets      projectAssetCleaner
	invalidator *CacheInvalidator
}

func NewProjectService(projects *repository.ProjectRepository, pages *repository.PageRepository, assets projectAssetCleaner, invalidator *CacheInvalidator) *ProjectService {
	return &ProjectService{projects: projects, pages: pages, assets: assets, invalidator: invalidator}
}

func (s *ProjectService) Create(userID uuid.UUID, req dto.CreateProjectRequest) (dto.ProjectResponse, error) {
	exists, err := s.projects.SlugExists(userID, req.Slug, nil)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	if exists {
		return dto.ProjectResponse{}, fmt.Errorf("%w: slug already exists", repository.ErrConflict)
	}

	project := &model.Project{
		UserID:      userID,
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Settings:    jsonOrEmpty(req.Settings),
		IsTemplate:  req.IsTemplate,
	}
	if err := s.projects.Create(project); err != nil {
		return dto.ProjectResponse{}, err
	}

	home := &model.Page{
		ProjectID: project.ID,
		Name:      "Home",
		Path:      "/",
		SortOrder: 0,
		IsHome:    true,
		Meta:      datatypes.JSON([]byte(`{"title":"Home"}`)),
		Document:  datatypes.JSON([]byte(`{"rootIds":[],"nodes":{}}`)),
	}
	if err := s.pages.Create(home); err != nil {
		return dto.ProjectResponse{}, err
	}

	if s.invalidator != nil {
		s.invalidator.InvalidateUserProjects(context.Background(), userID)
	}
	return toProjectResponse(project), nil
}

func (s *ProjectService) List(userID uuid.UUID) ([]dto.ProjectResponse, error) {
	projects, err := s.projects.ListByUser(userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ProjectResponse, 0, len(projects))
	for i := range projects {
		out = append(out, toProjectResponse(&projects[i]))
	}
	return out, nil
}

func (s *ProjectService) Get(userID, projectID uuid.UUID) (dto.ProjectResponse, error) {
	project, err := s.projects.FindByID(projectID, userID)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	return toProjectResponse(project), nil
}

func (s *ProjectService) Update(userID, projectID uuid.UUID, req dto.UpdateProjectRequest) (dto.ProjectResponse, error) {
	project, err := s.projects.FindByID(projectID, userID)
	if err != nil {
		return dto.ProjectResponse{}, err
	}

	if req.Name != nil {
		project.Name = *req.Name
	}
	if req.Description != nil {
		project.Description = *req.Description
	}
	if req.Settings != nil {
		project.Settings = jsonOrEmpty(*req.Settings)
	}
	if req.IsTemplate != nil {
		project.IsTemplate = *req.IsTemplate
	}
	if req.Slug != nil && *req.Slug != project.Slug {
		exists, err := s.projects.SlugExists(userID, *req.Slug, &project.ID)
		if err != nil {
			return dto.ProjectResponse{}, err
		}
		if exists {
			return dto.ProjectResponse{}, fmt.Errorf("%w: slug already exists", repository.ErrConflict)
		}
		project.Slug = *req.Slug
	}

	if err := s.projects.Update(project); err != nil {
		return dto.ProjectResponse{}, err
	}
	if s.invalidator != nil {
		s.invalidator.InvalidateProject(context.Background(), project.ID)
		s.invalidator.InvalidateUserProjects(context.Background(), userID)
	}
	return toProjectResponse(project), nil
}

func (s *ProjectService) Delete(ctx context.Context, userID, projectID uuid.UUID) error {
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return err
	}
	if s.assets != nil {
		if err := s.assets.PurgeProjectAssets(ctx, projectID); err != nil {
			return err
		}
	}
	if err := s.projects.Delete(projectID, userID); err != nil {
		return err
	}
	if s.invalidator != nil {
		s.invalidator.InvalidateProject(ctx, projectID)
		s.invalidator.InvalidateUserProjects(ctx, userID)
	}
	return nil
}

func (s *ProjectService) ListTemplates() ([]dto.ProjectResponse, error) {
	projects, err := s.projects.ListTemplates()
	if err != nil {
		return nil, err
	}
	out := make([]dto.ProjectResponse, 0, len(projects))
	for i := range projects {
		out = append(out, toProjectResponse(&projects[i]))
	}
	return out, nil
}

func (s *ProjectService) Duplicate(userID, sourceID uuid.UUID, req dto.DuplicateProjectRequest) (dto.ProjectResponse, error) {
	source, err := s.projects.FindByIDOnly(sourceID)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	if !source.IsTemplate && source.UserID != userID {
		return dto.ProjectResponse{}, ErrUnauthorized
	}

	exists, err := s.projects.SlugExists(userID, req.Slug, nil)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	if exists {
		return dto.ProjectResponse{}, fmt.Errorf("%w: slug already exists", repository.ErrConflict)
	}

	copyProject := &model.Project{
		UserID:           userID,
		Name:             req.Name,
		Slug:             req.Slug,
		Description:      source.Description,
		Settings:         source.Settings,
		TemplateSourceID: &source.ID,
	}
	if err := s.projects.Create(copyProject); err != nil {
		return dto.ProjectResponse{}, err
	}

	pages, err := s.pages.ListByProject(source.ID)
	if err != nil {
		return dto.ProjectResponse{}, err
	}
	for _, page := range pages {
		newPage := &model.Page{
			ProjectID: copyProject.ID,
			Name:      page.Name,
			Path:      page.Path,
			SortOrder: page.SortOrder,
			IsHome:    page.IsHome,
			Meta:      page.Meta,
			Document:  page.Document,
		}
		if err := s.pages.Create(newPage); err != nil {
			return dto.ProjectResponse{}, err
		}
	}

	return toProjectResponse(copyProject), nil
}

func (s *ProjectService) GetOwnedProject(userID, projectID uuid.UUID) (*model.Project, error) {
	return s.projects.FindByID(projectID, userID)
}

func toProjectResponse(project *model.Project) dto.ProjectResponse {
	return dto.ProjectResponse{
		ID:          project.ID.String(),
		UserID:      project.UserID.String(),
		Name:        project.Name,
		Slug:        project.Slug,
		Description: project.Description,
		Settings:    rawJSON(project.Settings),
		IsTemplate:  project.IsTemplate,
		CreatedAt:   project.CreatedAt.Format(timeRFC3339),
		UpdatedAt:   project.UpdatedAt.Format(timeRFC3339),
	}
}

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"

func (s *ProjectService) LegacyCreate(userID uuid.UUID, data json.RawMessage) (dto.LegacyProjectResponse, error) {
	project, err := s.Create(userID, dto.CreateProjectRequest{
		Name: "Untitled Project",
		Slug: fmt.Sprintf("project-%s", uuid.NewString()[:8]),
	})
	if err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	projectID, _ := uuid.Parse(project.ID)
	pages, err := s.pages.ListByProject(projectID)
	if err != nil || len(pages) == 0 {
		return dto.LegacyProjectResponse{}, errors.New("home page missing")
	}
	pages[0].Document = jsonOrEmpty(extractPageDocument(data))
	if err := s.pages.Update(&pages[0]); err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	return dto.LegacyProjectResponse{ID: project.ID, Data: data}, nil
}

func (s *ProjectService) LegacyGet(userID uuid.UUID, id string) (dto.LegacyProjectResponse, error) {
	projectID, err := uuid.Parse(id)
	if err != nil {
		return dto.LegacyProjectResponse{}, ErrInvalidInput
	}
	project, err := s.projects.FindByID(projectID, userID)
	if err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	pages, err := s.pages.ListByProject(projectID)
	if err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	payload := map[string]any{
		"name":  project.Name,
		"slug":  project.Slug,
		"pages": pages,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	return dto.LegacyProjectResponse{ID: id, Data: raw}, nil
}

func (s *ProjectService) LegacyUpdate(userID uuid.UUID, id string, data json.RawMessage) (dto.LegacyProjectResponse, error) {
	projectID, err := uuid.Parse(id)
	if err != nil {
		return dto.LegacyProjectResponse{}, ErrInvalidInput
	}
	if _, err := s.projects.FindByID(projectID, userID); err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	pages, err := s.pages.ListByProject(projectID)
	if err != nil || len(pages) == 0 {
		return dto.LegacyProjectResponse{}, repository.ErrNotFound
	}
	pages[0].Document = jsonOrEmpty(extractPageDocument(data))
	if err := s.pages.Update(&pages[0]); err != nil {
		return dto.LegacyProjectResponse{}, err
	}
	return dto.LegacyProjectResponse{ID: id, Data: data}, nil
}

func (s *ProjectService) LegacyList(userID uuid.UUID) ([]dto.LegacyProjectResponse, error) {
	projects, err := s.List(userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.LegacyProjectResponse, 0, len(projects))
	for _, p := range projects {
		item, err := s.LegacyGet(userID, p.ID)
		if err != nil {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *ProjectService) LegacyDelete(ctx context.Context, userID uuid.UUID, id string) error {
	projectID, err := uuid.Parse(id)
	if err != nil {
		return ErrInvalidInput
	}
	return s.Delete(ctx, userID, projectID)
}

func extractPageDocument(data json.RawMessage) json.RawMessage {
	if len(data) == 0 {
		return data
	}
	var generic any
	if err := json.Unmarshal(data, &generic); err != nil {
		return data
	}
	obj, ok := generic.(map[string]any)
	if !ok {
		return data
	}
	if _, hasRoot := obj["rootIds"]; hasRoot {
		return data
	}
	pages, ok := obj["pages"].([]any)
	if !ok || len(pages) == 0 {
		return data
	}
	page, ok := pages[0].(map[string]any)
	if !ok {
		return data
	}
	if _, hasRoot := page["rootIds"]; !hasRoot {
		return data
	}
	encoded, err := json.Marshal(page)
	if err != nil {
		return data
	}
	return encoded
}
