package deploy

import (
	"fmt"

	"github.com/lazuardicorp/backend/internal/config"
)

// Registry holds configured deploy providers.
type Registry struct {
	netlify *NetlifyProvider
	vercel  *VercelProvider
	s3      *S3CloudFrontProvider
	acme    *ACMEClient
	defaultProvider string
}

func NewRegistry(cfg config.DeployConfig) (*Registry, error) {
	reg := &Registry{
		netlify:         NewNetlifyProvider(cfg.Netlify),
		vercel:          NewVercelProvider(cfg.Vercel),
		defaultProvider: cfg.DefaultProvider,
		acme:            NewACMEClient(cfg.ACME),
	}
	if cfg.S3.Bucket != "" {
		s3p, err := NewS3CloudFrontProvider(cfg.S3)
		if err != nil {
			return reg, err
		}
		reg.s3 = s3p
	}
	return reg, nil
}

func (r *Registry) Provider(name string) (Provider, error) {
	switch name {
	case "netlify":
		return r.netlify, nil
	case "vercel":
		return r.vercel, nil
	case "s3", "aws", "cloudfront":
		if r.s3 == nil {
			return nil, fmt.Errorf("S3 deploy provider not configured (set DEPLOY_S3_BUCKET)")
		}
		return r.s3, nil
	default:
		return nil, fmt.Errorf("unknown deploy provider: %s", name)
	}
}

func (r *Registry) DefaultProvider() string {
	if r.defaultProvider == "" {
		return "s3"
	}
	return r.defaultProvider
}

func (r *Registry) ACME() *ACMEClient {
	return r.acme
}

func ParseProvider(name string) string {
	switch name {
	case "netlify":
		return "netlify"
	case "vercel":
		return "vercel"
	case "s3", "aws", "cloudfront":
		return "s3"
	default:
		return ""
	}
}
