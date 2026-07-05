package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/deploy"
	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

type DeployService struct {
	projects *ProjectService
	export   *ExportService
	repo     *repository.DeployRepository
	registry *deploy.Registry
	cfg      config.DeployConfig
	log      *zap.Logger

	autoDeployMu sync.Mutex
	autoDeployTimers map[uuid.UUID]*time.Timer
}

func NewDeployService(
	projects *ProjectService,
	export *ExportService,
	repo *repository.DeployRepository,
	registry *deploy.Registry,
	cfg config.DeployConfig,
	log *zap.Logger,
) *DeployService {
	return &DeployService{
		projects:         projects,
		export:           export,
		repo:             repo,
		registry:         registry,
		cfg:              cfg,
		log:              log,
		autoDeployTimers: make(map[uuid.UUID]*time.Timer),
	}
}

func (s *DeployService) GetConfig(userID, projectID uuid.UUID) (dto.DeployConfigResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DeployConfigResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DeployConfigResponse{}, err
	}
	return toDeployConfigResponse(cfg), nil
}

func (s *DeployService) UpdateConfig(userID, projectID uuid.UUID, req dto.UpdateDeployConfigRequest) (dto.DeployConfigResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DeployConfigResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DeployConfigResponse{}, err
	}
	if req.Provider != nil {
		if deploy.ParseProvider(*req.Provider) == "" {
			return dto.DeployConfigResponse{}, fmt.Errorf("%w: invalid provider", ErrInvalidInput)
		}
		cfg.Provider = deploy.ParseProvider(*req.Provider)
	}
	if req.AutoDeployOnSave != nil {
		cfg.AutoDeployOnSave = *req.AutoDeployOnSave
	}
	if req.ProductionDomain != nil {
		cfg.ProductionDomain = *req.ProductionDomain
	}
	if req.NetlifySiteID != nil {
		cfg.NetlifySiteID = *req.NetlifySiteID
	}
	if req.VercelProjectID != nil {
		cfg.VercelProjectID = *req.VercelProjectID
	}
	if req.S3Bucket != nil {
		cfg.S3Bucket = *req.S3Bucket
	}
	if req.S3Prefix != nil {
		cfg.S3Prefix = *req.S3Prefix
	}
	if req.CloudFrontID != nil {
		cfg.CloudFrontID = *req.CloudFrontID
	}
	if err := s.repo.UpdateConfig(cfg); err != nil {
		return dto.DeployConfigResponse{}, err
	}
	return toDeployConfigResponse(cfg), nil
}

func (s *DeployService) TriggerDeploy(ctx context.Context, userID, projectID uuid.UUID, req dto.TriggerDeployRequest) (dto.DeploymentResponse, error) {
	triggeredBy := "manual"
	if req.Preview {
		triggeredBy = "preview"
	}
	return s.runDeploy(ctx, userID, projectID, req, triggeredBy)
}

func (s *DeployService) runDeploy(ctx context.Context, userID, projectID uuid.UUID, req dto.TriggerDeployRequest, triggeredBy string) (dto.DeploymentResponse, error) {
	project, err := s.projects.GetOwnedProject(userID, projectID)
	if err != nil {
		return dto.DeploymentResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DeploymentResponse{}, err
	}

	providerName := cfg.Provider
	if req.Provider != "" {
		providerName = deploy.ParseProvider(req.Provider)
	}
	if providerName == "" {
		providerName = s.registry.DefaultProvider()
	}

	provider, err := s.registry.Provider(providerName)
	if err != nil {
		return dto.DeploymentResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	now := time.Now()

	dep := &model.Deployment{
		ProjectID:   projectID,
		Provider:    providerName,
		Status:      model.DeployStatusBuilding,
		IsPreview:   req.Preview,
		TriggeredBy: triggeredBy,
		StartedAt:   &now,
	}
	if req.Preview {
		token, err := randomPreviewToken()
		if err != nil {
			return dto.DeploymentResponse{}, err
		}
		dep.PreviewToken = token
	}
	if err := s.repo.CreateDeployment(dep); err != nil {
		return dto.DeploymentResponse{}, err
	}

	bundle, err := s.export.BuildStaticBundle(userID, projectID)
	if err != nil {
		s.failDeployment(dep, err)
		return dto.DeploymentResponse{}, err
	}

	dep.Status = model.DeployStatusUploading
	_ = s.repo.UpdateDeployment(dep)

	opts := s.buildDeployOptions(project, cfg, dep)
	result, err := provider.Deploy(ctx, bundle, opts)
	if err != nil {
		s.failDeployment(dep, err)
		return toDeploymentResponse(dep), err
	}

	completed := time.Now()
	dep.Status = model.DeployStatusLive
	if req.Preview {
		dep.Status = model.DeployStatusPreview
	}
	dep.URL = result.URL
	dep.PreviewURL = result.PreviewURL
	if dep.PreviewURL == "" && req.Preview {
		dep.PreviewURL = s.previewURL(dep.PreviewToken)
	}
	dep.ExternalID = result.ExternalID
	dep.CompletedAt = &completed
	if len(result.Metadata) > 0 {
		dep.Metadata, _ = json.Marshal(result.Metadata)
	}
	if err := s.repo.UpdateDeployment(dep); err != nil {
		return dto.DeploymentResponse{}, err
	}

	cfg.LastDeploymentID = &dep.ID
	if result.URL != "" && !req.Preview {
		cfg.ExternalSiteURL = result.URL
	}
	if metaSiteID, ok := result.Metadata["netlify_site_id"]; ok && cfg.NetlifySiteID == "" {
		cfg.NetlifySiteID = metaSiteID
	}
	if metaProjectID, ok := result.Metadata["vercel_project_id"]; ok && cfg.VercelProjectID == "" {
		cfg.VercelProjectID = metaProjectID
	}
	_ = s.repo.UpdateConfig(cfg)

	return toDeploymentResponse(dep), nil
}

func (s *DeployService) QueueAutoDeploy(userID, projectID uuid.UUID) {
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return
	}
	if !cfg.AutoDeployOnSave && !s.cfg.AutoDeployOnSave {
		return
	}

	s.autoDeployMu.Lock()
	defer s.autoDeployMu.Unlock()
	if timer, ok := s.autoDeployTimers[projectID]; ok {
		timer.Stop()
	}
	uid := userID
	pid := projectID
	s.autoDeployTimers[projectID] = time.AfterFunc(5*time.Second, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if _, err := s.runDeploy(ctx, uid, pid, dto.TriggerDeployRequest{}, "auto"); err != nil {
			s.log.Warn("auto-deploy failed", zap.String("project", pid.String()), zap.Error(err))
		}
	})
}

func (s *DeployService) ListDeployments(userID, projectID uuid.UUID) (dto.DeploymentListResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DeploymentListResponse{}, err
	}
	deps, err := s.repo.ListDeployments(projectID, 50)
	if err != nil {
		return dto.DeploymentListResponse{}, err
	}
	out := make([]dto.DeploymentResponse, 0, len(deps))
	for i := range deps {
		out = append(out, toDeploymentResponse(&deps[i]))
	}
	return dto.DeploymentListResponse{Deployments: out}, nil
}

func (s *DeployService) GetDeployment(userID, projectID, deploymentID uuid.UUID) (dto.DeploymentResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DeploymentResponse{}, err
	}
	dep, err := s.repo.FindDeployment(deploymentID, projectID)
	if err != nil {
		return dto.DeploymentResponse{}, err
	}
	return toDeploymentResponse(dep), nil
}

func (s *DeployService) CreatePreviewLink(ctx context.Context, userID, projectID uuid.UUID) (dto.PreviewLinkResponse, error) {
	dep, err := s.TriggerDeploy(ctx, userID, projectID, dto.TriggerDeployRequest{Preview: true})
	if err != nil {
		return dto.PreviewLinkResponse{}, err
	}
	expires := time.Now().Add(s.cfg.PreviewTokenTTL)
	return dto.PreviewLinkResponse{
		Token:     dep.PreviewToken,
		URL:       dep.PreviewURL,
		ExpiresAt: expires.Format(timeRFC3339),
	}, nil
}

func (s *DeployService) ResolvePreviewToken(token string) (dto.DeploymentResponse, error) {
	dep, err := s.repo.FindDeploymentByPreviewToken(token)
	if err != nil {
		return dto.DeploymentResponse{}, err
	}
	return toDeploymentResponse(dep), nil
}

func (s *DeployService) AddDomain(ctx context.Context, userID, projectID uuid.UUID, req dto.AddDomainRequest) (dto.DomainResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DomainResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DomainResponse{}, err
	}
	host, err := deploy.NormalizeDomain(req.Hostname)
	if err != nil {
		return dto.DomainResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	provider, err := s.registry.Provider(cfg.Provider)
	if err != nil {
		return dto.DomainResponse{}, err
	}
	externalRef := s.externalRef(cfg)
	result, err := provider.AddDomain(ctx, externalRef, host, s.buildDeployOptionsFromConfig(cfg, nil))
	if err != nil {
		return dto.DomainResponse{}, err
	}

	if req.IsPrimary {
		_ = s.repo.ClearPrimaryDomain(projectID)
		cfg.ProductionDomain = host
		_ = s.repo.UpdateConfig(cfg)
	}

	dnsJSON, _ := json.Marshal(result.DNSRecords)
	domain := &model.DeploymentDomain{
		ProjectID:  projectID,
		Hostname:   host,
		IsPrimary:  req.IsPrimary,
		Status:     result.Status,
		SSLStatus:  result.SSLStatus,
		DNSRecords: dnsJSON,
	}
	if err := s.repo.CreateDomain(domain); err != nil {
		return dto.DomainResponse{}, err
	}
	return toDomainResponse(domain), nil
}

func (s *DeployService) ListDomains(userID, projectID uuid.UUID) (dto.DomainListResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DomainListResponse{}, err
	}
	domains, err := s.repo.ListDomains(projectID)
	if err != nil {
		return dto.DomainListResponse{}, err
	}
	out := make([]dto.DomainResponse, 0, len(domains))
	for i := range domains {
		out = append(out, toDomainResponse(&domains[i]))
	}
	return dto.DomainListResponse{Domains: out}, nil
}

func (s *DeployService) RemoveDomain(ctx context.Context, userID, projectID, domainID uuid.UUID) error {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return err
	}
	domain, err := s.repo.FindDomain(domainID, projectID)
	if err != nil {
		return err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return err
	}
	provider, err := s.registry.Provider(cfg.Provider)
	if err != nil {
		return err
	}
	_ = provider.RemoveDomain(ctx, s.externalRef(cfg), domain.Hostname, s.buildDeployOptionsFromConfig(cfg, nil))
	return s.repo.DeleteDomain(domainID, projectID)
}

func (s *DeployService) VerifyDomain(ctx context.Context, userID, projectID, domainID uuid.UUID) (dto.DomainResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DomainResponse{}, err
	}
	domain, err := s.repo.FindDomain(domainID, projectID)
	if err != nil {
		return dto.DomainResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DomainResponse{}, err
	}
	provider, err := s.registry.Provider(cfg.Provider)
	if err != nil {
		return dto.DomainResponse{}, err
	}
	result, err := provider.CheckDomain(ctx, s.externalRef(cfg), domain.Hostname, s.buildDeployOptionsFromConfig(cfg, nil))
	if err != nil {
		return dto.DomainResponse{}, err
	}
	domain.Status = result.Status
	domain.SSLStatus = result.SSLStatus
	if result.Verified {
		now := time.Now()
		domain.VerifiedAt = &now
	}
	if len(result.DNSRecords) > 0 {
		domain.DNSRecords, _ = json.Marshal(result.DNSRecords)
	}
	if err := s.repo.UpdateDomain(domain); err != nil {
		return dto.DomainResponse{}, err
	}
	return toDomainResponse(domain), nil
}

func (s *DeployService) ProvisionSSL(ctx context.Context, userID, projectID uuid.UUID, req dto.SSLProvisionRequest) (dto.SSLProvisionResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.SSLProvisionResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.SSLProvisionResponse{}, err
	}
	host, err := deploy.NormalizeDomain(req.Hostname)
	if err != nil {
		return dto.SSLProvisionResponse{}, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	provider, err := s.registry.Provider(cfg.Provider)
	if err != nil {
		return dto.SSLProvisionResponse{}, err
	}
	result, err := provider.ProvisionSSL(ctx, s.externalRef(cfg), host, s.buildDeployOptionsFromConfig(cfg, nil))
	if err != nil {
		return dto.SSLProvisionResponse{}, err
	}

	resp := dto.SSLProvisionResponse{
		Hostname:   host,
		SSLStatus:  result.SSLStatus,
		DNSRecords: toDNSRecordResponses(result.DNSRecords),
	}

	if s.registry.ACME() != nil && s.registry.ACME().Directory() != "" && cfg.Provider == model.DeployProviderS3 {
		order, err := s.registry.ACME().CreateDNSOrder(ctx, deploy.OrderRequest{Domains: []string{host}})
		if err == nil {
			resp.OrderID = order.OrderID
			resp.DNSRecords = append(resp.DNSRecords, toDNSRecordResponses(order.DNSRecords)...)
		}
	}
	return resp, nil
}

func (s *DeployService) DNSInstructions(userID, projectID uuid.UUID, domainID uuid.UUID) (dto.DNSInstructionsResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.DNSInstructionsResponse{}, err
	}
	domain, err := s.repo.FindDomain(domainID, projectID)
	if err != nil {
		return dto.DNSInstructionsResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.DNSInstructionsResponse{}, err
	}
	var records []deploy.DNSRecord
	_ = json.Unmarshal(domain.DNSRecords, &records)
	return dto.DNSInstructionsResponse{
		Provider:     cfg.Provider,
		Instructions: deploy.DeploymentInstructions(cfg.Provider, records),
		Records:      toDNSRecordResponses(records),
	}, nil
}

func (s *DeployService) CreateCloudFront(ctx context.Context, userID, projectID uuid.UUID, req dto.CreateCloudFrontRequest) (dto.CreateCloudFrontResponse, error) {
	if _, err := s.projects.GetOwnedProject(userID, projectID); err != nil {
		return dto.CreateCloudFrontResponse{}, err
	}
	cfg, err := s.repo.GetOrCreateConfig(projectID)
	if err != nil {
		return dto.CreateCloudFrontResponse{}, err
	}
	provider, err := s.registry.Provider("s3")
	if err != nil {
		return dto.CreateCloudFrontResponse{}, err
	}
	s3p, ok := provider.(*deploy.S3CloudFrontProvider)
	if !ok {
		return dto.CreateCloudFrontResponse{}, fmt.Errorf("%w: S3 provider unavailable", ErrInvalidInput)
	}
	bucket := req.Bucket
	if bucket == "" {
		bucket = cfg.S3Bucket
	}
	if bucket == "" {
		bucket = s.cfg.S3.Bucket
	}
	id, domain, err := s3p.CreateDistribution(ctx, bucket)
	if err != nil {
		return dto.CreateCloudFrontResponse{}, err
	}
	cfg.CloudFrontID = id
	cfg.S3Bucket = bucket
	_ = s.repo.UpdateConfig(cfg)
	return dto.CreateCloudFrontResponse{
		DistributionID:     id,
		DistributionDomain: domain,
		DNSRecords:         toDNSRecordResponses(deploy.CNAMEForCloudFront("www.example.com", domain)),
	}, nil
}

func (s *DeployService) buildDeployOptions(project *model.Project, cfg *model.ProjectDeployConfig, dep *model.Deployment) deploy.Options {
	opts := s.buildDeployOptionsFromConfig(cfg, dep)
	opts.ProjectID = project.ID.String()
	opts.ProjectSlug = project.Slug
	opts.ProjectName = project.Name
	opts.SitePrefix = project.Slug
	return opts
}

func (s *DeployService) buildDeployOptionsFromConfig(cfg *model.ProjectDeployConfig, dep *model.Deployment) deploy.Options {
	opts := deploy.Options{
		Domain:          cfg.ProductionDomain,
		NetlifySiteID:   cfg.NetlifySiteID,
		VercelProjectID: cfg.VercelProjectID,
		S3Bucket:        firstNonEmptyStr(cfg.S3Bucket, s.cfg.S3.Bucket),
		S3Prefix:        firstNonEmptyStr(cfg.S3Prefix, s.cfg.S3.Prefix),
		CloudFrontID:    firstNonEmptyStr(cfg.CloudFrontID, s.cfg.S3.CloudFrontID),
	}
	if dep != nil {
		opts.IsPreview = dep.IsPreview
		opts.PreviewToken = dep.PreviewToken
	}
	return opts
}

func (s *DeployService) externalRef(cfg *model.ProjectDeployConfig) string {
	switch cfg.Provider {
	case model.DeployProviderNetlify:
		return cfg.NetlifySiteID
	case model.DeployProviderVercel:
		return cfg.VercelProjectID
	default:
		return cfg.CloudFrontID
	}
}

func (s *DeployService) previewURL(token string) string {
	return strings.TrimRight(s.cfg.PreviewPublicBaseURL, "/") + "/preview/" + token + "/"
}

func (s *DeployService) failDeployment(dep *model.Deployment, err error) {
	dep.Status = model.DeployStatusFailed
	dep.ErrorMessage = err.Error()
	now := time.Now()
	dep.CompletedAt = &now
	_ = s.repo.UpdateDeployment(dep)
}

func randomPreviewToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func firstNonEmptyStr(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func toDeployConfigResponse(cfg *model.ProjectDeployConfig) dto.DeployConfigResponse {
	resp := dto.DeployConfigResponse{
		ProjectID:        cfg.ProjectID.String(),
		Provider:         cfg.Provider,
		AutoDeployOnSave: cfg.AutoDeployOnSave,
		ProductionDomain: cfg.ProductionDomain,
		NetlifySiteID:    cfg.NetlifySiteID,
		VercelProjectID:  cfg.VercelProjectID,
		S3Bucket:         cfg.S3Bucket,
		S3Prefix:         cfg.S3Prefix,
		CloudFrontID:     cfg.CloudFrontID,
		ExternalSiteURL:  cfg.ExternalSiteURL,
	}
	if cfg.LastDeploymentID != nil {
		resp.LastDeploymentID = cfg.LastDeploymentID.String()
	}
	return resp
}

func toDeploymentResponse(dep *model.Deployment) dto.DeploymentResponse {
	resp := dto.DeploymentResponse{
		ID:           dep.ID.String(),
		ProjectID:    dep.ProjectID.String(),
		Provider:     dep.Provider,
		Status:       dep.Status,
		IsPreview:    dep.IsPreview,
		PreviewToken: dep.PreviewToken,
		URL:          dep.URL,
		PreviewURL:   dep.PreviewURL,
		ExternalID:   dep.ExternalID,
		ErrorMessage: dep.ErrorMessage,
		TriggeredBy:  dep.TriggeredBy,
		CreatedAt:    dep.CreatedAt.Format(timeRFC3339),
	}
	if dep.StartedAt != nil {
		resp.StartedAt = dep.StartedAt.Format(timeRFC3339)
	}
	if dep.CompletedAt != nil {
		resp.CompletedAt = dep.CompletedAt.Format(timeRFC3339)
	}
	if len(dep.Metadata) > 0 {
		_ = json.Unmarshal(dep.Metadata, &resp.Metadata)
	}
	return resp
}

func toDomainResponse(d *model.DeploymentDomain) dto.DomainResponse {
	resp := dto.DomainResponse{
		ID:        d.ID.String(),
		ProjectID: d.ProjectID.String(),
		Hostname:  d.Hostname,
		IsPrimary: d.IsPrimary,
		Status:    d.Status,
		SSLStatus: d.SSLStatus,
		CreatedAt: d.CreatedAt.Format(timeRFC3339),
	}
	if d.VerifiedAt != nil {
		resp.VerifiedAt = d.VerifiedAt.Format(timeRFC3339)
	}
	var records []deploy.DNSRecord
	if len(d.DNSRecords) > 0 {
		_ = json.Unmarshal(d.DNSRecords, &records)
	}
	resp.DNSRecords = toDNSRecordResponses(records)
	return resp
}

func toDNSRecordResponses(records []deploy.DNSRecord) []dto.DNSRecordResponse {
	out := make([]dto.DNSRecordResponse, 0, len(records))
	for _, r := range records {
		out = append(out, dto.DNSRecordResponse{
			Type: r.Type, Name: r.Name, Value: r.Value,
			Priority: r.Priority, TTL: r.TTL, Purpose: r.Purpose,
		})
	}
	return out
}
