package generator

import (
	"encoding/json"
	"fmt"
)

// GenerateNuxt scaffolds a Nuxt 3 project with pre-rendered page content.
func GenerateNuxt(input ProjectInput) (ProjectBundle, error) {
	ctx, err := RenderPages(input)
	if err != nil {
		return nil, err
	}

	bundle := ProjectBundle{}
	slug := input.ProjectSlug
	if slug == "" {
		slug = "lazuardi-site"
	}

	bundle["package.json"] = []byte(fmt.Sprintf(nuxtPackageJSON, slug, input.ProjectName))
	bundle["nuxt.config.ts"] = []byte(nuxtConfig)
	bundle["tsconfig.json"] = []byte(nuxtTSConfig)
	bundle[".gitignore"] = []byte(nuxtGitignore)

	globalsCSS := staticgenBaseCSS(ctx) + "\n"
	bundle["assets/css/globals.css"] = []byte(globalsCSS)

	appVue, err := execTemplate(nuxtAppVueTmpl, map[string]any{
		"ProjectName": input.ProjectName,
		"FontFamily":  pickThemeFont(ctx.Theme),
	})
	if err != nil {
		return nil, err
	}
	bundle["app.vue"] = appVue

	bundle["components/StaticPage.vue"] = []byte(staticPageVue)
	bundle["composables/useInteractivity.ts"] = []byte(nuxtInteractivityTS)

	for _, page := range ctx.Pages {
		vuePath := nuxtPagePath(page.RouteSegment)
		bodyJSON, _ := json.Marshal(page.BodyHTML)
		titleJSON, _ := json.Marshal(page.Title)
		descJSON, _ := json.Marshal(page.Description)
		eventsJSON := page.EventsJSON
		if eventsJSON == "" {
			eventsJSON = "{}"
		}

		content, err := execTemplate(nuxtPageTmpl, map[string]any{
			"TitleJSON":  string(titleJSON),
			"DescJSON":   string(descJSON),
			"BodyJSON":   string(bodyJSON),
			"EventsJSON": eventsJSON,
		})
		if err != nil {
			return nil, fmt.Errorf("nuxt page %s: %w", page.Path, err)
		}
		bundle[vuePath] = content

		docPath := fmt.Sprintf("data/%s.json", sanitizeFilename(page.RouteSegment))
		bundle[docPath] = []byte(page.DocumentJSON)
	}

	copyAssets(bundle, input.Assets)
	bundle["README.md"] = []byte(fmt.Sprintf(nuxtReadme, input.ProjectName))
	return bundle, nil
}

func nuxtPagePath(segment string) string {
	if segment == "index" {
		return "pages/index.vue"
	}
	return fmt.Sprintf("pages/%s.vue", segment)
}

const nuxtPackageJSON = `{
  "name": "%s",
  "version": "1.0.0",
  "private": true,
  "description": "%s — exported from Lazuardi No-Code Builder",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview"
  },
  "devDependencies": {
    "nuxt": "^3.11.0",
    "vue": "^3.4.0",
    "vue-router": "^4.3.0"
  }
}
`

const nuxtConfig = `export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      script: [{ src: 'https://cdn.tailwindcss.com' }],
    },
  },
  css: ['~/assets/css/globals.css'],
});
`

const nuxtTSConfig = `{
  "extends": "./.nuxt/tsconfig.json"
}
`

const nuxtGitignore = `.nuxt/
.output/
node_modules/
.env
`

const nuxtAppVueTmpl = `<template>
  <div :style="{ fontFamily: '{{ .FontFamily }}' }">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
useHead({ title: '{{ .ProjectName }}' });
</script>
`

const nuxtPageTmpl = `<template>
  <StaticPage :html="html" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useInteractivity } from '~/composables/useInteractivity';

const html = {{ .BodyJSON }};

useHead({
  title: {{ .TitleJSON }},
  meta: [{ name: 'description', content: {{ .DescJSON }} }],
});

onMounted(() => {
  (window as any).LAZ_EVENTS = {{ .EventsJSON }};
  useInteractivity();
});
</script>
`

const staticPageVue = `<template>
  <main v-html="html" />
</template>

<script setup lang="ts">
defineProps<{ html: string }>();
</script>
`

const nuxtInteractivityTS = `/** Lazuardi interactivity runtime for Nuxt exports */
export function useInteractivity(): void {
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
    btn.addEventListener('click', () => btn.closest('[role="alert"]')?.remove());
  });

  document.querySelectorAll('[data-laz-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.laz-modal-backdrop')?.remove());
  });

  document.querySelectorAll('[data-laz-nav-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.closest('nav');
      nav?.querySelector('[data-laz-nav-menu]')?.classList.toggle('laz-hidden');
    });
  });
}
`

const nuxtReadme = `# %s

Nuxt 3 project exported from **Lazuardi No-Code Builder**.

## Quick start

` + "```bash" + `
npm install
npm run dev
` + "```" + `

## Static site generation

` + "```bash" + `
npm run generate
` + "```" + `

Static files are output to ` + "`.output/public/`" + `.

## Structure

- ` + "`pages/`" + ` — File-based routes
- ` + "`components/StaticPage.vue`" + ` — Renders pre-built HTML
- ` + "`data/`" + ` — Original page JSON documents
- ` + "`public/assets/`" + ` — Images and media
`
