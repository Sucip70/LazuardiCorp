package staticgen

import (
	"encoding/json"
	"fmt"
)

// PageDocument is the normalized flat-map page JSON stored in the database.
type PageDocument struct {
	RootIDs []string                 `json:"rootIds"`
	Nodes   map[string]ComponentNode `json:"nodes"`
}

// ComponentNode matches the builder schema component node shape.
type ComponentNode struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	ParentID   *string                `json:"parentId"`
	Children   []string               `json:"children"`
	Props      map[string]any         `json:"props"`
	Attributes map[string]any         `json:"attributes"`
	Styles     StyleSet               `json:"styles"`
	Events     map[string]EventHandler `json:"events"`
	Meta       map[string]any         `json:"meta"`
}

type StyleSet struct {
	ClassName   string                       `json:"className"`
	CSS         map[string]string            `json:"css"`
	Breakpoints map[string]BreakpointStyles  `json:"breakpoints"`
}

type BreakpointStyles struct {
	ClassName string            `json:"className"`
	CSS       map[string]string `json:"css"`
	Hidden    *bool             `json:"hidden"`
}

type EventHandler struct {
	Action          string         `json:"action"`
	Payload         map[string]any `json:"payload"`
	ActionID        string         `json:"actionId"`
	PreventDefault  *bool          `json:"preventDefault"`
	StopPropagation *bool          `json:"stopPropagation"`
}

// PageMeta holds SEO metadata from the page record.
type PageMeta struct {
	Title       string
	Description string
	Keywords    []string
	OGImage     string
	Robots      string
	Canonical   string
}

// ThemeSettings from project settings JSON.
type ThemeSettings struct {
	PrimaryColor string
	FontFamily   string
	BorderRadius string
}

// ParseDocument unmarshals and normalizes page JSON from the database.
func ParseDocument(raw json.RawMessage) (*PageDocument, error) {
	if len(raw) == 0 {
		return &PageDocument{RootIDs: []string{}, Nodes: map[string]ComponentNode{}}, nil
	}

	var generic any
	if err := json.Unmarshal(raw, &generic); err != nil {
		return nil, fmt.Errorf("parse document: %w", err)
	}

	doc, err := normalizeInput(generic)
	if err != nil {
		return nil, err
	}
	return doc, nil
}

func normalizeInput(input any) (*PageDocument, error) {
	switch v := input.(type) {
	case nil:
		return &PageDocument{RootIDs: []string{}, Nodes: map[string]ComponentNode{}}, nil
	case []any:
		return normalizeTreeArray(v)
	case map[string]any:
		if _, hasRoot := v["rootIds"]; hasRoot {
			return normalizeFlatDocument(v)
		}
		if _, hasType := v["type"]; hasType {
			return normalizeSingleTree(v)
		}
	}
	return &PageDocument{RootIDs: []string{}, Nodes: map[string]ComponentNode{}}, nil
}

func normalizeFlatDocument(obj map[string]any) (*PageDocument, error) {
	rootIDs := toStringSlice(obj["rootIds"])
	nodesRaw, _ := obj["nodes"].(map[string]any)
	nodes := make(map[string]ComponentNode, len(nodesRaw))

	for id, raw := range nodesRaw {
		nodeMap, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		node, err := parseComponentNode(id, nodeMap)
		if err != nil {
			return nil, err
		}
		nodes[id] = node
	}

	return &PageDocument{RootIDs: rootIDs, Nodes: nodes}, nil
}

func normalizeTreeArray(items []any) (*PageDocument, error) {
	doc := &PageDocument{RootIDs: []string{}, Nodes: map[string]ComponentNode{}}
	for _, item := range items {
		nodeMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if err := appendTreeNode(doc, nodeMap, nil); err != nil {
			return nil, err
		}
	}
	return doc, nil
}

func normalizeSingleTree(obj map[string]any) (*PageDocument, error) {
	doc := &PageDocument{RootIDs: []string{}, Nodes: map[string]ComponentNode{}}
	if err := appendTreeNode(doc, obj, nil); err != nil {
		return nil, err
	}
	return doc, nil
}

func appendTreeNode(doc *PageDocument, raw map[string]any, parentID *string) error {
	node, err := parseComponentNode(firstString(raw["id"]), raw)
	if err != nil {
		return err
	}
	if node.ID == "" {
		node.ID = fmt.Sprintf("cmp_%s_%d", node.Type, len(doc.Nodes)+1)
	}
	node.ParentID = parentID
	node.Children = []string{}

	childIDs := []string{}
	if children, ok := raw["children"].([]any); ok {
		for _, child := range children {
			childMap, ok := child.(map[string]any)
			if !ok {
				continue
			}
			childID := firstString(childMap["id"])
			if childID == "" {
				childID = fmt.Sprintf("cmp_%s_%d", firstString(childMap["type"]), len(doc.Nodes)+1)
			}
			childIDs = append(childIDs, childID)
			if err := appendTreeNode(doc, childMap, &node.ID); err != nil {
				return err
			}
		}
	}
	node.Children = childIDs
	doc.Nodes[node.ID] = node
	if parentID == nil {
		doc.RootIDs = append(doc.RootIDs, node.ID)
	}
	return nil
}

func parseComponentNode(fallbackID string, raw map[string]any) (ComponentNode, error) {
	id := firstString(raw["id"])
	if id == "" {
		id = fallbackID
	}

	node := ComponentNode{
		ID:         id,
		Type:       firstString(raw["type"]),
		Children:   toStringSlice(raw["children"]),
		Props:      toAnyMap(raw["props"]),
		Attributes: toAnyMap(raw["attributes"]),
		Events:     parseEvents(raw["events"]),
		Meta:       toAnyMap(raw["meta"]),
	}

	if styles, ok := raw["styles"].(map[string]any); ok {
		node.Styles = parseStyleSet(styles)
	}
	mergeStyleProps(node.Props, &node.Styles)
	normalizeProps(node.Type, node.Props)

	if parent, ok := raw["parentId"].(string); ok && parent != "" {
		node.ParentID = &parent
	}

	return node, nil
}

func normalizeProps(componentType string, props map[string]any) {
	switch componentType {
	case "Text":
		if text, ok := props["text"].(string); ok {
			if _, has := props["content"]; !has {
				props["content"] = text
			}
		}
		if variant, ok := props["variant"].(string); ok {
			if _, has := props["as"]; !has {
				props["as"] = variant
			}
		}
	case "Button", "Link":
		if text, ok := props["text"].(string); ok {
			if _, has := props["label"]; !has {
				props["label"] = text
			}
		}
	}
}

func mergeStyleProps(props map[string]any, styles *StyleSet) {
	if className, ok := props["className"].(string); ok && className != "" {
		styles.ClassName = joinClasses(styles.ClassName, className)
		delete(props, "className")
	}
	if css, ok := props["style"].(map[string]any); ok {
		for k, v := range css {
			if styles.CSS == nil {
				styles.CSS = map[string]string{}
			}
			styles.CSS[k] = fmt.Sprint(v)
		}
		delete(props, "style")
	}
}

func parseStyleSet(raw map[string]any) StyleSet {
	set := StyleSet{
		ClassName: firstString(raw["className"]),
		CSS:       toCSSMap(raw["css"]),
	}
	if bp, ok := raw["breakpoints"].(map[string]any); ok {
		set.Breakpoints = map[string]BreakpointStyles{}
		for name, val := range bp {
			bpMap, ok := val.(map[string]any)
			if !ok {
				continue
			}
			bs := BreakpointStyles{
				ClassName: firstString(bpMap["className"]),
				CSS:       toCSSMap(bpMap["css"]),
			}
			if hidden, ok := bpMap["hidden"].(bool); ok {
				bs.Hidden = &hidden
			}
			set.Breakpoints[name] = bs
		}
	}
	return set
}

func parseEvents(raw any) map[string]EventHandler {
	out := map[string]EventHandler{}
	items, ok := raw.(map[string]any)
	if !ok {
		return out
	}
	for name, val := range items {
		m, ok := val.(map[string]any)
		if !ok {
			continue
		}
		out[name] = EventHandler{
			Action:   firstString(m["action"]),
			Payload:  toAnyMap(m["payload"]),
			ActionID: firstString(m["actionId"]),
		}
		if v, ok := m["preventDefault"].(bool); ok {
			h := out[name]
			h.PreventDefault = &v
			out[name] = h
		}
		if v, ok := m["stopPropagation"].(bool); ok {
			h := out[name]
			h.StopPropagation = &v
			out[name] = h
		}
	}
	return out
}

func ParsePageMeta(raw json.RawMessage) PageMeta {
	meta := PageMeta{}
	if len(raw) == 0 {
		return meta
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return meta
	}
	meta.Title = firstString(m["title"])
	meta.Description = firstString(m["description"])
	meta.OGImage = firstString(m["ogImage"])
	meta.Robots = firstString(m["robots"])
	meta.Canonical = firstString(m["canonicalUrl"])
	if kw, ok := m["keywords"].([]any); ok {
		for _, item := range kw {
			meta.Keywords = append(meta.Keywords, fmt.Sprint(item))
		}
	}
	return meta
}

func ParseThemeSettings(raw json.RawMessage) ThemeSettings {
	theme := ThemeSettings{
		FontFamily:   "Inter, system-ui, sans-serif",
		PrimaryColor: "#2563eb",
		BorderRadius: "0.5rem",
	}
	if len(raw) == 0 {
		return theme
	}
	var settings map[string]any
	if json.Unmarshal(raw, &settings) != nil {
		return theme
	}
	t, ok := settings["theme"].(map[string]any)
	if !ok {
		return theme
	}
	if v := firstString(t["fontFamily"]); v != "" {
		theme.FontFamily = v
	}
	if v := firstString(t["primaryColor"]); v != "" {
		theme.PrimaryColor = v
	}
	if v := firstString(t["borderRadius"]); v != "" {
		theme.BorderRadius = v
	}
	return theme
}

func toStringSlice(v any) []string {
	arr, ok := v.([]any)
	if !ok {
		if sarr, ok := v.([]string); ok {
			return sarr
		}
		return nil
	}
	out := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func toCSSMap(v any) map[string]string {
	m, ok := v.(map[string]any)
	if !ok {
		return map[string]string{}
	}
	out := make(map[string]string, len(m))
	for k, val := range m {
		out[k] = fmt.Sprint(val)
	}
	return out
}

func toAnyMap(v any) map[string]any {
	m, ok := v.(map[string]any)
	if !ok {
		return map[string]any{}
	}
	return m
}

func firstString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
