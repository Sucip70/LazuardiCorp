package staticgen

import (
	"fmt"
	"strings"
)

// Renderer walks a PageDocument and emits HTML fragments.
type Renderer struct {
	doc       *PageDocument
	css       *CSSBuilder
	events    *EventCollector
	pagePaths map[string]string
	current   string
}

func NewRenderer(doc *PageDocument, pagePaths map[string]string, currentPagePath string) *Renderer {
	return &Renderer{
		doc:       doc,
		css:       NewCSSBuilder(),
		events:    NewEventCollector(),
		pagePaths: pagePaths,
		current:   currentPagePath,
	}
}

func (r *Renderer) CSS() *CSSBuilder  { return r.css }
func (r *Renderer) Events() *EventCollector { return r.events }

func (r *Renderer) RenderBody() (string, error) {
	if r.doc == nil {
		return "", nil
	}
	var b strings.Builder
	for _, id := range r.doc.RootIDs {
		html, err := r.renderNode(id)
		if err != nil {
			return "", err
		}
		b.WriteString(html)
	}
	return b.String(), nil
}

func (r *Renderer) renderNode(id string) (string, error) {
	node, ok := r.doc.Nodes[id]
	if !ok {
		return "", fmt.Errorf("node not found: %s", id)
	}
	if hidden, ok := node.Meta["hidden"].(bool); ok && hidden {
		return "", nil
	}

	r.applyResponsiveVisibility(node)
	for domEvent, handler := range node.Events {
		r.events.Register(node.ID, domEvent, handler)
	}

	children, err := r.renderChildren(node.Children)
	if err != nil {
		return "", err
	}

	switch node.Type {
	case "Container":
		return r.renderContainer(node, children), nil
	case "Row":
		return r.renderRow(node, children), nil
	case "Column":
		return r.renderColumn(node, children), nil
	case "Section":
		return r.renderSection(node, children), nil
	case "Heading":
		return r.renderHeading(node), nil
	case "Paragraph", "Text":
		return r.renderParagraph(node), nil
	case "Span":
		return r.renderSpan(node), nil
	case "Image":
		return r.renderImage(node), nil
	case "Video":
		return r.renderVideo(node), nil
	case "Icon":
		return r.renderIcon(node), nil
	case "Button":
		return r.renderButton(node), nil
	case "Link":
		return r.renderLink(node, children), nil
	case "Form":
		return r.renderForm(node, children), nil
	case "Input":
		return r.renderInput(node), nil
	case "TextArea":
		return r.renderTextArea(node), nil
	case "Select":
		return r.renderSelect(node), nil
	case "Checkbox":
		return r.renderCheckbox(node), nil
	case "Radio":
		return r.renderRadio(node), nil
	case "Accordion":
		return r.renderAccordion(node), nil
	case "Tabs":
		return r.renderTabs(node, children), nil
	case "Navbar":
		return r.renderNavbar(node, children), nil
	case "Menu":
		return r.renderMenu(node), nil
	case "Breadcrumb":
		return r.renderBreadcrumb(node), nil
	case "Alert":
		return r.renderAlert(node), nil
	case "Modal":
		return r.renderModal(node, children), nil
	case "Toast":
		return r.renderToast(node), nil
	default:
		return r.renderUnknown(node, children), nil
	}
}

func (r *Renderer) renderChildren(ids []string) (string, error) {
	var b strings.Builder
	for _, id := range ids {
		html, err := r.renderNode(id)
		if err != nil {
			return "", err
		}
		b.WriteString(html)
	}
	return b.String(), nil
}

func (r *Renderer) openAttrs(node ComponentNode, tag string, extraClass string) string {
	attrs := mergeAria(node.Attributes, node.Props)
	className := r.resolveClasses(node, extraClass)
	style := inlineCSS(node.Styles.CSS)
	var b strings.Builder
	b.WriteString("<")
	b.WriteString(tag)
	b.WriteString(` data-node-id="`)
	b.WriteString(escapeAttr(node.ID))
	b.WriteString(`"`)
	if className != "" {
		b.WriteString(` class="`)
		b.WriteString(escapeAttr(className))
		b.WriteString(`"`)
	}
	if style != "" {
		b.WriteString(` style="`)
		b.WriteString(escapeAttr(style))
		b.WriteString(`"`)
	}
	b.WriteString(attrsFromMap(attrs))
	for domEvent := range node.Events {
		b.WriteString(r.eventAttrs(node.ID, domEvent))
	}
	return b.String()
}

func (r *Renderer) eventAttrs(nodeID, domEvent string) string {
	return fmt.Sprintf(` data-laz-event="%s"`, escapeAttr(domEventToJS(domEvent)))
}

func (r *Renderer) resolveHref(href string) string {
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(href, "http") || strings.HasPrefix(href, "mailto:") {
		return href
	}
	path := href
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if file, ok := r.pagePaths[path]; ok {
		return relativeHTMLPath(r.current, file)
	}
	return href
}

func relativeHTMLPath(fromPagePath, targetHTMLFile string) string {
	fromFile := PagePathToHTMLFile(fromPagePath)
	fromDir := pathDir(fromFile)
	if fromDir == "" {
		return targetHTMLFile
	}
	depth := strings.Count(fromDir, "/") + 1
	return strings.Repeat("../", depth) + targetHTMLFile
}

func (r *Renderer) resolveAssetSrc(src string) string {
	if src == "" || strings.HasPrefix(src, "http") || strings.HasPrefix(src, "data:") || strings.HasPrefix(src, "#") {
		return src
	}
	if strings.HasPrefix(src, "assets/") {
		fromFile := PagePathToHTMLFile(r.current)
		depth := htmlFileDepth(fromFile)
		return PrefixAssetPaths(src, depth)
	}
	return src
}

func pathDir(htmlFile string) string {
	idx := strings.LastIndex(htmlFile, "/")
	if idx <= 0 {
		return ""
	}
	return htmlFile[:idx]
}

// ─── Layout ─────────────────────────────────────────────────

func (r *Renderer) renderContainer(node ComponentNode, children string) string {
	tag := propString(node.Props, "tag", "div")
	layout := propString(node.Props, "layout", "block")
	extra := maxWidthClass(propString(node.Props, "maxWidth", "lg"))
	if tag == "div" {
		extra = joinClasses("mx-auto w-full", extra)
	}
	switch layout {
	case "flex":
		extra = joinClasses(extra, "flex flex-col gap-2")
	case "grid":
		extra = joinClasses(extra, "grid gap-2")
	}
	return fmt.Sprintf("%s>%s</%s>\n", r.openAttrs(node, tag, extra), children, tag)
}

func (r *Renderer) renderRow(node ComponentNode, children string) string {
	return fmt.Sprintf("%s>%s</div>\n", r.openAttrs(node, "div", layoutClasses(node.Props, "row")), children)
}

func (r *Renderer) renderColumn(node ComponentNode, children string) string {
	return fmt.Sprintf("%s>%s</div>\n", r.openAttrs(node, "div", layoutClasses(node.Props, "col")), children)
}

func (r *Renderer) renderSection(node ComponentNode, children string) string {
	title := propString(node.Props, "title", "")
	subtitle := propString(node.Props, "subtitle", "")
	titleID := fmt.Sprintf("section-title-%s", node.ID)
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "section", ""))
	if title != "" {
		b.WriteString(fmt.Sprintf(` aria-labelledby="%s"`, titleID))
	}
	b.WriteString(">\n")
	if title != "" {
		b.WriteString(fmt.Sprintf(`  <h2 id="%s" class="text-xl font-semibold text-gray-900">%s</h2>`+"\n", titleID, escape(title)))
	}
	if subtitle != "" {
		b.WriteString(fmt.Sprintf(`  <p class="text-sm text-gray-600">%s</p>`+"\n", escape(subtitle)))
	}
	b.WriteString(`  <div class="mt-4">`)
	b.WriteString(children)
	b.WriteString("</div>\n</section>\n")
	return b.String()
}

// ─── Typography ─────────────────────────────────────────────

func (r *Renderer) renderHeading(node ComponentNode) string {
	level := propInt(node.Props, "level", 2)
	text := propString(node.Props, "text", propString(node.Props, "content", ""))
	tag := fmt.Sprintf("h%d", clampHeading(level))
	id := propString(node.Props, "id", "")
	extra := id
	if extra != "" {
		node.Attributes["id"] = id
	}
	return fmt.Sprintf("%s>%s</%s>\n", r.openAttrs(node, tag, ""), escape(text), tag)
}

func clampHeading(level int) int {
	if level < 1 {
		return 1
	}
	if level > 6 {
		return 6
	}
	return level
}

func (r *Renderer) renderParagraph(node ComponentNode) string {
	as := propString(node.Props, "as", "p")
	text := propString(node.Props, "text", propString(node.Props, "content", ""))
	size := propString(node.Props, "size", "base")
	sizeClass := "text-base"
	switch size {
	case "sm":
		sizeClass = "text-sm"
	case "lg":
		sizeClass = "text-lg"
	}
	tag := as
	if tag == "" {
		tag = "p"
	}
	return fmt.Sprintf("%s>%s</%s>\n", r.openAttrs(node, tag, sizeClass), escape(text), tag)
}

func (r *Renderer) renderSpan(node ComponentNode) string {
	text := propString(node.Props, "text", "")
	weight := ""
	switch propString(node.Props, "weight", "") {
	case "bold":
		weight = "font-bold"
	case "medium":
		weight = "font-medium"
	}
	color := ""
	switch propString(node.Props, "color", "") {
	case "muted":
		color = "text-gray-500"
	case "primary":
		color = "text-blue-600"
	}
	return fmt.Sprintf("%s>%s</span>\n", r.openAttrs(node, "span", joinClasses(weight, color)), escape(text))
}

// ─── Media ────────────────────────────────────────────────────

func (r *Renderer) renderImage(node ComponentNode) string {
	src := propString(node.Props, "src", "")
	if ref := propString(node.Props, "assetId", ""); src == "" && ref != "" {
		src = ref // unresolved fallback; export rewrite should set src
	}
	src = r.resolveAssetSrc(src)
	alt := propString(node.Props, "alt", "")
	fit := "object-cover"
	if propString(node.Props, "objectFit", "") == "contain" {
		fit = "object-contain"
	}
	open := strings.TrimSuffix(r.openAttrs(node, "img", fit), ">")
	var extra strings.Builder
	if w := propString(node.Props, "width", ""); w != "" {
		extra.WriteString(fmt.Sprintf(` width="%s"`, escapeAttr(w)))
	}
	if h := propString(node.Props, "height", ""); h != "" {
		extra.WriteString(fmt.Sprintf(` height="%s"`, escapeAttr(h)))
	}
	return fmt.Sprintf(`%s src="%s" alt="%s" loading="lazy"%s />`+"\n",
		open, escapeAttr(src), escapeAttr(alt), extra.String())
}

func (r *Renderer) renderVideo(node ComponentNode) string {
	src := propString(node.Props, "src", "")
	poster := propString(node.Props, "poster", "")
	controls := true
	if v, ok := node.Props["controls"].(bool); ok && !v {
		controls = false
	}
	open := r.openAttrs(node, "video", "")
	var b strings.Builder
	b.WriteString(open)
	b.WriteString(` src="`)
	b.WriteString(escapeAttr(src))
	b.WriteString(`"`)
	if poster != "" {
		b.WriteString(` poster="`)
		b.WriteString(escapeAttr(poster))
		b.WriteString(`"`)
	}
	if controls {
		b.WriteString(" controls")
	}
	if propBool(node.Props, "muted") {
		b.WriteString(" muted")
	}
	if propBool(node.Props, "loop") {
		b.WriteString(" loop")
	}
	b.WriteString("></video>\n")
	return b.String()
}

func (r *Renderer) renderIcon(node ComponentNode) string {
	name := propString(node.Props, "name", "info")
	label := propString(node.Props, "label", "Icon")
	size := "h-8 w-8 text-base"
	switch propString(node.Props, "size", "") {
	case "sm":
		size = "h-6 w-6 text-sm"
	case "lg":
		size = "h-10 w-10 text-lg"
	}
	return fmt.Sprintf(`%s role="img" aria-label="%s">%s</span>`+"\n",
		r.openAttrs(node, "span", joinClasses("inline-flex items-center justify-center", size)),
		escapeAttr(label), iconGlyph(name))
}

// ─── Interactive ──────────────────────────────────────────────

func (r *Renderer) renderButton(node ComponentNode) string {
	label := propString(node.Props, "label", "Button")
	variant := buttonVariantClasses(propString(node.Props, "variant", "primary"))
	size := buttonSizeClasses(propString(node.Props, "size", "md"))
	btnType := propString(node.Props, "type", "button")
	open := r.openAttrs(node, "button", joinClasses(variant, size, "rounded-lg font-medium"))
	open = strings.TrimSuffix(open, ">")
	if propBool(node.Props, "disabled") {
		open += " disabled"
	}
	return fmt.Sprintf(`%s type="%s">%s</button>`+"\n", open, escapeAttr(btnType), escape(label))
}

func (r *Renderer) renderLink(node ComponentNode, children string) string {
	href := r.resolveHref(propString(node.Props, "href", "#"))
	target := propString(node.Props, "target", "_self")
	label := propString(node.Props, "label", "Link")
	underline := "underline"
	if propBool(node.Props, "underline") == false {
		underline = "no-underline"
	}
	content := children
	if content == "" {
		content = escape(label)
	}
	open := r.openAttrs(node, "a", joinClasses("text-blue-600 hover:underline", underline))
	open = strings.TrimSuffix(open, ">")
	open += fmt.Sprintf(` href="%s"`, escapeAttr(href))
	if target == "_blank" {
		open += ` target="_blank" rel="noopener noreferrer"`
	}
	result := fmt.Sprintf("%s>%s</a>\n", open, content)
	if target == "_blank" {
		result = strings.Replace(result, "</a>", `<span class="sr-only"> (opens in new tab)</span></a>`+"\n", 1)
	}
	return result
}

func (r *Renderer) renderForm(node ComponentNode, children string) string {
	method := propString(node.Props, "method", "post")
	action := propString(node.Props, "action", "")
	open := r.openAttrs(node, "form", "flex flex-col gap-3")
	open = strings.TrimSuffix(open, ">")
	return fmt.Sprintf(`%s method="%s" action="%s">%s</form>`+"\n", open, escapeAttr(method), escapeAttr(action), children)
}

// ─── Forms ────────────────────────────────────────────────────

func (r *Renderer) renderInput(node ComponentNode) string {
	label := propString(node.Props, "label", "Label")
	name := propString(node.Props, "name", "field")
	inputType := propString(node.Props, "inputType", "text")
	placeholder := propString(node.Props, "placeholder", "")
	defaultValue := propString(node.Props, "defaultValue", "")
	helper := propString(node.Props, "helperText", "")
	inputID := "input-" + node.ID
	helperID := "helper-" + node.ID

	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", ""))
	b.WriteString(">\n")
	b.WriteString(fmt.Sprintf(`  <label for="%s" class="laz-label">%s</label>`+"\n", inputID, escape(label)))
	b.WriteString(fmt.Sprintf(`  <input id="%s" name="%s" type="%s" class="laz-field"`, inputID, escapeAttr(name), escapeAttr(inputType)))
	if placeholder != "" {
		b.WriteString(fmt.Sprintf(` placeholder="%s"`, escapeAttr(placeholder)))
	}
	if defaultValue != "" {
		b.WriteString(fmt.Sprintf(` value="%s"`, escapeAttr(defaultValue)))
	}
	if propBool(node.Props, "required") {
		b.WriteString(" required")
	}
	if propBool(node.Props, "disabled") {
		b.WriteString(" disabled")
	}
	if helper != "" {
		b.WriteString(fmt.Sprintf(` aria-describedby="%s"`, helperID))
	}
	b.WriteString(" />\n")
	if helper != "" {
		b.WriteString(fmt.Sprintf(`  <p id="%s" class="laz-helper">%s</p>`+"\n", helperID, escape(helper)))
	}
	b.WriteString("</div>\n")
	return b.String()
}

func (r *Renderer) renderTextArea(node ComponentNode) string {
	label := propString(node.Props, "label", "Label")
	name := propString(node.Props, "name", "field")
	rows := propInt(node.Props, "rows", 4)
	inputID := "textarea-" + node.ID
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", ""))
	b.WriteString(">\n")
	b.WriteString(fmt.Sprintf(`  <label for="%s" class="laz-label">%s</label>`+"\n", inputID, escape(label)))
	b.WriteString(fmt.Sprintf(`  <textarea id="%s" name="%s" rows="%d" class="laz-field"`, inputID, escapeAttr(name), rows))
	if propBool(node.Props, "required") {
		b.WriteString(" required")
	}
	if propBool(node.Props, "disabled") {
		b.WriteString(" disabled")
	}
	b.WriteString(">")
	b.WriteString(escape(propString(node.Props, "defaultValue", "")))
	b.WriteString("</textarea>\n</div>\n")
	return b.String()
}

func (r *Renderer) renderSelect(node ComponentNode) string {
	label := propString(node.Props, "label", "Label")
	name := propString(node.Props, "name", "field")
	options := propSlice(node.Props, "options")
	inputID := "select-" + node.ID
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", ""))
	b.WriteString(">\n")
	b.WriteString(fmt.Sprintf(`  <label for="%s" class="laz-label">%s</label>`+"\n", inputID, escape(label)))
	b.WriteString(fmt.Sprintf(`  <select id="%s" name="%s" class="laz-field"`, inputID, escapeAttr(name)))
	if propBool(node.Props, "required") {
		b.WriteString(" required")
	}
	b.WriteString(">\n")
	if ph := propString(node.Props, "placeholder", ""); ph != "" {
		b.WriteString(fmt.Sprintf(`    <option value="">%s</option>`+"\n", escape(ph)))
	}
	for _, opt := range options {
		val := propString(opt, "value", "")
		lbl := propString(opt, "label", val)
		b.WriteString(fmt.Sprintf(`    <option value="%s">%s</option>`+"\n", escapeAttr(val), escape(lbl)))
	}
	b.WriteString("  </select>\n</div>\n")
	return b.String()
}

func (r *Renderer) renderCheckbox(node ComponentNode) string {
	label := propString(node.Props, "label", "Checkbox")
	name := propString(node.Props, "name", "checkbox")
	inputID := "checkbox-" + node.ID
	open := r.openAttrs(node, "div", "flex items-start gap-2")
	var b strings.Builder
	b.WriteString(open)
	b.WriteString(">\n")
	b.WriteString(fmt.Sprintf(`  <input id="%s" type="checkbox" name="%s" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"`, inputID, escapeAttr(name)))
	if propBool(node.Props, "checked") {
		b.WriteString(" checked")
	}
	if propBool(node.Props, "disabled") {
		b.WriteString(" disabled")
	}
	b.WriteString(" />\n")
	b.WriteString(fmt.Sprintf(`  <label for="%s" class="text-sm text-gray-700">%s</label>`+"\n", inputID, escape(label)))
	b.WriteString("</div>\n")
	return b.String()
}

func (r *Renderer) renderRadio(node ComponentNode) string {
	legend := propString(node.Props, "legend", "Choose one")
	name := propString(node.Props, "name", "radio")
	options := propSlice(node.Props, "options")
	horizontal := propString(node.Props, "orientation", "") == "horizontal"
	flexDir := "flex-col gap-2"
	if horizontal {
		flexDir = "flex-row gap-4"
	}
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "fieldset", ""))
	b.WriteString(">\n")
	b.WriteString(fmt.Sprintf(`  <legend class="text-sm font-medium text-gray-700">%s</legend>`+"\n", escape(legend)))
	b.WriteString(fmt.Sprintf(`  <div class="mt-2 flex %s">`+"\n", flexDir))
	defaultVal := propString(node.Props, "defaultValue", "")
	for _, opt := range options {
		val := propString(opt, "value", "")
		lbl := propString(opt, "label", val)
		id := fmt.Sprintf("%s-%s", name, val)
		b.WriteString(`    <div class="flex items-center gap-2">` + "\n")
		b.WriteString(fmt.Sprintf(`      <input id="%s" type="radio" name="%s" value="%s"`, id, escapeAttr(name), escapeAttr(val)))
		if val == defaultVal {
			b.WriteString(" checked")
		}
		b.WriteString(" />\n")
		b.WriteString(fmt.Sprintf(`      <label for="%s" class="text-sm text-gray-700">%s</label>`+"\n", id, escape(lbl)))
		b.WriteString("    </div>\n")
	}
	b.WriteString("  </div>\n</fieldset>\n")
	return b.String()
}

// ─── Composite ────────────────────────────────────────────────

func (r *Renderer) renderAccordion(node ComponentNode) string {
	items := propSlice(node.Props, "items")
	allowMultiple := propBool(node.Props, "allowMultiple")
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", ""))
	b.WriteString(">\n")
	for _, item := range items {
		id := propString(item, "id", "")
		title := propString(item, "title", "")
		content := propString(item, "content", "")
		b.WriteString(`  <details class="group border-b border-gray-200 p-4"`)
		if !allowMultiple {
			b.WriteString(` name="accordion"`)
		}
		b.WriteString(">\n")
		b.WriteString(fmt.Sprintf(`    <summary class="cursor-pointer font-medium text-gray-900">%s</summary>`+"\n", escape(title)))
		b.WriteString(fmt.Sprintf(`    <p class="mt-2 text-sm text-gray-600">%s</p>`+"\n", escape(content)))
		b.WriteString("  </details>\n")
		_ = id
	}
	b.WriteString("</div>\n")
	return b.String()
}

func (r *Renderer) renderTabs(node ComponentNode, children string) string {
	items := propSlice(node.Props, "items")
	activeID := propString(node.Props, "activeTabId", "")
	if activeID == "" && len(items) > 0 {
		activeID = propString(items[0], "id", "tab-0")
	}
	vertical := propString(node.Props, "orientation", "") == "vertical"
	rootClass := ""
	if vertical {
		rootClass = "flex gap-4"
	}
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", rootClass))
	b.WriteString(` data-laz-tabs="true">` + "\n")
	tablistClass := "flex flex-row gap-2 border-b border-gray-200"
	if vertical {
		tablistClass = "flex flex-col gap-1"
	}
	b.WriteString(fmt.Sprintf(`  <div role="tablist" aria-orientation="%s" class="%s">`+"\n",
		map[bool]string{true: "vertical", false: "horizontal"}[vertical], tablistClass))
	for _, item := range items {
		id := propString(item, "id", "")
		label := propString(item, "label", id)
		active := id == activeID
		activeClass := ""
		if active {
			activeClass = " laz-tab-active"
		}
		selected := "false"
		if active {
			selected = "true"
		}
		b.WriteString(fmt.Sprintf(`    <button type="button" role="tab" id="tab-%s" data-tab-id="%s" aria-selected="%s" aria-controls="panel-%s" class="px-3 py-2 text-sm focus:outline-none%s">%s</button>`+"\n",
			id, id, selected, id, activeClass, escape(label)))
	}
	b.WriteString("  </div>\n")
	b.WriteString(fmt.Sprintf(`  <div role="tabpanel" id="panel-%s" aria-labelledby="tab-%s" class="mt-4">`+"\n", activeID, activeID))
	b.WriteString(children)
	b.WriteString("\n  </div>\n</div>\n")
	return b.String()
}

func (r *Renderer) renderNavbar(node ComponentNode, children string) string {
	brand := propString(node.Props, "brand", "Brand")
	brandHref := r.resolveHref(propString(node.Props, "brandHref", "/"))
	links := propSlice(node.Props, "links")
	sticky := ""
	if propBool(node.Props, "sticky") {
		sticky = "sticky top-0 z-40"
	}
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "nav", sticky))
	b.WriteString(` aria-label="Main navigation">` + "\n")
	b.WriteString(`  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">` + "\n")
	b.WriteString(fmt.Sprintf(`    <a href="%s" class="text-lg font-semibold text-gray-900">%s</a>`+"\n", escapeAttr(brandHref), escape(brand)))
	b.WriteString(`    <button type="button" class="rounded p-2 text-gray-600 md:hidden" data-laz-nav-toggle aria-label="Toggle menu">☰</button>` + "\n")
	b.WriteString(`    <ul class="hidden items-center gap-4 md:flex" data-laz-nav-menu>` + "\n")
	for _, link := range links {
		href := r.resolveHref(propString(link, "href", "#"))
		lbl := propString(link, "label", "")
		b.WriteString(fmt.Sprintf(`      <li><a href="%s" class="text-sm text-gray-600 hover:text-gray-900">%s</a></li>`+"\n", escapeAttr(href), escape(lbl)))
	}
	b.WriteString("    </ul>\n  </div>\n")
	b.WriteString(children)
	b.WriteString("\n</nav>\n")
	return b.String()
}

func (r *Renderer) renderMenu(node ComponentNode) string {
	items := propSlice(node.Props, "items")
	label := propString(node.Props, "label", "Menu")
	horizontal := propString(node.Props, "orientation", "") == "horizontal"
	flexDir := "flex-col gap-1"
	if horizontal {
		flexDir = "flex-row gap-2"
	}
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "nav", ""))
	b.WriteString(fmt.Sprintf(` aria-label="%s">`+"\n", escapeAttr(label)))
	b.WriteString(fmt.Sprintf(`  <ul class="flex %s" role="menu">`+"\n", flexDir))
	for _, item := range items {
		href := r.resolveHref(propString(item, "href", "#"))
		lbl := propString(item, "label", "")
		b.WriteString(fmt.Sprintf(`    <li role="none"><a href="%s" role="menuitem" class="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">%s</a></li>`+"\n",
			escapeAttr(href), escape(lbl)))
	}
	b.WriteString("  </ul>\n</nav>\n")
	return b.String()
}

func (r *Renderer) renderBreadcrumb(node ComponentNode) string {
	items := propSlice(node.Props, "items")
	label := propString(node.Props, "ariaLabel", "Breadcrumb")
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "nav", ""))
	b.WriteString(fmt.Sprintf(` aria-label="%s">`+"\n", escapeAttr(label)))
	b.WriteString(`  <ol class="flex flex-wrap items-center gap-2">` + "\n")
	for i, item := range items {
		lbl := propString(item, "label", "")
		href := propString(item, "href", "")
		isLast := i == len(items)-1
		b.WriteString(`    <li class="flex items-center gap-2">` + "\n")
		if i > 0 {
			b.WriteString(`      <span aria-hidden="true">/</span>` + "\n")
		}
		if href != "" && !isLast {
			b.WriteString(fmt.Sprintf(`      <a href="%s" class="hover:text-gray-900">%s</a>`+"\n", escapeAttr(r.resolveHref(href)), escape(lbl)))
		} else {
			current := ""
			if isLast {
				current = ` aria-current="page"`
			}
			b.WriteString(fmt.Sprintf(`      <span%s>%s</span>`+"\n", current, escape(lbl)))
		}
		b.WriteString("    </li>\n")
	}
	b.WriteString("  </ol>\n</nav>\n")
	return b.String()
}

// ─── Feedback ─────────────────────────────────────────────────

func (r *Renderer) renderAlert(node ComponentNode) string {
	title := propString(node.Props, "title", "")
	message := propString(node.Props, "message", "")
	variant := alertVariantClasses(propString(node.Props, "variant", "info"))
	var b strings.Builder
	b.WriteString(r.openAttrs(node, "div", joinClasses("rounded-lg border p-4", variant)))
	b.WriteString(` role="alert" aria-live="polite">` + "\n")
	if title != "" {
		b.WriteString(fmt.Sprintf(`  <p class="font-semibold">%s</p>`+"\n", escape(title)))
	}
	b.WriteString(fmt.Sprintf(`  <p class="text-sm">%s</p>`+"\n", escape(message)))
	if propBool(node.Props, "dismissible") {
		b.WriteString(`  <button type="button" class="mt-2 text-sm underline" data-laz-dismiss aria-label="Dismiss alert">Dismiss</button>` + "\n")
	}
	b.WriteString("</div>\n")
	return b.String()
}

func (r *Renderer) renderModal(node ComponentNode, children string) string {
	if v, ok := node.Props["open"].(bool); ok && !v {
		return ""
	}
	title := propString(node.Props, "title", "Modal")
	description := propString(node.Props, "description", "")
	closeLabel := propString(node.Props, "closeLabel", "Close dialog")
	titleID := "modal-title-" + node.ID
	descID := "modal-desc-" + node.ID
	var b strings.Builder
	b.WriteString(`<div class="laz-modal-backdrop" role="presentation">` + "\n")
	b.WriteString(r.openAttrs(node, "div", "laz-modal-panel"))
	b.WriteString(` role="dialog" aria-modal="true"`)
	b.WriteString(fmt.Sprintf(` aria-labelledby="%s"`, titleID))
	if description != "" {
		b.WriteString(fmt.Sprintf(` aria-describedby="%s"`, descID))
	}
	b.WriteString(">\n")
	b.WriteString(`  <div class="flex items-start justify-between gap-4">` + "\n")
	b.WriteString(fmt.Sprintf(`    <h2 id="%s" class="text-lg font-semibold text-gray-900">%s</h2>`+"\n", titleID, escape(title)))
	b.WriteString(fmt.Sprintf(`    <button type="button" class="rounded p-1 text-gray-500 hover:bg-gray-100" data-laz-modal-close aria-label="%s">×</button>`+"\n", escapeAttr(closeLabel)))
	b.WriteString("  </div>\n")
	if description != "" {
		b.WriteString(fmt.Sprintf(`  <p id="%s" class="mt-2 text-sm text-gray-600">%s</p>`+"\n", descID, escape(description)))
	}
	b.WriteString(`  <div class="mt-4">`)
	b.WriteString(children)
	b.WriteString("</div>\n</div>\n</div>\n")
	return b.String()
}

func (r *Renderer) renderToast(node ComponentNode) string {
	if v, ok := node.Props["visible"].(bool); ok && !v {
		return ""
	}
	message := propString(node.Props, "message", "")
	variant := alertVariantClasses(propString(node.Props, "variant", "info"))
	return fmt.Sprintf(`%s role="status" aria-live="polite">%s</div>`+"\n",
		r.openAttrs(node, "div", joinClasses("rounded-lg border p-4", variant)), escape(message))
}

func (r *Renderer) renderUnknown(node ComponentNode, children string) string {
	tag := "div"
	if acceptsChildrenByDefault(node.Type) {
		return fmt.Sprintf(`%s data-component-type="%s">%s</%s>`+"\n",
			r.openAttrs(node, tag, ""), escapeAttr(node.Type), children, tag)
	}
	return fmt.Sprintf(`<!-- Unknown component: %s -->`+"\n", escape(node.Type))
}

func acceptsChildrenByDefault(componentType string) bool {
	switch componentType {
	case "Container", "Row", "Column", "Section", "Link", "Form", "Tabs", "Navbar", "Modal":
		return true
	default:
		return false
	}
}
