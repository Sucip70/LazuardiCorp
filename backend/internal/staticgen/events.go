package staticgen

import (
	"fmt"
	"strings"
)

// EventCollector gathers DOM event bindings emitted into main.js.
type EventCollector struct {
	handlers []eventBinding
}

type eventBinding struct {
	NodeID    string
	DOMEvent  string
	Action    string
	Payload   map[string]any
	Prevent   bool
	StopProp  bool
}

func NewEventCollector() *EventCollector {
	return &EventCollector{}
}

func (c *EventCollector) Register(nodeID, domEvent string, handler EventHandler) {
	prevent := true
	if handler.PreventDefault != nil {
		prevent = *handler.PreventDefault
	}
	stop := false
	if handler.StopPropagation != nil {
		stop = *handler.StopPropagation
	}
	c.handlers = append(c.handlers, eventBinding{
		NodeID:   nodeID,
		DOMEvent: domEventToJS(domEvent),
		Action:   handler.Action,
		Payload:  handler.Payload,
		Prevent:  prevent,
		StopProp: stop,
	})
}

func domEventToJS(name string) string {
	switch name {
	case "onClick":
		return "click"
	case "onChange":
		return "change"
	case "onSubmit":
		return "submit"
	case "onFocus":
		return "focus"
	case "onBlur":
		return "blur"
	default:
		return strings.TrimPrefix(name, "on")
	}
}

func (c *EventCollector) DataAttributes(nodeID, domEvent string) string {
	for _, h := range c.handlers {
		if h.NodeID == nodeID && h.DOMEvent == domEventToJS(domEvent) {
			return fmt.Sprintf(` data-laz-event="%s"`, escapeAttr(domEventToJS(domEvent)))
		}
	}
	return ""
}

func (c *EventCollector) HasHandlers() bool {
	return len(c.handlers) > 0
}

func (c *EventCollector) GenerateJS(pagePaths map[string]string) string {
	var b strings.Builder
	b.WriteString(baseMainJS)
	b.WriteString("\n\n(function () {\n")
	b.WriteString("  const pageMap = ")
	b.WriteString(mustJSON(pagePaths))
	b.WriteString(";\n\n")
	b.WriteString("  function resolveHref(href) {\n")
	b.WriteString("    if (!href || href.startsWith('#') || href.startsWith('http')) return href;\n")
	b.WriteString("    const path = href.startsWith('/') ? href : '/' + href;\n")
	b.WriteString("    return pageMap[path] || href;\n")
	b.WriteString("  }\n\n")
	b.WriteString("  if (typeof LAZ_EVENTS !== 'object' || !LAZ_EVENTS) return;\n\n")
	b.WriteString("  document.querySelectorAll('[data-laz-event]').forEach(function (el) {\n")
	b.WriteString("    const nodeId = el.getAttribute('data-node-id');\n")
	b.WriteString("    const eventName = el.getAttribute('data-laz-event');\n")
	b.WriteString("    if (!nodeId || !eventName) return;\n\n")
	b.WriteString("    el.addEventListener(eventName, function (e) {\n")
	b.WriteString("      const cfg = LAZ_EVENTS[nodeId] && LAZ_EVENTS[nodeId][eventName];\n")
	b.WriteString("      if (!cfg) return;\n")
	b.WriteString("      if (cfg.preventDefault) e.preventDefault();\n")
	b.WriteString("      if (cfg.stopPropagation) e.stopPropagation();\n\n")
	b.WriteString("      switch (cfg.action) {\n")
	b.WriteString("        case 'navigate':\n")
	b.WriteString("          window.location.href = resolveHref(cfg.payload.href || '/');\n")
	b.WriteString("          break;\n")
	b.WriteString("        case 'openUrl':\n")
	b.WriteString("          window.open(cfg.payload.url || cfg.payload.href || '#', cfg.payload.target || '_blank');\n")
	b.WriteString("          break;\n")
	b.WriteString("        case 'scrollTo':\n")
	b.WriteString("          { const target = document.querySelector(cfg.payload.selector || cfg.payload.elementId || '');\n")
	b.WriteString("            if (target) target.scrollIntoView({ behavior: 'smooth' }); }\n")
	b.WriteString("          break;\n")
	b.WriteString("        case 'toggleVisibility':\n")
	b.WriteString("          { const target = document.querySelector(cfg.payload.selector || '');\n")
	b.WriteString("            if (target) target.classList.toggle('laz-hidden'); }\n")
	b.WriteString("          break;\n")
	b.WriteString("        case 'runScript':\n")
	b.WriteString("          if (cfg.payload.code) { try { eval(cfg.payload.code); } catch (err) { console.error(err); } }\n")
	b.WriteString("          break;\n")
	b.WriteString("        default:\n")
	b.WriteString("          console.log('Unhandled action', cfg.action, cfg.payload);\n")
	b.WriteString("      }\n")
	b.WriteString("    });\n")
	b.WriteString("  });\n")
	b.WriteString("})();\n")
	return b.String()
}

func (c *EventCollector) EventsJSON() string {
	root := map[string]map[string]map[string]any{}
	for _, h := range c.handlers {
		if root[h.NodeID] == nil {
			root[h.NodeID] = map[string]map[string]any{}
		}
		root[h.NodeID][h.DOMEvent] = map[string]any{
			"action":           h.Action,
			"payload":          h.Payload,
			"preventDefault":   h.Prevent,
			"stopPropagation":  h.StopProp,
		}
	}
	return mustJSON(root)
}

func mustJSON(v any) string {
	b, err := jsonMarshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}
