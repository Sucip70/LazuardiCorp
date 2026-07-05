package assetutil_test

import (
	"strings"
	"testing"

	"github.com/lazuardicorp/backend/internal/assetutil"
)

func TestValidateUpload_rejectsOversized(t *testing.T) {
	data := []byte(strings.Repeat("a", 100))
	_, err := assetutil.ValidateUpload(data, "big.jpg", 50, nil)
	if err == nil {
		t.Fatal("expected size error")
	}
}

func TestValidateUpload_acceptsPNG(t *testing.T) {
	// minimal PNG header
	data := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	mime, err := assetutil.ValidateUpload(data, "test.png", 1024, nil)
	if err != nil {
		t.Fatal(err)
	}
	if mime != "image/png" {
		t.Fatalf("expected image/png, got %s", mime)
	}
}

func TestSanitizeFilename(t *testing.T) {
	name := assetutil.SanitizeFilename("../../evil name!.jpg")
	if strings.Contains(name, "/") || strings.Contains(name, "..") {
		t.Fatalf("unsafe filename: %s", name)
	}
}
