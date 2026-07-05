package deploy

import (
	"fmt"
	"strings"
)

// NormalizeDomain lowercases and strips trailing dots from a hostname.
func NormalizeDomain(domain string) (string, error) {
	domain = strings.TrimSpace(strings.ToLower(domain))
	domain = strings.TrimSuffix(domain, ".")
	if domain == "" {
		return "", fmt.Errorf("domain is required")
	}
	if strings.Contains(domain, " ") || strings.Contains(domain, "/") {
		return "", fmt.Errorf("invalid domain: %s", domain)
	}
	return domain, nil
}

// SplitDomain returns the subdomain label and apex domain (e.g. www + example.com).
func SplitDomain(hostname string) (subdomain, apex string) {
	parts := strings.Split(hostname, ".")
	if len(parts) <= 2 {
		return "", hostname
	}
	return strings.Join(parts[:len(parts)-2], "."), strings.Join(parts[len(parts)-2:], ".")
}

// CNAMEForNetlify returns DNS records to point a domain at Netlify.
func CNAMEForNetlify(hostname, netlifyTarget string) []DNSRecord {
	if netlifyTarget == "" {
		netlifyTarget = "apex-loadbalancer.netlify.com"
	}
	sub, _ := SplitDomain(hostname)
	name := hostname
	if sub == "" {
		name = "@"
	}
	return []DNSRecord{
		{
			Type:    "CNAME",
			Name:    name,
			Value:   netlifyTarget,
			TTL:     3600,
			Purpose: "Point domain to Netlify",
		},
		{
			Type:    "A",
			Name:    "@",
			Value:   "75.2.60.5",
			TTL:     3600,
			Purpose: "Netlify apex A record (if CNAME flattening unavailable)",
		},
	}
}

// CNAMEForVercel returns DNS records to point a domain at Vercel.
func CNAMEForVercel(hostname string) []DNSRecord {
	sub, _ := SplitDomain(hostname)
	name := hostname
	recordType := "CNAME"
	value := "cname.vercel-dns.com"
	if sub == "" {
		name = "@"
		recordType = "A"
		value = "76.76.21.21"
	}
	return []DNSRecord{{
		Type:    recordType,
		Name:    name,
		Value:   value,
		TTL:     3600,
		Purpose: "Point domain to Vercel",
	}}
}

// CNAMEForCloudFront returns DNS to point at a CloudFront distribution.
func CNAMEForCloudFront(hostname, distributionDomain string) []DNSRecord {
	sub, _ := SplitDomain(hostname)
	name := hostname
	if sub == "" {
		name = "@"
	}
	return []DNSRecord{{
		Type:    "CNAME",
		Name:    name,
		Value:   distributionDomain,
		TTL:     3600,
		Purpose: "Point domain to CloudFront distribution",
	}}
}

// ACMValidationRecords converts ACM DNS validation options to DNSRecord slice.
func ACMValidationRecords(hostname, recordName, recordValue string) []DNSRecord {
	return []DNSRecord{{
		Type:    "CNAME",
		Name:    strings.TrimSuffix(recordName, "."),
		Value:   strings.TrimSuffix(recordValue, "."),
		TTL:     300,
		Purpose: fmt.Sprintf("ACM certificate validation for %s", hostname),
	}}
}

// LetsEncryptDNSChallenge builds the TXT record for ACME DNS-01.
func LetsEncryptDNSChallenge(hostname, token, keyAuth string) []DNSRecord {
	// Standard _acme-challenge subdomain for DNS-01
	challengeName := "_acme-challenge." + hostname
	if sub, apex := SplitDomain(hostname); sub != "" {
		challengeName = "_acme-challenge." + sub + "." + apex
	}
	return []DNSRecord{{
		Type:    "TXT",
		Name:    challengeName,
		Value:   keyAuth,
		TTL:     300,
		Purpose: "Let's Encrypt DNS-01 challenge",
	}}
}

// DeploymentInstructions returns human-readable DNS setup steps.
func DeploymentInstructions(provider string, records []DNSRecord) []string {
	steps := make([]string, 0, len(records)+1)
	steps = append(steps, fmt.Sprintf("Configure DNS for %s deployment:", provider))
	for i, r := range records {
		steps = append(steps, fmt.Sprintf("%d. Create %s record %s → %s (%s)", i+1, r.Type, r.Name, r.Value, r.Purpose))
	}
	return steps
}
