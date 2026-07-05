// Command generate is a standalone CLI for exporting Lazuardi projects from JSON.
//
// Usage:
//
//	generate -input project.json -format static -output ./dist
//	generate -input project.json -format nextjs -zip ./demo-nextjs.zip
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/lazuardicorp/backend/internal/generator"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

func main() {
	inputPath := flag.String("input", "", "Path to project JSON file (database export or schema example)")
	formatRaw := flag.String("format", "static", "Export format: static, nextjs, nuxt")
	outputDir := flag.String("output", "", "Write extracted files to directory (optional)")
	zipPath := flag.String("zip", "", "Write ZIP archive to path (optional)")
	flag.Parse()

	if *inputPath == "" {
		fmt.Fprintln(os.Stderr, "Usage: generate -input project.json [-format static|nextjs|nuxt] [-output dir] [-zip file.zip]")
		os.Exit(1)
	}

	raw, err := os.ReadFile(*inputPath)
	if err != nil {
		fatal(err)
	}

	input, err := parseProjectJSON(raw)
	if err != nil {
		fatal(err)
	}

	format := generator.ParseFormat(*formatRaw)
	bundle, err := generator.GenerateBundle(input, format)
	if err != nil {
		fatal(err)
	}

	if *outputDir != "" {
		if err := writeBundle(*outputDir, bundle); err != nil {
			fatal(err)
		}
		fmt.Printf("Wrote %d files to %s\n", len(bundle), *outputDir)
	}

	if *zipPath != "" {
		data, filename, err := generator.Generate(input, format)
		if err != nil {
			fatal(err)
		}
		if err := os.WriteFile(*zipPath, data, 0o644); err != nil {
			fatal(err)
		}
		fmt.Printf("Wrote %s (%d bytes) as %s\n", *zipPath, len(data), filename)
	}

	if *outputDir == "" && *zipPath == "" {
		data, filename, err := generator.Generate(input, format)
		if err != nil {
			fatal(err)
		}
		out := filename
		if err := os.WriteFile(out, data, 0o644); err != nil {
			fatal(err)
		}
		fmt.Printf("Wrote %s (%d bytes, %d files inside)\n", out, len(data), len(bundle))
	}
}

func parseProjectJSON(raw []byte) (generator.ProjectInput, error) {
	var doc struct {
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		Settings struct {
			Theme map[string]string `json:"theme"`
		} `json:"settings"`
		Pages []struct {
			Name     string          `json:"name"`
			Path     string          `json:"path"`
			Meta     json.RawMessage `json:"meta"`
			Document json.RawMessage `json:"document"`
			RootIDs  []string        `json:"rootIds"`
			Nodes    map[string]any  `json:"nodes"`
		} `json:"pages"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		return generator.ProjectInput{}, err
	}

	pages := make([]generator.PageInput, 0, len(doc.Pages))
	for _, p := range doc.Pages {
		document := p.Document
		if len(document) == 0 && len(p.RootIDs) > 0 {
			document, _ = json.Marshal(map[string]any{"rootIds": p.RootIDs, "nodes": p.Nodes})
		}
		pages = append(pages, generator.PageInput{
			Name:     p.Name,
			Path:     p.Path,
			Meta:     staticgen.ParsePageMeta(p.Meta),
			Document: document,
		})
	}

	return generator.ProjectInput{
		ProjectName: doc.Name,
		ProjectSlug: doc.Slug,
		Theme: staticgen.ThemeSettings{
			FontFamily:   doc.Settings.Theme["fontFamily"],
			PrimaryColor: doc.Settings.Theme["primaryColor"],
			BorderRadius: doc.Settings.Theme["borderRadius"],
		},
		Pages: pages,
	}, nil
}

func writeBundle(dir string, bundle generator.ProjectBundle) error {
	for name, content := range bundle {
		path := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(path, content, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}
