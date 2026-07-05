package deploy

import (
	"context"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

// DNSRecord describes a DNS change required for domain verification or SSL.
type DNSRecord struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Value    string `json:"value"`
	Priority int    `json:"priority,omitempty"`
	TTL      int    `json:"ttl,omitempty"`
	Purpose  string `json:"purpose,omitempty"`
}

// Options passed to every deploy provider.
type Options struct {
	ProjectID   string
	ProjectSlug string
	ProjectName string
	SitePrefix  string
	IsPreview   bool
	PreviewToken string
	Domain      string

	NetlifySiteID   string
	VercelProjectID string
	S3Bucket        string
	S3Prefix        string
	CloudFrontID    string
}

// Result returned after a successful deploy.
type Result struct {
	ExternalID string
	URL        string
	PreviewURL string
	DNSRecords []DNSRecord
	Metadata   map[string]string
}

// DomainResult returned when attaching a custom domain.
type DomainResult struct {
	Hostname   string
	Status     string
	SSLStatus  string
	DNSRecords []DNSRecord
	Verified   bool
}

// Provider deploys static site bundles to a hosting target.
type Provider interface {
	Name() string
	Deploy(ctx context.Context, bundle staticgen.SiteBundle, opts Options) (Result, error)
	AddDomain(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error)
	RemoveDomain(ctx context.Context, externalRef, domain string, opts Options) error
	CheckDomain(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error)
	ProvisionSSL(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error)
}
