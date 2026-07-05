package staticgen

import (
	"encoding/json"
	"fmt"
	"path"
	"strings"
)

// ExportAsset describes an asset bundled into the static export.
type ExportAsset struct {
	PublicID   string
	ID         string
	Filename   string
	ExportPath string
	Data       []byte
	MimeType   string
}

// BuildExportCatalog maps asset references to export paths.
func BuildExportCatalog(assets []ExportAsset) map[string]ExportAsset {
	catalog := make(map[string]ExportAsset, len(assets)*2)
	for _, asset := range assets {
		catalog[asset.PublicID] = asset
		catalog[asset.ID] = asset
	}
	return catalog
}

// RewriteDocumentAssets replaces assetId references with relative export paths and rewrites src URLs.
func RewriteDocumentAssets(raw []byte, catalog map[string]ExportAsset) ([]byte, error) {
	if len(raw) == 0 || len(catalog) == 0 {
		return raw, nil
	}

	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return raw, err
	}

	nodes, ok := doc["nodes"].(map[string]any)
	if !ok {
		return raw, nil
	}

	for _, nodeRaw := range nodes {
		node, ok := nodeRaw.(map[string]any)
		if !ok {
			continue
		}
		props, ok := node["props"].(map[string]any)
		if !ok {
			continue
		}
		rewritePropsAssets(props, catalog)
	}

	return json.Marshal(doc)
}

func rewritePropsAssets(props map[string]any, catalog map[string]ExportAsset) {
	ref, _ := props["assetId"].(string)
	if ref == "" {
		return
	}
	asset, ok := catalog[ref]
	if !ok {
		return
	}
	props["src"] = asset.ExportPath
	if props["alt"] == nil || props["alt"] == "" {
		// alt stays as-is; export path is the main rewrite
	}
}

// BundleProjectAssets downloads asset bytes and prepares export entries.
func BundleProjectAssets(
	assets []AssetSource,
	preferOptimized bool,
) ([]ExportAsset, error) {
	out := make([]ExportAsset, 0, len(assets))
	usedNames := map[string]int{}

	for _, src := range assets {
		data, err := src.Read(preferOptimized)
		if err != nil {
			return nil, fmt.Errorf("read asset %s: %w", src.PublicID, err)
		}

		filename := sanitizeExportFilename(src.Filename, src.PublicID, src.MimeType)
		if n := usedNames[filename]; n > 0 {
			ext := path.Ext(filename)
			base := strings.TrimSuffix(filename, ext)
			filename = fmt.Sprintf("%s-%d%s", base, n, ext)
		}
		usedNames[filename]++

		exportPath := path.Join("assets", "images", filename)
		out = append(out, ExportAsset{
			PublicID:   src.PublicID,
			ID:         src.ID,
			Filename:   filename,
			ExportPath: exportPath,
			Data:       data,
			MimeType:   src.MimeType,
		})
	}
	return out, nil
}

// AssetSource abstracts reading asset bytes during export.
type AssetSource struct {
	ID         string
	PublicID   string
	Filename   string
	MimeType   string
	Read       func(preferOptimized bool) ([]byte, error)
}

func sanitizeExportFilename(filename, publicID, mimeType string) string {
	name := path.Base(filename)
	if name == "" || name == "." {
		ext := ".jpg"
		switch mimeType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		case "image/gif":
			ext = ".gif"
		case "image/svg+xml":
			ext = ".svg"
		}
		name = publicID + ext
	}
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '.', r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, name)
}

// PrefixAssetPaths adjusts asset export paths for pages in subdirectories.
func PrefixAssetPaths(exportPath string, htmlDepth int) string {
	if htmlDepth <= 0 {
		return exportPath
	}
	return strings.Repeat("../", htmlDepth) + exportPath
}
