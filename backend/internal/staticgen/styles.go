package staticgen

import (
	"fmt"
	"strings"
)

const (
	breakpointTablet  = 768
	breakpointDesktop = 1024
)

type CSSBuilder struct {
	rules []string
	seen  map[string]struct{}
}

func NewCSSBuilder() *CSSBuilder {
	return &CSSBuilder{seen: map[string]struct{}{}}
}

func (b *CSSBuilder) AddRule(selector, body string) {
	key := selector + "|" + body
	if _, ok := b.seen[key]; ok {
		return
	}
	b.seen[key] = struct{}{}
	b.rules = append(b.rules, fmt.Sprintf("%s {\n  %s\n}", selector, body))
}

func (b *CSSBuilder) AddMediaRule(maxWidth int, selector, body string) {
	rule := fmt.Sprintf("@media (max-width: %dpx) {\n  %s {\n    %s\n  }\n}", maxWidth, selector, body)
	key := rule
	if _, ok := b.seen[key]; ok {
		return
	}
	b.seen[key] = struct{}{}
	b.rules = append(b.rules, rule)
}

func (b *CSSBuilder) AddMinMediaRule(minWidth int, selector, body string) {
	rule := fmt.Sprintf("@media (min-width: %dpx) {\n  %s {\n    %s\n  }\n}", minWidth, selector, body)
	if _, ok := b.seen[rule]; ok {
		return
	}
	b.seen[rule] = struct{}{}
	b.rules = append(b.rules, rule)
}

func (b *CSSBuilder) String() string {
	return strings.Join(b.rules, "\n\n")
}

func (r *Renderer) nodeSelector(node ComponentNode) string {
	if id, ok := node.Attributes["id"].(string); ok && id != "" {
		return "#" + id
	}
	return fmt.Sprintf("[data-node-id=\"%s\"]", node.ID)
}

func (r *Renderer) resolveClasses(node ComponentNode, extra ...string) string {
	classes := []string{node.Styles.ClassName}
	classes = append(classes, extra...)
	for _, bp := range []string{"mobile", "tablet", "desktop"} {
		if styles, ok := node.Styles.Breakpoints[bp]; ok && styles.ClassName != "" {
			classes = append(classes, styles.ClassName)
		}
	}
	return joinClasses(classes...)
}

func (r *Renderer) applyResponsiveVisibility(node ComponentNode) {
	sel := r.nodeSelector(node)
	for name, styles := range node.Styles.Breakpoints {
		if styles.Hidden == nil {
			continue
		}
		body := "display: none !important;"
		if !*styles.Hidden {
			body = "display: revert !important;"
		}
		switch name {
		case "mobile":
			r.css.AddMediaRule(breakpointTablet-1, sel, body)
		case "tablet":
			r.css.AddMediaRule(breakpointDesktop-1, sel, body)
			r.css.AddMinMediaRule(breakpointTablet, sel, invertDisplayBody(*styles.Hidden))
		case "desktop":
			r.css.AddMinMediaRule(breakpointDesktop, sel, body)
		}
	}
	if len(node.Styles.CSS) > 0 {
		r.css.AddRule(sel, inlineCSS(node.Styles.CSS))
	}
	for _, bp := range []string{"mobile", "tablet", "desktop"} {
		if styles, ok := node.Styles.Breakpoints[bp]; ok && len(styles.CSS) > 0 {
			body := inlineCSS(styles.CSS)
			switch bp {
			case "mobile":
				r.css.AddMediaRule(breakpointTablet-1, sel, body)
			case "tablet":
				r.css.AddMinMediaRule(breakpointTablet, sel, body)
			case "desktop":
				r.css.AddMinMediaRule(breakpointDesktop, sel, body)
			}
		}
	}
}

func invertDisplayBody(hidden bool) string {
	if hidden {
		return "display: none !important;"
	}
	return "display: revert !important;"
}

func layoutClasses(props map[string]any, direction string) string {
	gapMap := map[string]string{"none": "gap-0", "sm": "gap-2", "md": "gap-4", "lg": "gap-6"}
	paddingMap := map[string]string{"none": "p-0", "sm": "p-2", "md": "p-4", "lg": "p-6"}
	alignMap := map[string]string{"start": "items-start", "center": "items-center", "end": "items-end", "stretch": "items-stretch"}
	justifyMap := map[string]string{"start": "justify-start", "center": "justify-center", "end": "justify-end", "between": "justify-between", "around": "justify-around"}

	gap := gapMap[propString(props, "gap", "md")]
	padding := paddingMap[propString(props, "padding", "md")]
	align := alignMap[propString(props, "align", "stretch")]
	justify := justifyMap[propString(props, "justify", "start")]

	parts := []string{"flex"}
	if direction == "row" {
		parts = append(parts, "flex-row")
	} else {
		parts = append(parts, "flex-col")
	}
	parts = append(parts, gap, padding, align, justify)
	if propBool(props, "wrap") {
		parts = append(parts, "flex-wrap")
	}
	return joinClasses(parts...)
}

func maxWidthClass(value string) string {
	switch value {
	case "sm":
		return "max-w-sm"
	case "md":
		return "max-w-3xl"
	case "lg":
		return "max-w-5xl"
	case "full":
		return "max-w-full"
	default:
		return "max-w-5xl"
	}
}

func buttonVariantClasses(variant string) string {
	switch variant {
	case "secondary":
		return "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
	case "ghost":
		return "bg-transparent text-gray-700 hover:bg-gray-100"
	case "danger":
		return "bg-red-600 text-white hover:bg-red-700"
	default:
		return "bg-blue-600 text-white hover:bg-blue-700"
	}
}

func buttonSizeClasses(size string) string {
	switch size {
	case "sm":
		return "px-3 py-1.5 text-sm"
	case "lg":
		return "px-5 py-3 text-base"
	default:
		return "px-4 py-2 text-sm"
	}
}

func alertVariantClasses(variant string) string {
	switch variant {
	case "success":
		return "border-green-200 bg-green-50 text-green-900"
	case "warning":
		return "border-amber-200 bg-amber-50 text-amber-900"
	case "error":
		return "border-red-200 bg-red-50 text-red-900"
	default:
		return "border-blue-200 bg-blue-50 text-blue-900"
	}
}

func iconGlyph(name string) string {
	icons := map[string]string{
		"home": "⌂", "user": "👤", "settings": "⚙", "search": "🔍",
		"check": "✓", "info": "ℹ", "warning": "⚠", "error": "✕", "success": "✓",
	}
	if g, ok := icons[name]; ok {
		return g
	}
	return "●"
}

const baseStylesCSS = `/* Lazuardi static export — base styles */
*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  line-height: 1.5;
}

img, video {
  max-width: 100%;
  height: auto;
  display: block;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.laz-field {
  margin-top: 0.25rem;
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.laz-field:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.laz-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.laz-helper {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.laz-tab-active {
  border-bottom: 2px solid #2563eb;
  color: #2563eb;
}

.laz-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
}

.laz-modal-panel {
  width: 100%;
  max-width: 32rem;
  border-radius: 0.75rem;
  background: #fff;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.laz-hidden { display: none !important; }
`
