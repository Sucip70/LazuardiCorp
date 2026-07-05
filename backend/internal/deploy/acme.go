package deploy

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/lazuardicorp/backend/internal/config"
)

const (
	acmeProduction = "https://acme-v02.api.letsencrypt.org/directory"
	acmeStaging    = "https://acme-staging-v02.api.letsencrypt.org/directory"
)

// ACMEClient handles Let's Encrypt certificate orders via DNS-01 challenges.
type ACMEClient struct {
	email        string
	directoryURL string
}

func NewACMEClient(cfg config.ACMEConfig) *ACMEClient {
	dir := cfg.DirectoryURL
	if dir == "" {
		dir = acmeProduction
		if cfg.Staging {
			dir = acmeStaging
		}
	}
	return &ACMEClient{email: cfg.Email, directoryURL: dir}
}

// OrderRequest describes a certificate order.
type OrderRequest struct {
	Domains []string
}

// OrderResponse contains DNS records the user must create before validation.
type OrderResponse struct {
	OrderID    string
	Domains    []string
	DNSRecords []DNSRecord
	ExpiresAt  time.Time
	Status     string
}

// CreateDNSOrder generates DNS-01 challenge records for Let's Encrypt.
// Full automated issuance requires DNS provider API integration; this returns
// the TXT records for manual or external automation (cert-manager, etc.).
func (c *ACMEClient) CreateDNSOrder(_ context.Context, req OrderRequest) (OrderResponse, error) {
	if c.email == "" {
		return OrderResponse{}, fmt.Errorf("ACME_EMAIL is required for Let's Encrypt")
	}
	if len(req.Domains) == 0 {
		return OrderResponse{}, fmt.Errorf("at least one domain is required")
	}

	orderID, err := randomToken(16)
	if err != nil {
		return OrderResponse{}, err
	}

	records := make([]DNSRecord, 0, len(req.Domains))
	normalized := make([]string, 0, len(req.Domains))
	for _, d := range req.Domains {
		host, err := NormalizeDomain(d)
		if err != nil {
			return OrderResponse{}, err
		}
		normalized = append(normalized, host)
		token, err := randomToken(32)
		if err != nil {
			return OrderResponse{}, err
		}
		keyAuth := dns01KeyAuthorization(token)
		records = append(records, LetsEncryptDNSChallenge(host, token, keyAuth)...)
	}

	return OrderResponse{
		OrderID:    orderID,
		Domains:    normalized,
		DNSRecords: records,
		ExpiresAt:  time.Now().Add(7 * 24 * time.Hour),
		Status:     "pending_dns",
	}, nil
}

// dns01KeyAuthorization produces the TXT value for DNS-01 (simplified placeholder).
// Production use should integrate golang.org/x/crypto/acme or lego for real key auth.
func dns01KeyAuthorization(token string) string {
	sum := sha256.Sum256([]byte(token + ".placeholder-account-key"))
	return strings.TrimRight(base64.RawURLEncoding.EncodeToString(sum[:]), "=")
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Directory returns the ACME directory URL in use.
func (c *ACMEClient) Directory() string {
	return c.directoryURL
}
