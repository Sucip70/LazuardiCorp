package deploy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

const vercelAPI = "https://api.vercel.com"

// VercelProvider deploys sites via the Vercel Deployments API.
type VercelProvider struct {
	token     string
	teamID    string
	projectID string
	client    *http.Client
}

func NewVercelProvider(cfg config.VercelConfig) *VercelProvider {
	return &VercelProvider{
		token:     cfg.Token,
		teamID:    cfg.TeamID,
		projectID: cfg.ProjectID,
		client:    &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *VercelProvider) Name() string { return "vercel" }

func (p *VercelProvider) Deploy(ctx context.Context, bundle staticgen.SiteBundle, opts Options) (Result, error) {
	if p.token == "" {
		return Result{}, fmt.Errorf("VERCEL_TOKEN is required")
	}
	projectID := opts.VercelProjectID
	if projectID == "" {
		projectID = p.projectID
	}
	if projectID == "" {
		created, err := p.createProject(ctx, opts.ProjectName)
		if err != nil {
			return Result{}, err
		}
		projectID = created
	}

	files := make([]map[string]any, 0, len(bundle))
	for name, content := range bundle {
		files = append(files, map[string]any{
			"file": name,
			"data": content,
		})
	}

	payload := map[string]any{
		"name":    opts.ProjectSlug,
		"project": projectID,
		"files":   files,
		"target":  "production",
	}
	if opts.IsPreview {
		payload["target"] = "preview"
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vercelAPI+"/v13/deployments", bytes.NewReader(body))
	if err != nil {
		return Result{}, err
	}
	p.setHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return Result{}, err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return Result{}, fmt.Errorf("vercel deploy: %s", string(respBody))
	}

	var deployment struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.Unmarshal(respBody, &deployment); err != nil {
		return Result{}, err
	}
	url := deployment.URL
	if url != "" && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}

	return Result{
		ExternalID: deployment.ID,
		URL:        url,
		PreviewURL: url,
		Metadata: map[string]string{
			"vercel_project_id": projectID,
			"deployment_id":     deployment.ID,
		},
	}, nil
}

func (p *VercelProvider) AddDomain(ctx context.Context, externalRef, domain string, _ Options) (DomainResult, error) {
	projectID := externalRef
	if projectID == "" {
		projectID = p.projectID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}

	payload, _ := json.Marshal(map[string]string{"name": host})
	url := fmt.Sprintf("%s/v10/projects/%s/domains", vercelAPI, projectID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return DomainResult{}, err
	}
	p.setHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return DomainResult{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return DomainResult{}, fmt.Errorf("vercel add domain: %s", string(body))
	}

	var info struct {
		Name     string `json:"name"`
		Verified bool   `json:"verified"`
	}
	_ = json.Unmarshal(body, &info)

	return DomainResult{
		Hostname:   host,
		Status:     "pending",
		SSLStatus:  "pending",
		DNSRecords: CNAMEForVercel(host),
		Verified:   info.Verified,
	}, nil
}

func (p *VercelProvider) RemoveDomain(ctx context.Context, externalRef, domain string, _ Options) error {
	projectID := externalRef
	if projectID == "" {
		projectID = p.projectID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/v9/projects/%s/domains/%s", vercelAPI, projectID, host)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return err
	}
	p.setHeaders(req)
	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 && resp.StatusCode != 404 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("vercel remove domain: %s", string(body))
	}
	return nil
}

func (p *VercelProvider) CheckDomain(ctx context.Context, externalRef, domain string, _ Options) (DomainResult, error) {
	projectID := externalRef
	if projectID == "" {
		projectID = p.projectID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}
	url := fmt.Sprintf("%s/v9/projects/%s/domains/%s", vercelAPI, projectID, host)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return DomainResult{}, err
	}
	p.setHeaders(req)
	resp, err := p.client.Do(req)
	if err != nil {
		return DomainResult{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return DomainResult{}, fmt.Errorf("vercel check domain: %s", string(body))
	}
	var info struct {
		Name     string `json:"name"`
		Verified bool   `json:"verified"`
	}
	if err := json.Unmarshal(body, &info); err != nil {
		return DomainResult{}, err
	}
	status := "pending"
	if info.Verified {
		status = "verified"
	}
	sslStatus := "pending"
	if info.Verified {
		sslStatus = "issuing"
	}
	return DomainResult{
		Hostname:   host,
		Status:     status,
		SSLStatus:  sslStatus,
		Verified:   info.Verified,
		DNSRecords: CNAMEForVercel(host),
	}, nil
}

func (p *VercelProvider) ProvisionSSL(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error) {
	return p.CheckDomain(ctx, externalRef, domain, opts)
}

func (p *VercelProvider) createProject(ctx context.Context, name string) (string, error) {
	payload, _ := json.Marshal(map[string]string{"name": name})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vercelAPI+"/v9/projects", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	p.setHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("vercel create project: %s", string(body))
	}
	var project struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &project); err != nil {
		return "", err
	}
	return project.ID, nil
}

func (p *VercelProvider) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+p.token)
	req.Header.Set("User-Agent", "Lazuardi-Builder/1.0")
	if p.teamID != "" {
		q := req.URL.Query()
		q.Set("teamId", p.teamID)
		req.URL.RawQuery = q.Encode()
	}
}
