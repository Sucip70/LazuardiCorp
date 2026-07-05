package generator

import (
	"fmt"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

// Generate builds a complete project bundle in the requested format and returns ZIP bytes.
func Generate(input ProjectInput, format ExportFormat) ([]byte, string, error) {
	if err := format.Validate(); err != nil {
		return nil, "", err
	}

	var bundle ProjectBundle
	var err error

	switch format {
	case FormatNextJS:
		bundle, err = GenerateNextJS(input)
	case FormatNuxt:
		bundle, err = GenerateNuxt(input)
	default:
		bundle, err = staticgen.BuildSiteBundle(input.ToStaticgen())
	}

	if err != nil {
		return nil, "", err
	}

	slug := input.ProjectSlug
	if slug == "" {
		slug = "site"
	}
	filename := fmt.Sprintf("%s-%s.zip", slug, format.ZipSuffix())
	data, err := staticgen.ZipBundle(bundle, slug)
	if err != nil {
		return nil, "", err
	}
	return data, filename, nil
}

// GenerateBundle returns the file map without ZIP compression (useful for tests).
func GenerateBundle(input ProjectInput, format ExportFormat) (ProjectBundle, error) {
	if err := format.Validate(); err != nil {
		return nil, err
	}
	switch format {
	case FormatNextJS:
		return GenerateNextJS(input)
	case FormatNuxt:
		return GenerateNuxt(input)
	default:
		return staticgen.BuildSiteBundle(input.ToStaticgen())
	}
}

// WriteToMap merges bundle files into an existing map (helper for extensions).
func WriteToMap(dst ProjectBundle, src ProjectBundle) {
	for k, v := range src {
		dst[k] = v
	}
}
