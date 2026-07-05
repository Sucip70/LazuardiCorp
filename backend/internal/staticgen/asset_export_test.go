package staticgen_test

import (
	"strings"
	"testing"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

func TestRewriteDocumentAssets(t *testing.T) {
	doc := []byte(`{
		"rootIds": ["img1"],
		"nodes": {
			"img1": {
				"id": "img1",
				"type": "Image",
				"children": [],
				"props": {
					"assetId": "asset_logo",
					"src": "https://old.example.com/logo.svg"
				}
			}
		}
	}`)

	catalog := staticgen.BuildExportCatalog([]staticgen.ExportAsset{{
		PublicID:   "asset_logo",
		ID:         "uuid-1",
		ExportPath: "assets/images/logo.svg",
	}})

	rewritten, err := staticgen.RewriteDocumentAssets(doc, catalog)
	if err != nil {
		t.Fatal(err)
	}
	out := string(rewritten)
	if !strings.Contains(out, `"src":"assets/images/logo.svg"`) && !strings.Contains(out, `"src": "assets/images/logo.svg"`) {
		t.Fatalf("expected rewritten src, got: %s", out)
	}
}

func TestBundleProjectAssets(t *testing.T) {
	assets, err := staticgen.BundleProjectAssets([]staticgen.AssetSource{{
		ID:       "id-1",
		PublicID: "asset_hero",
		Filename: "hero.png",
		MimeType: "image/png",
		Read: func(_ bool) ([]byte, error) {
			return []byte("fake-png"), nil
		},
	}}, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(assets) != 1 {
		t.Fatalf("expected 1 asset, got %d", len(assets))
	}
	if assets[0].ExportPath != "assets/images/hero.png" {
		t.Fatalf("unexpected export path: %s", assets[0].ExportPath)
	}
}
