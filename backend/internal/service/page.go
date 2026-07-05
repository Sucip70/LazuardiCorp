package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

type PageService struct {
	projects    *repository.ProjectRepository
	pages       *repository.PageRepository
	invalidator *CacheInvalidator
	autoDeploy  autoDeployTrigger
}

type autoDeployTrigger interface {
	QueueAutoDeploy(userID, projectID uuid.UUID)
}

func NewPageService(projects *repository.ProjectRepository, pages *repository.PageRepository, invalidator *CacheInvalidator) *PageService {
	return &PageService{projects: projects, pages: pages, invalidator: invalidator}
}

func (s *PageService) SetAutoDeployTrigger(trigger autoDeployTrigger) {
	s.autoDeploy = trigger
}

func (s *PageService) ensureProject(userID, projectID uuid.UUID) error {
	_, err := s.projects.FindByID(projectID, userID)
	return err
}

func (s *PageService) Create(userID, projectID uuid.UUID, req dto.CreatePageRequest) (dto.PageResponse, error) {
	if err := s.ensureProject(userID, projectID); err != nil {
		return dto.PageResponse{}, err
	}
	exists, err := s.pages.PathExists(projectID, req.Path, nil)
	if err != nil {
		return dto.PageResponse{}, err
	}
	if exists {
		return dto.PageResponse{}, fmt.Errorf("%w: path already exists", repository.ErrConflict)
	}
	if req.IsHome {
		if err := s.pages.ClearHome(projectID, nil); err != nil {
			return dto.PageResponse{}, err
		}
	}

	page := &model.Page{
		ProjectID: projectID,
		Name:      req.Name,
		Path:      req.Path,
		SortOrder: req.SortOrder,
		IsHome:    req.IsHome,
		Meta:      jsonOrEmpty(req.Meta),
		Document:  jsonOrEmpty(defaultDocument(req.Document)),
	}
	if err := s.pages.Create(page); err != nil {
		return dto.PageResponse{}, err
	}
	s.invalidateProject(context.Background(), projectID)
	return toPageResponse(page), nil
}

func (s *PageService) List(userID, projectID uuid.UUID) ([]dto.PageResponse, error) {
	if err := s.ensureProject(userID, projectID); err != nil {
		return nil, err
	}
	pages, err := s.pages.ListByProject(projectID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PageResponse, 0, len(pages))
	for i := range pages {
		out = append(out, toPageResponse(&pages[i]))
	}
	return out, nil
}

func (s *PageService) Get(userID, projectID, pageID uuid.UUID) (dto.PageResponse, error) {
	if err := s.ensureProject(userID, projectID); err != nil {
		return dto.PageResponse{}, err
	}
	page, err := s.pages.FindByID(pageID, projectID)
	if err != nil {
		return dto.PageResponse{}, err
	}
	return toPageResponse(page), nil
}

func (s *PageService) Update(userID, projectID, pageID uuid.UUID, req dto.UpdatePageRequest) (dto.PageResponse, error) {
	if err := s.ensureProject(userID, projectID); err != nil {
		return dto.PageResponse{}, err
	}
	page, err := s.pages.FindByID(pageID, projectID)
	if err != nil {
		return dto.PageResponse{}, err
	}

	if req.Name != nil {
		page.Name = *req.Name
	}
	if req.SortOrder != nil {
		page.SortOrder = *req.SortOrder
	}
	if req.Meta != nil {
		page.Meta = jsonOrEmpty(*req.Meta)
	}
	if req.Document != nil {
		page.Document = jsonOrEmpty(*req.Document)
	}
	if req.Path != nil && *req.Path != page.Path {
		exists, err := s.pages.PathExists(projectID, *req.Path, &page.ID)
		if err != nil {
			return dto.PageResponse{}, err
		}
		if exists {
			return dto.PageResponse{}, fmt.Errorf("%w: path already exists", repository.ErrConflict)
		}
		page.Path = *req.Path
	}
	if req.IsHome != nil && *req.IsHome {
		if err := s.pages.ClearHome(projectID, &page.ID); err != nil {
			return dto.PageResponse{}, err
		}
		page.IsHome = true
	} else if req.IsHome != nil {
		page.IsHome = false
	}

	if err := s.pages.Update(page); err != nil {
		return dto.PageResponse{}, err
	}
	s.invalidatePage(context.Background(), projectID, pageID)
	return toPageResponse(page), nil
}

func (s *PageService) Delete(userID, projectID, pageID uuid.UUID) error {
	if err := s.ensureProject(userID, projectID); err != nil {
		return err
	}
	page, err := s.pages.FindByID(pageID, projectID)
	if err != nil {
		return err
	}
	if page.IsHome {
		return fmt.Errorf("%w: cannot delete home page", ErrInvalidInput)
	}
	if err := s.pages.Delete(pageID, projectID); err != nil {
		return err
	}
	s.invalidatePage(context.Background(), projectID, pageID)
	return nil
}

func (s *PageService) LoadDocument(userID, projectID, pageID uuid.UUID) (dto.PageDocumentResponse, error) {
	page, err := s.Get(userID, projectID, pageID)
	if err != nil {
		return dto.PageDocumentResponse{}, err
	}
	return dto.PageDocumentResponse{PageID: page.ID, Document: page.Document}, nil
}

func (s *PageService) SaveDocument(_ context.Context, userID, projectID, pageID uuid.UUID, req dto.SavePageDocumentRequest) (dto.PageDocumentResponse, error) {
	if err := s.ensureProject(userID, projectID); err != nil {
		return dto.PageDocumentResponse{}, err
	}
	page, err := s.pages.FindByID(pageID, projectID)
	if err != nil {
		return dto.PageDocumentResponse{}, err
	}
	page.Document = jsonOrEmpty(req.Document)
	if err := s.pages.Update(page); err != nil {
		return dto.PageDocumentResponse{}, err
	}
	s.invalidatePage(context.Background(), projectID, pageID)
	if s.autoDeploy != nil {
		s.autoDeploy.QueueAutoDeploy(userID, projectID)
	}
	return dto.PageDocumentResponse{PageID: page.ID.String(), Document: rawJSON(page.Document)}, nil
}

func (s *PageService) invalidatePage(ctx context.Context, projectID, pageID uuid.UUID) {
	if s.invalidator == nil {
		return
	}
	s.invalidator.InvalidatePage(ctx, projectID, pageID)
	s.invalidator.InvalidateProject(ctx, projectID)
}

func (s *PageService) invalidateProject(ctx context.Context, projectID uuid.UUID) {
	if s.invalidator == nil {
		return
	}
	s.invalidator.InvalidateProject(ctx, projectID)
}

func defaultDocument(raw []byte) []byte {
	if len(raw) == 0 {
		return []byte(`{"rootIds":[],"nodes":{}}`)
	}
	return raw
}

func toPageResponse(page *model.Page) dto.PageResponse {
	return dto.PageResponse{
		ID:        page.ID.String(),
		ProjectID: page.ProjectID.String(),
		Name:      page.Name,
		Path:      page.Path,
		SortOrder: page.SortOrder,
		IsHome:    page.IsHome,
		Meta:      rawJSON(page.Meta),
		Document:  rawJSON(page.Document),
		CreatedAt: page.CreatedAt.Format(timeRFC3339),
		UpdatedAt: page.UpdatedAt.Format(timeRFC3339),
	}
}

func (s *PageService) ListModelPages(projectID uuid.UUID) ([]model.Page, error) {
	return s.pages.ListByProject(projectID)
}
