package deploy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

const netlifyAPI = "https://api.netlify.com/api/v1"

// NetlifyProvider deploys sites via the Netlify Deploy API.
type NetlifyProvider struct {
	token  string
	siteID string
	client *http.Client
}

func NewNetlifyProvider(cfg config.NetlifyConfig) *NetlifyProvider {
	return &NetlifyProvider{
		token:  cfg.Token,
		siteID: cfg.SiteID,
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *NetlifyProvider) Name() string { return "netlify" }

func (p *NetlifyProvider) Deploy(ctx context.Context, bundle staticgen.SiteBundle, opts Options) (Result, error) {
	if p.token == "" {
		return Result{}, fmt.Errorf("NETLIFY_TOKEN is required")
	}
	siteID := opts.NetlifySiteID
	if siteID == "" {
		siteID = p.siteID
	}
	if siteID == "" {
		created, err := p.createSite(ctx, opts.ProjectName)
		if err != nil {
			return Result{}, err
		}
		siteID = created
	}

	zipData, err := BundleToZip(bundle, opts.ProjectSlug)
	if err != nil {
		return Result{}, err
	}

	deploy, err := p.uploadDeploy(ctx, siteID, zipData)
	if err != nil {
		return Result{}, err
	}

	url := deploy.SSLURL
	if url == "" {
		url = deploy.URL
	}
	if opts.IsPreview && deploy.DeployURL != "" {
		url = deploy.DeployURL
	}

	return Result{
		ExternalID: deploy.ID,
		URL:        url,
		PreviewURL: deploy.DeployURL,
		Metadata: map[string]string{
			"netlify_site_id": siteID,
			"deploy_id":       deploy.ID,
			"state":           deploy.State,
		},
	}, nil
}

func (p *NetlifyProvider) AddDomain(ctx context.Context, externalRef, domain string, _ Options) (DomainResult, error) {
	siteID := externalRef
	if siteID == "" {
		siteID = p.siteID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/sites/%s/domains", netlifyAPI, siteID), strings.NewReader("{}"))
	if err != nil {
		return DomainResult{}, err
	}
	q := req.URL.Query()
	q.Set("domain", host)
	req.URL.RawQuery = q.Encode()
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return DomainResult{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return DomainResult{}, fmt.Errorf("netlify add domain: %s", string(body))
	}

	records := CNAMEForNetlify(host, "")
	return DomainResult{
		Hostname:   host,
		Status:     "pending",
		SSLStatus:  "pending",
		DNSRecords: records,
	}, nil
}

func (p *NetlifyProvider) RemoveDomain(ctx context.Context, externalRef, domain string, _ Options) error {
	siteID := externalRef
	if siteID == "" {
		siteID = p.siteID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		fmt.Sprintf("%s/sites/%s/domains/%s", netlifyAPI, siteID, host), nil)
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
		return fmt.Errorf("netlify remove domain: %s", string(body))
	}
	return nil
}

func (p *NetlifyProvider) CheckDomain(ctx context.Context, externalRef, domain string, _ Options) (DomainResult, error) {
	siteID := externalRef
	if siteID == "" {
		siteID = p.siteID
	}
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/sites/%s/domains/%s", netlifyAPI, siteID, host), nil)
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
		return DomainResult{}, fmt.Errorf("netlify check domain: %s", string(body))
	}
	var info struct {
		Domain     string `json:"domain"`
		Verified   bool   `json:"verified"`
		SSL        bool   `json:"ssl"`
		SSLEnabled bool   `json:"ssl_enabled"`
	}
	if err := json.Unmarshal(body, &info); err != nil {
		return DomainResult{}, err
	}
	sslStatus := "pending"
	if info.SSL || info.SSLEnabled {
		sslStatus = "active"
	}
	status := "pending"
	if info.Verified {
		status = "verified"
	}
	return DomainResult{
		Hostname:   host,
		Status:     status,
		SSLStatus:  sslStatus,
		Verified:   info.Verified,
		DNSRecords: CNAMEForNetlify(host, ""),
	}, nil
}

func (p *NetlifyProvider) ProvisionSSL(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error) {
	// Netlify provisions Let's Encrypt automatically once DNS is verified.
	return p.CheckDomain(ctx, externalRef, domain, opts)
}

func (p *NetlifyProvider) createSite(ctx context.Context, name string) (string, error) {
	payload, _ := json.Marshal(map[string]string{"name": name})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, netlifyAPI+"/sites", bytes.NewReader(payload))
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
		return "", fmt.Errorf("netlify create site: %s", string(body))
	}
	var site struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &site); err != nil {
		return "", err
	}
	return site.ID, nil
}

type netlifyDeploy struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	SSLURL    string `json:"ssl_url"`
	DeployURL string `json:"deploy_ssl_url"`
	State     string `json:"state"`
}

func (p *NetlifyProvider) uploadDeploy(ctx context.Context, siteID string, zip []byte) (*netlifyDeploy, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", "site.zip")
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(zip); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/sites/%s/deploys", netlifyAPI, siteID), &buf)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)
	req.Header.Set("Content-Type", w.FormDataContentType())
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("netlify deploy: %s", string(body))
	}
	var deploy netlifyDeploy
	if err := json.Unmarshal(body, &deploy); err != nil {
		return nil, err
	}
	return &deploy, nil
}

func (p *NetlifyProvider) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+p.token)
	req.Header.Set("User-Agent", "Lazuardi-Builder/1.0")
}
