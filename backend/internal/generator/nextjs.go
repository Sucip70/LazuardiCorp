package generator

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"github.com/lazuardicorp/backend/internal/staticgen"
)

// GenerateNextJS scaffolds a Next.js 14 App Router project with pre-rendered page content.
func GenerateNextJS(input ProjectInput) (ProjectBundle, error) {
	ctx, err := RenderPages(input)
	if err != nil {
		return nil, err
	}

	bundle := ProjectBundle{}
	slug := input.ProjectSlug
	if slug == "" {
		slug = "lazuardi-site"
	}

	// ── Config files ──────────────────────────────────────────
	bundle["package.json"] = []byte(fmt.Sprintf(nextPackageJSON, slug, input.ProjectName))
	bundle["next.config.mjs"] = []byte(nextConfig)
	bundle["tsconfig.json"] = []byte(nextTSConfig)
	bundle[".gitignore"] = []byte(nextGitignore)

	// ── Global styles ─────────────────────────────────────────
	globalsCSS := staticgenBaseCSS(ctx) + "\n"
	bundle["app/globals.css"] = []byte(globalsCSS)

	// ── Root layout ───────────────────────────────────────────
	layoutHTML, err := execTemplate(nextLayoutTmpl, map[string]any{
		"ProjectName": input.ProjectName,
		"FontFamily":  pickThemeFont(ctx.Theme),
	})
	if err != nil {
		return nil, err
	}
	bundle["app/layout.tsx"] = layoutHTML

	// ── Shared components ───────────────────────────────────────
	bundle["components/StaticPage.tsx"] = []byte(staticPageComponent)
	bundle["lib/interactivity.ts"] = []byte(nextInteractivityTS)

	// ── Pages ─────────────────────────────────────────────────
	for _, page := range ctx.Pages {
		pagePath := nextAppPagePath(page.RouteSegment)
		bodyJSON, _ := json.Marshal(page.BodyHTML)
		eventsJSON := page.EventsJSON
		if eventsJSON == "" {
			eventsJSON = "{}"
		}

		content, err := execTemplate(nextPageTmpl, map[string]any{
			"Title":       page.Title,
			"Description": page.Description,
			"BodyJSON":    string(bodyJSON),
			"EventsJSON":  eventsJSON,
			"Route":       page.Path,
		})
		if err != nil {
			return nil, fmt.Errorf("next page %s: %w", page.Path, err)
		}
		bundle[pagePath] = content

		// Store raw JSON document for future hydration/editing
		docPath := fmt.Sprintf("content/%s.json", sanitizeFilename(page.RouteSegment))
		bundle[docPath] = []byte(page.DocumentJSON)
	}

	// ── Assets ────────────────────────────────────────────────
	copyAssets(bundle, input.Assets)

	bundle["README.md"] = []byte(fmt.Sprintf(nextReadme, input.ProjectName))
	return bundle, nil
}

func nextAppPagePath(segment string) string {
	if segment == "index" {
		return "app/page.tsx"
	}
	return fmt.Sprintf("app/%s/page.tsx", segment)
}

func copyAssets(bundle ProjectBundle, assets []staticgen.ExportAsset) {
	for _, asset := range assets {
		publicPath := "public/" + asset.ExportPath
		bundle[publicPath] = asset.Data
	}
	if len(assets) == 0 {
		bundle["public/assets/images/.gitkeep"] = []byte("")
	}
}

func staticgenBaseCSS(ctx *RenderContext) string {
	theme := ctx.Theme
	return fmt.Sprintf(`:root {
  --laz-primary: %s;
  --laz-radius: %s;
  --laz-font: %s;
}

body {
  margin: 0;
  font-family: var(--laz-font);
}

%s
`, pickPrimary(theme), theme.BorderRadius, pickThemeFont(theme), ctx.CSSExtra)
}

func execTemplate(tmpl string, data any) ([]byte, error) {
	t, err := template.New("gen").Parse(tmpl)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func sanitizeFilename(name string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '/':
			return r
		default:
			return '-'
		}
	}, name)
}

const nextPackageJSON = `{
  "name": "%s",
  "version": "1.0.0",
  "private": true,
  "description": "%s — exported from Lazuardi No-Code Builder",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
`

const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
`

const nextTSConfig = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`

const nextGitignore = `.next/
out/
node_modules/
.env*.local
`

const nextLayoutTmpl = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '{{ .ProjectName }}',
  description: 'Generated by Lazuardi No-Code Builder',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body style={{"{{"}} fontFamily: '{{ .FontFamily }}' {{"}}"}}>{children}</body>
    </html>
  );
}
`

const nextPageTmpl = `'use client';

import { useEffect } from 'react';
import StaticPage from '@/components/StaticPage';
import { initInteractivity } from '@/lib/interactivity';

const html = {{ .BodyJSON }};

declare global {
  interface Window { LAZ_EVENTS?: Record<string, unknown>; }
}

export default function Page() {
  useEffect(() => {
    window.LAZ_EVENTS = {{ .EventsJSON }};
    initInteractivity();
  }, []);

  return <StaticPage html={html} />;
}
`

const staticPageComponent = `'use client';

type Props = { html: string };

export default function StaticPage({ html }: Props) {
  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
`

const nextInteractivityTS = `/** Lazuardi interactivity runtime for Next.js exports */
export function initInteractivity(): void {
  if (typeof window === 'undefined') return;

  document.querySelectorAll('[data-laz-tabs]').forEach((root) => {
    const tabs = root.querySelectorAll('[role="tab"]');
    const panel = root.querySelector('[role="tabpanel"]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-tab-id');
        tabs.forEach((t) => {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          t.classList.toggle('laz-tab-active', t === tab);
        });
        if (panel && id) {
          panel.id = 'panel-' + id;
          panel.setAttribute('aria-labelledby', 'tab-' + id);
        }
      });
    });
  });

  document.querySelectorAll('[data-laz-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('[role="alert"]')?.remove();
    });
  });

  document.querySelectorAll('[data-laz-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.laz-modal-backdrop')?.remove();
    });
  });

  document.querySelectorAll('[data-laz-nav-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.closest('nav');
      const menu = nav?.querySelector('[data-laz-nav-menu]');
      menu?.classList.toggle('laz-hidden');
    });
  });

  document.querySelectorAll('[data-laz-event]').forEach((el) => {
    const nodeId = el.getAttribute('data-node-id');
    const eventName = el.getAttribute('data-laz-event');
    if (!nodeId || !eventName) return;
    el.addEventListener(eventName, (e) => {
      const events = (window as any).LAZ_EVENTS;
      const cfg = events?.[nodeId]?.[eventName];
      if (!cfg) return;
      if (cfg.preventDefault) e.preventDefault();
      if (cfg.stopPropagation) e.stopPropagation();
      if (cfg.action === 'navigate' && cfg.payload?.href) {
        window.location.href = cfg.payload.href;
      }
    });
  });
}
`

const nextReadme = `# %s

Next.js project exported from **Lazuardi No-Code Builder**.

## Quick start

` + "```bash" + `
npm install
npm run dev
` + "```" + `

Open [http://localhost:3000](http://localhost:3000).

## Static export

` + "```bash" + `
npm run build
` + "```" + `

Output is written to ` + "`out/`" + ` (configured via ` + "`output: 'export'`" + ` in next.config.mjs).

## Structure

- ` + "`app/`" + ` — App Router pages (one route per builder page)
- ` + "`components/StaticPage.tsx`" + ` — Renders pre-built HTML
- ` + "`content/`" + ` — Original page JSON documents
- ` + "`public/assets/`" + ` — Images and media
- ` + "`lib/interactivity.ts`" + ` — Tabs, modals, nav toggles
`
