package generator

import (
	"fmt"
	"strings"
)

// ExportFormat selects the output project type.
type ExportFormat string

const (
	FormatStatic ExportFormat = "static"
	FormatNextJS ExportFormat = "nextjs"
	FormatNuxt   ExportFormat = "nuxt"
)

func ParseFormat(raw string) ExportFormat {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "nextjs", "next", "react":
		return FormatNextJS
	case "nuxt", "vue":
		return FormatNuxt
	default:
		return FormatStatic
	}
}

func (f ExportFormat) String() string { return string(f) }

func (f ExportFormat) Label() string {
	switch f {
	case FormatNextJS:
		return "Next.js"
	case FormatNuxt:
		return "Nuxt 3"
	default:
		return "Static HTML"
	}
}

func (f ExportFormat) ZipSuffix() string {
	switch f {
	case FormatNextJS:
		return "nextjs"
	case FormatNuxt:
		return "nuxt"
	default:
		return "static"
	}
}

func (f ExportFormat) Validate() error {
	switch f {
	case FormatStatic, FormatNextJS, FormatNuxt:
		return nil
	default:
		return fmt.Errorf("unsupported export format: %q (use static, nextjs, or nuxt)", f)
	}
}
