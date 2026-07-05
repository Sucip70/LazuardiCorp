package deploy_test

import (
	"testing"

	"github.com/lazuardicorp/backend/internal/deploy"
)

func TestNormalizeDomain(t *testing.T) {
	got, err := deploy.NormalizeDomain("  WWW.Example.COM. ")
	if err != nil {
		t.Fatal(err)
	}
	if got != "www.example.com" {
		t.Fatalf("got %q", got)
	}
}

func TestCNAMEForVercel(t *testing.T) {
	records := deploy.CNAMEForVercel("www.example.com")
	if len(records) != 1 || records[0].Type != "CNAME" {
		t.Fatalf("unexpected records: %+v", records)
	}
}

func TestCNAMEForVercelApex(t *testing.T) {
	records := deploy.CNAMEForVercel("example.com")
	if len(records) != 1 || records[0].Type != "A" {
		t.Fatalf("unexpected apex records: %+v", records)
	}
}

func TestLetsEncryptDNSChallenge(t *testing.T) {
	records := deploy.LetsEncryptDNSChallenge("app.example.com", "tok", "keyauth")
	if len(records) != 1 || records[0].Type != "TXT" {
		t.Fatalf("unexpected: %+v", records)
	}
	if records[0].Name != "_acme-challenge.app.example.com" {
		t.Fatalf("name %q", records[0].Name)
	}
}

func TestParseProvider(t *testing.T) {
	if deploy.ParseProvider("cloudfront") != "s3" {
		t.Fatal("expected s3 alias")
	}
}

func TestContentTypeForPath(t *testing.T) {
	if deploy.ContentTypeForPath("css/styles.css") != "text/css; charset=utf-8" {
		t.Fatal("css mime")
	}
	if deploy.ContentTypeForPath("index.html") != "text/html; charset=utf-8" {
		t.Fatal("html mime")
	}
}

func TestDeploymentInstructions(t *testing.T) {
	steps := deploy.DeploymentInstructions("netlify", deploy.CNAMEForNetlify("www.demo.com", ""))
	if len(steps) < 2 {
		t.Fatalf("expected instructions, got %v", steps)
	}
}
