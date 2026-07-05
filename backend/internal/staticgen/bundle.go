package staticgen

import (
	"archive/zip"
	"bytes"
	"fmt"
	"path"
)

// ZipBundle compresses a SiteBundle into a ZIP archive.
func ZipBundle(bundle SiteBundle, rootFolder string) ([]byte, error) {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	for name, content := range bundle {
		fullPath := path.Join(rootFolder, name)
		w, err := zw.Create(fullPath)
		if err != nil {
			return nil, fmt.Errorf("zip create %s: %w", fullPath, err)
		}
		if _, err := w.Write(content); err != nil {
			return nil, fmt.Errorf("zip write %s: %w", fullPath, err)
		}
	}

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateProjectZIP is the high-level entry point used by the export service.
func GenerateProjectZIP(input SiteBuildInput) ([]byte, string, error) {
	bundle, err := BuildSiteBundle(input)
	if err != nil {
		return nil, "", err
	}
	root := input.ProjectSlug
	if root == "" {
		root = "site"
	}
	data, err := ZipBundle(bundle, root)
	if err != nil {
		return nil, "", err
	}
	filename := fmt.Sprintf("%s-export.zip", root)
	return data, filename, nil
}
