package staticgen

import (
	"fmt"
	"html"
	"strings"
)

func escape(s string) string {
	return html.EscapeString(s)
}

func escapeAttr(s string) string {
	return html.EscapeString(s)
}

func joinClasses(parts ...string) string {
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, " ")
}

func inlineCSS(css map[string]string) string {
	if len(css) == 0 {
		return ""
	}
	parts := make([]string, 0, len(css))
	for k, v := range css {
		parts = append(parts, fmt.Sprintf("%s: %s", camelToKebab(k), v))
	}
	return strings.Join(parts, "; ")
}

func joinInlineStyles(parts ...string) string {
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.TrimSuffix(p, ";")
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, "; ")
}

func camelToKebab(s string) string {
	var b strings.Builder
	for i, r := range s {
		if r >= 'A' && r <= 'Z' {
			if i > 0 {
				b.WriteByte('-')
			}
			b.WriteRune(r + ('a' - 'A'))
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func boolAttr(name string, value bool) string {
	if value {
		return " " + name
	}
	return ""
}

func attrString(name, value string) string {
	if value == "" {
		return ""
	}
	return fmt.Sprintf(` %s="%s"`, name, escapeAttr(value))
}

func attrsFromMap(m map[string]any) string {
	if len(m) == 0 {
		return ""
	}
	var b strings.Builder
	for k, v := range m {
		switch val := v.(type) {
		case bool:
			if val {
				b.WriteString(" ")
				b.WriteString(k)
			}
		case string:
			b.WriteString(attrString(k, val))
		case float64:
			b.WriteString(attrString(k, fmt.Sprintf("%g", val)))
		case int:
			b.WriteString(attrString(k, fmt.Sprintf("%d", val)))
		default:
			b.WriteString(attrString(k, fmt.Sprint(val)))
		}
	}
	return b.String()
}

func mergeAria(attrs map[string]any, props map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range attrs {
		out[k] = v
	}
	if label, ok := props["ariaLabel"].(string); ok && label != "" {
		if _, exists := out["aria-label"]; !exists {
			out["aria-label"] = label
		}
	}
	return out
}

func propString(props map[string]any, key, fallback string) string {
	if v, ok := props[key]; ok {
		s := fmt.Sprint(v)
		if s != "" {
			return s
		}
	}
	return fallback
}

func propBool(props map[string]any, key string) bool {
	v, ok := props[key]
	if !ok {
		return false
	}
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return t == "true" || t == "1"
	default:
		return false
	}
}

func propInt(props map[string]any, key string, fallback int) int {
	v, ok := props[key]
	if !ok {
		return fallback
	}
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	default:
		return fallback
	}
}

func propSlice(props map[string]any, key string) []map[string]any {
	raw, ok := props[key]
	if !ok {
		return nil
	}
	arr, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(arr))
	for _, item := range arr {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

type indentWriter struct {
	buf    strings.Builder
	indent int
	depth  int
}

func newIndentWriter(indent int) *indentWriter {
	return &indentWriter{indent: indent}
}

func (w *indentWriter) WriteString(s string) {
	w.buf.WriteString(s)
}

func (w *indentWriter) Line(s string) {
	w.buf.WriteString(strings.Repeat(" ", w.depth*w.indent))
	w.buf.WriteString(s)
	w.buf.WriteByte('\n')
}

func (w *indentWriter) OpenTag(tag string) {
	w.Line(tag)
	w.depth++
}

func (w *indentWriter) CloseTag(tag string) {
	w.depth--
	w.Line(tag)
}

func (w *indentWriter) String() string {
	return w.buf.String()
}
