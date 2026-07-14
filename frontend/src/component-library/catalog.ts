import type { ComponentCatalogEntry } from './types/catalog'
import { EVENT_PRESETS } from './types/catalog'

const layoutFields = [
  { key: 'gap', label: 'Gap', type: 'select' as const, group: 'layout' as const, options: [
    { label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' },
  ]},
  { key: 'padding', label: 'Padding', type: 'select' as const, group: 'layout' as const, options: [
    { label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' },
  ]},
  { key: 'align', label: 'Align items', type: 'select' as const, group: 'layout' as const, options: [
    { label: 'Start', value: 'start' }, { label: 'Center', value: 'center' }, { label: 'End', value: 'end' }, { label: 'Stretch', value: 'stretch' },
  ]},
  { key: 'justify', label: 'Justify content', type: 'select' as const, group: 'layout' as const, options: [
    { label: 'Start', value: 'start' }, { label: 'Center', value: 'center' }, { label: 'End', value: 'end' }, { label: 'Between', value: 'between' },
  ]},
  { key: 'className', label: 'Tailwind classes', type: 'className' as const, group: 'style' as const, responsive: true },
  { key: 'ariaLabel', label: 'ARIA label', type: 'text' as const, group: 'accessibility' as const },
]

export const COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  // ─── Layout ───────────────────────────────────────────────
  {
    type: 'Container',
    label: 'Container',
    category: 'layout',
    description: 'Generic wrapper with max-width and padding.',
    icon: '▢',
    acceptsChildren: true,
    defaultProps: { tag: 'div', maxWidth: 'lg', gap: 'md', padding: 'md', ariaLabel: 'Content container' },
    defaultStyles: {
      className: 'mx-auto w-full max-w-5xl rounded-lg border border-dashed border-gray-200',
      breakpoints: {
        mobile: { className: 'px-3 py-3' },
        tablet: { className: 'px-5 py-4' },
        desktop: { className: 'px-6 py-5' },
      },
    },
    editableFields: [
      { key: 'maxWidth', label: 'Max width', type: 'select', group: 'layout', options: [
        { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }, { label: 'Full', value: 'full' },
      ]},
      ...layoutFields,
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Use ariaLabel when the container has a semantic purpose beyond generic grouping.'],
  },
  {
    type: 'Row',
    label: 'Row',
    category: 'layout',
    description: 'Horizontal flex row; stacks on mobile by default.',
    icon: '↔',
    acceptsChildren: true,
    defaultProps: { gap: 'md', align: 'stretch', justify: 'start', wrap: false },
    defaultStyles: {
      className: 'flex w-full',
      breakpoints: {
        mobile: { className: 'flex-col gap-3' },
        tablet: { className: 'flex-row gap-4' },
        desktop: { className: 'flex-row gap-4' },
      },
    },
    editableFields: [
      { key: 'wrap', label: 'Wrap items', type: 'boolean', group: 'layout' },
      ...layoutFields,
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['On mobile, row content stacks vertically for readability.'],
  },
  {
    type: 'Column',
    label: 'Column',
    category: 'layout',
    description: 'Vertical flex column.',
    icon: '↕',
    acceptsChildren: true,
    defaultProps: { gap: 'md', align: 'stretch', justify: 'start' },
    defaultStyles: { className: 'flex w-full flex-col gap-4' },
    editableFields: layoutFields,
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Prefer Column for stacked content sections.'],
  },
  {
    type: 'Section',
    label: 'Section',
    category: 'layout',
    description: 'Semantic page section with optional heading.',
    icon: '§',
    acceptsChildren: true,
    defaultProps: { title: 'Section title', subtitle: '', tag: 'section', padding: 'lg' },
    defaultStyles: {
      className: 'w-full space-y-4',
      breakpoints: { mobile: { className: 'py-6' }, desktop: { className: 'py-10' } },
    },
    editableFields: [
      { key: 'title', label: 'Title', type: 'text', group: 'content', required: true },
      { key: 'subtitle', label: 'Subtitle', type: 'text', group: 'content' },
      ...layoutFields,
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Renders as <section> with aria-labelledby pointing to the section heading.'],
  },

  // ─── Typography ───────────────────────────────────────────
  {
    type: 'Heading',
    label: 'Heading',
    category: 'typography',
    description: 'Semantic heading levels h1–h6.',
    icon: 'H',
    acceptsChildren: false,
    defaultProps: { level: 2, text: 'Heading text', id: '' },
    defaultStyles: {
      className: 'font-bold tracking-tight text-gray-900',
      breakpoints: { mobile: { className: 'text-2xl' }, desktop: { className: 'text-3xl' } },
    },
    editableFields: [
      { key: 'text', label: 'Text', type: 'text', group: 'content', required: true },
      { key: 'level', label: 'Level', type: 'select', group: 'content', options: [
        { label: 'H1', value: '1' }, { label: 'H2', value: '2' }, { label: 'H3', value: '3' }, { label: 'H4', value: '4' },
      ]},
      { key: 'id', label: 'ID (for anchors)', type: 'text', group: 'accessibility' },
      { key: 'color', label: 'Text color', type: 'color', group: 'style' },
      {
        key: 'hidden',
        label: 'Hidden',
        type: 'boolean',
        group: 'behavior',
        helpText: 'Hide in preview (still visible faded in the editor).',
      },
      {
        key: 'showIf',
        label: 'Show if',
        type: 'text',
        group: 'behavior',
        helpText: 'Show only when this resolves, e.g. {{total}}.',
      },
      { key: 'className', label: 'Tailwind classes', type: 'className', group: 'style', responsive: true },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Maintain logical heading order (one h1 per page).'],
  },
  {
    type: 'Paragraph',
    label: 'Paragraph',
    category: 'typography',
    description: 'Body copy paragraph.',
    icon: 'P',
    acceptsChildren: false,
    defaultProps: { text: 'Paragraph text', size: 'base', leading: 'relaxed' },
    defaultStyles: { className: 'text-gray-700 leading-relaxed' },
    editableFields: [
      { key: 'text', label: 'Text', type: 'textarea', group: 'content', required: true },
      { key: 'size', label: 'Size', type: 'select', group: 'style', options: [
        { label: 'Small', value: 'sm' }, { label: 'Base', value: 'base' }, { label: 'Large', value: 'lg' },
      ]},
      { key: 'color', label: 'Text color', type: 'color', group: 'style' },
      {
        key: 'hidden',
        label: 'Hidden',
        type: 'boolean',
        group: 'behavior',
        helpText: 'Hide in preview (still visible faded in the editor).',
      },
      {
        key: 'showIf',
        label: 'Show if',
        type: 'text',
        group: 'behavior',
        helpText: 'Show only when this resolves, e.g. {{total}}.',
      },
      { key: 'className', label: 'Tailwind classes', type: 'className', group: 'style', responsive: true },
    ],
    supportedEvents: [],
    a11yNotes: ['Use sufficient color contrast for body text (WCAG AA).'],
  },
  {
    type: 'Span',
    label: 'Span',
    category: 'typography',
    description: 'Inline text span.',
    icon: 'S',
    acceptsChildren: false,
    defaultProps: { text: 'Inline text', weight: 'normal', color: 'default' },
    defaultStyles: { className: 'text-gray-800' },
    editableFields: [
      { key: 'text', label: 'Text', type: 'text', group: 'content', required: true },
      { key: 'weight', label: 'Weight', type: 'select', group: 'style', options: [
        { label: 'Normal', value: 'normal' }, { label: 'Medium', value: 'medium' }, { label: 'Bold', value: 'bold' },
      ]},
      { key: 'color', label: 'Color', type: 'select', group: 'style', options: [
        { label: 'Default', value: 'default' }, { label: 'Muted', value: 'muted' }, { label: 'Primary', value: 'primary' },
      ]},
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Do not use Span for headings; use Heading component instead.'],
  },

  // ─── Media ────────────────────────────────────────────────
  {
    type: 'Image',
    label: 'Image',
    category: 'media',
    description: 'Responsive image with required alt text.',
    icon: '🖼',
    acceptsChildren: false,
    defaultProps: { src: 'https://placehold.co/800x450', alt: 'Descriptive alt text', objectFit: 'cover', loading: 'lazy' },
    defaultStyles: { className: 'h-auto w-full rounded-md' },
    editableFields: [
      { key: 'src', label: 'Source URL', type: 'text', group: 'content', required: true },
      { key: 'alt', label: 'Alt text', type: 'text', group: 'accessibility', required: true, helpText: 'Required for screen readers' },
      { key: 'objectFit', label: 'Object fit', type: 'select', group: 'style', options: [
        { label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' },
      ]},
      { key: 'className', label: 'Tailwind classes', type: 'className', group: 'style', responsive: true },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Alt text is required. Decorative images should use alt="" explicitly.'],
  },
  {
    type: 'Video',
    label: 'Video',
    category: 'media',
    description: 'HTML5 video with controls.',
    icon: '▶',
    acceptsChildren: false,
    defaultProps: { src: '', controls: true, muted: false, loop: false, ariaLabel: 'Video player' },
    defaultStyles: { className: 'aspect-video w-full rounded-md bg-black' },
    editableFields: [
      { key: 'src', label: 'Video URL', type: 'text', group: 'content', required: true },
      { key: 'poster', label: 'Poster image', type: 'text', group: 'content' },
      { key: 'controls', label: 'Show controls', type: 'boolean', group: 'behavior' },
      { key: 'ariaLabel', label: 'ARIA label', type: 'text', group: 'accessibility' },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Provide captions/transcripts outside the component for accessibility compliance.'],
  },
  {
    type: 'Icon',
    label: 'Icon',
    category: 'media',
    description: 'Decorative or informative icon with accessible label.',
    icon: '★',
    acceptsChildren: false,
    defaultProps: { name: 'info', label: 'Information', size: 'md' },
    defaultStyles: { className: 'inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700' },
    editableFields: [
      { key: 'name', label: 'Icon name', type: 'select', group: 'content', options: [
        { label: 'Info', value: 'info' },
        { label: 'Check', value: 'check' },
        { label: 'Warning', value: 'warning' },
        { label: 'Search', value: 'search' },
        { label: 'Star', value: 'star' },
        { label: 'Heart', value: 'heart' },
        { label: 'Home', value: 'home' },
        { label: 'User', value: 'user' },
        { label: 'Mail', value: 'mail' },
        { label: 'Phone', value: 'phone' },
        { label: 'Settings', value: 'settings' },
        { label: 'Menu', value: 'menu' },
        { label: 'Close', value: 'close' },
        { label: 'Plus', value: 'plus' },
        { label: 'Minus', value: 'minus' },
        { label: 'Arrow right', value: 'arrow-right' },
        { label: 'Arrow left', value: 'arrow-left' },
        { label: 'Download', value: 'download' },
        { label: 'Upload', value: 'upload' },
        { label: 'Edit', value: 'edit' },
        { label: 'Trash', value: 'trash' },
        { label: 'Calendar', value: 'calendar' },
        { label: 'Clock', value: 'clock' },
        { label: 'Lock', value: 'lock' },
        { label: 'Unlock', value: 'unlock' },
      ]},
      { key: 'label', label: 'Accessible label', type: 'text', group: 'accessibility', required: true },
      { key: 'size', label: 'Size', type: 'select', group: 'style', options: [
        { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' },
      ]},
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Icons must have aria-label or aria-hidden with adjacent text.'],
  },

  // ─── Interactive ──────────────────────────────────────────
  {
    type: 'Button',
    label: 'Button',
    category: 'interactive',
    description: 'Primary interactive button.',
    icon: '⬚',
    acceptsChildren: false,
    defaultProps: { label: 'Button', variant: 'primary', size: 'md', type: 'button', disabled: false },
    defaultStyles: { className: 'inline-flex items-center justify-center rounded-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'variant', label: 'Variant', type: 'select', group: 'style', options: [
        { label: 'Primary', value: 'primary' }, { label: 'Secondary', value: 'secondary' }, { label: 'Ghost', value: 'ghost' }, { label: 'Danger', value: 'danger' },
      ]},
      { key: 'disabled', label: 'Disabled', type: 'boolean', group: 'behavior' },
      { key: 'ariaLabel', label: 'ARIA label (if no visible text)', type: 'text', group: 'accessibility' },
      { key: 'className', label: 'Tailwind classes', type: 'className', group: 'style', responsive: true },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Use ariaLabel only when visible label is absent. Disabled buttons are not focusable.'],
  },
  {
    type: 'Link',
    label: 'Link',
    category: 'interactive',
    description: 'Accessible hyperlink.',
    icon: '🔗',
    acceptsChildren: true,
    defaultProps: { href: '#', label: 'Link', target: '_self', underline: true },
    defaultStyles: { className: 'text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:underline' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'href', label: 'URL', type: 'text', group: 'behavior', required: true },
      { key: 'target', label: 'Target', type: 'select', group: 'behavior', options: [
        { label: 'Same tab', value: '_self' }, { label: 'New tab', value: '_blank' },
      ]},
      { key: 'underline', label: 'Underline', type: 'boolean', group: 'style' },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['External links (target=_blank) should indicate opening a new window in link text.'],
  },
  {
    type: 'Accordion',
    label: 'Accordion',
    category: 'interactive',
    description: 'Expand/collapse sections using native details/summary.',
    icon: '≡',
    acceptsChildren: false,
    defaultProps: {
      items: [
        { id: 'a1', title: 'Section 1', content: 'Accordion content 1' },
        { id: 'a2', title: 'Section 2', content: 'Accordion content 2' },
      ],
      allowMultiple: false,
      defaultOpenIds: [],
    },
    defaultStyles: { className: 'divide-y divide-gray-200 rounded-lg border border-gray-200' },
    editableFields: [
      { key: 'items', label: 'Items (JSON)', type: 'json', group: 'content', required: true },
      { key: 'allowMultiple', label: 'Allow multiple open', type: 'boolean', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.click, EVENT_PRESETS.dismiss],
    a11yNotes: ['Uses native <details>/<summary> for keyboard and screen reader support.'],
  },
  {
    type: 'Tabs',
    label: 'Tabs',
    category: 'interactive',
    description: 'Tablist with keyboard-navigable tabs.',
    icon: '⊞',
    acceptsChildren: true,
    defaultProps: {
      items: [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' },
      ],
      activeTabId: 'tab1',
      orientation: 'horizontal',
    },
    defaultStyles: { className: 'w-full' },
    editableFields: [
      { key: 'items', label: 'Tabs (JSON)', type: 'json', group: 'content', required: true },
      { key: 'activeTabId', label: 'Active tab ID', type: 'text', group: 'behavior' },
      { key: 'orientation', label: 'Orientation', type: 'select', group: 'layout', options: [
        { label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' },
      ]},
    ],
    supportedEvents: [EVENT_PRESETS.tabChange, EVENT_PRESETS.click],
    a11yNotes: ['Implements role=tablist/tab/tabpanel with aria-selected and keyboard arrow navigation.'],
  },

  // ─── Forms ────────────────────────────────────────────────
  {
    type: 'Input',
    label: 'Input',
    category: 'forms',
    description: 'Labeled text input with helper text.',
    icon: '▭',
    acceptsChildren: false,
    defaultProps: {
      name: 'field',
      label: 'Label',
      inputType: 'text',
      placeholder: '',
      required: false,
      helperText: '',
      bindToVar: '',
      bindScope: 'global',
      defaultValue: '',
      readOnly: false,
    },
    defaultStyles: { className: 'w-full' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'name', label: 'Field name', type: 'text', group: 'behavior', required: true },
      { key: 'inputType', label: 'Type', type: 'select', group: 'behavior', options: [
        { label: 'Text', value: 'text' }, { label: 'Email', value: 'email' }, { label: 'Password', value: 'password' }, { label: 'Number', value: 'number' },
      ]},
      { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'content' },
      { key: 'defaultValue', label: 'Default value', type: 'text', group: 'content' },
      {
        key: 'value',
        label: 'Value (bound)',
        type: 'text',
        group: 'behavior',
        helpText: 'One-way display only, e.g. {{output}}. Leave empty for editable inputs.',
      },
      {
        key: 'bindToVar',
        label: 'Bind to variable',
        type: 'text',
        group: 'behavior',
        helpText: 'Two-way: typing writes this variable (e.g. a). For output-only display use Value (bound) instead.',
      },
      {
        key: 'bindScope',
        label: 'Bind scope',
        type: 'select',
        group: 'behavior',
        options: [
          { label: 'Global', value: 'global' },
          { label: 'Temporary', value: 'temporary' },
        ],
      },
      { key: 'required', label: 'Required', type: 'boolean', group: 'behavior' },
      { key: 'readOnly', label: 'Read only', type: 'boolean', group: 'behavior' },
      {
        key: 'hidden',
        label: 'Hidden',
        type: 'boolean',
        group: 'behavior',
        helpText: 'Hide this component in preview (still visible faded in the editor).',
      },
      {
        key: 'showIf',
        label: 'Show if',
        type: 'text',
        group: 'behavior',
        helpText: 'Show only when this resolves to a value, e.g. {{total}}. Leave empty to always show.',
      },
      { key: 'helperText', label: 'Helper text', type: 'text', group: 'content' },
    ],
    supportedEvents: [EVENT_PRESETS.change, EVENT_PRESETS.focus, EVENT_PRESETS.blur],
    a11yNotes: ['Label is programmatically associated via htmlFor/id. Helper text uses aria-describedby.'],
  },
  {
    type: 'TextArea',
    label: 'Text Area',
    category: 'forms',
    description: 'Multi-line text input.',
    icon: '▤',
    acceptsChildren: false,
    defaultProps: {
      name: 'message',
      label: 'Message',
      rows: 4,
      placeholder: '',
      required: false,
      bindToVar: '',
      bindScope: 'global',
      defaultValue: '',
      readOnly: false,
    },
    defaultStyles: { className: 'w-full' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'name', label: 'Field name', type: 'text', group: 'behavior', required: true },
      { key: 'rows', label: 'Rows', type: 'number', group: 'layout' },
      { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'content' },
      { key: 'defaultValue', label: 'Default value', type: 'text', group: 'content' },
      {
        key: 'value',
        label: 'Value (bound)',
        type: 'text',
        group: 'behavior',
        helpText: 'One-way display only, e.g. {{output}}. Leave empty for editable fields.',
      },
      {
        key: 'bindToVar',
        label: 'Bind to variable',
        type: 'text',
        group: 'behavior',
        helpText: 'Two-way: typing writes this variable. For output-only display use Value (bound) instead.',
      },
      {
        key: 'bindScope',
        label: 'Bind scope',
        type: 'select',
        group: 'behavior',
        options: [
          { label: 'Global', value: 'global' },
          { label: 'Temporary', value: 'temporary' },
        ],
      },
      { key: 'required', label: 'Required', type: 'boolean', group: 'behavior' },
      { key: 'readOnly', label: 'Read only', type: 'boolean', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.change, EVENT_PRESETS.focus, EVENT_PRESETS.blur],
    a11yNotes: ['Associate label and optional description with aria-describedby.'],
  },
  {
    type: 'Select',
    label: 'Select',
    category: 'forms',
    description: 'Dropdown select field.',
    icon: '▾',
    acceptsChildren: false,
    defaultProps: {
      name: 'choice',
      label: 'Choose option',
      options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }],
      placeholder: 'Select...',
      required: false,
      bindToVar: '',
      bindScope: 'global',
      defaultValue: '',
    },
    defaultStyles: { className: 'w-full' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'name', label: 'Field name', type: 'text', group: 'behavior', required: true },
      { key: 'options', label: 'Options (JSON)', type: 'json', group: 'content', required: true },
      { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'content' },
      { key: 'defaultValue', label: 'Default value', type: 'text', group: 'content' },
      {
        key: 'value',
        label: 'Value (bound)',
        type: 'text',
        group: 'behavior',
        helpText: 'One-way display only, e.g. {{choice}}. Leave empty for editable selects.',
      },
      {
        key: 'bindToVar',
        label: 'Bind to variable',
        type: 'text',
        group: 'behavior',
        helpText: 'Two-way: selection writes this variable. For output-only display use Value (bound) instead.',
      },
      {
        key: 'bindScope',
        label: 'Bind scope',
        type: 'select',
        group: 'behavior',
        options: [
          { label: 'Global', value: 'global' },
          { label: 'Temporary', value: 'temporary' },
        ],
      },
      { key: 'required', label: 'Required', type: 'boolean', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.change, EVENT_PRESETS.focus, EVENT_PRESETS.blur],
    a11yNotes: ['Native select ensures platform accessibility.'],
  },
  {
    type: 'Checkbox',
    label: 'Checkbox',
    category: 'forms',
    description: 'Single checkbox with label.',
    icon: '☑',
    acceptsChildren: false,
    defaultProps: { name: 'agree', label: 'I agree to the terms', checked: false, disabled: false },
    defaultStyles: { className: 'flex items-start gap-2' },
    editableFields: [
      { key: 'label', label: 'Label', type: 'text', group: 'content', required: true },
      { key: 'name', label: 'Field name', type: 'text', group: 'behavior', required: true },
      { key: 'checked', label: 'Checked by default', type: 'boolean', group: 'behavior' },
      { key: 'disabled', label: 'Disabled', type: 'boolean', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.change],
    a11yNotes: ['Checkbox and label share a clickable hit area.'],
  },
  {
    type: 'Radio',
    label: 'Radio Group',
    category: 'forms',
    description: 'Grouped radio options with legend.',
    icon: '◎',
    acceptsChildren: false,
    defaultProps: {
      name: 'plan',
      legend: 'Choose a plan',
      options: [{ label: 'Free', value: 'free' }, { label: 'Pro', value: 'pro' }],
      defaultValue: 'free',
      orientation: 'vertical',
    },
    defaultStyles: { className: 'space-y-2' },
    editableFields: [
      { key: 'legend', label: 'Group label', type: 'text', group: 'content', required: true },
      { key: 'name', label: 'Field name', type: 'text', group: 'behavior', required: true },
      { key: 'options', label: 'Options (JSON)', type: 'json', group: 'content', required: true },
      { key: 'orientation', label: 'Orientation', type: 'select', group: 'layout', options: [
        { label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' },
      ]},
    ],
    supportedEvents: [EVENT_PRESETS.change],
    a11yNotes: ['Uses fieldset/legend for screen reader group labeling.'],
  },

  // ─── Navigation ───────────────────────────────────────────
  {
    type: 'Navbar',
    label: 'Navbar',
    category: 'navigation',
    description: 'Top navigation bar with brand and links.',
    icon: '☰',
    acceptsChildren: true,
    defaultProps: {
      brand: 'Brand',
      brandHref: '/',
      links: [{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }],
      sticky: false,
    },
    defaultStyles: {
      className: 'border-b border-gray-200 bg-white',
      breakpoints: { mobile: { className: 'px-3 py-3' }, desktop: { className: 'px-6 py-4' } },
    },
    editableFields: [
      { key: 'brand', label: 'Brand', type: 'text', group: 'content', required: true },
      { key: 'brandHref', label: 'Brand link', type: 'text', group: 'behavior' },
      { key: 'links', label: 'Links (JSON)', type: 'json', group: 'content', required: true },
      { key: 'sticky', label: 'Sticky', type: 'boolean', group: 'layout' },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Wrapped in <nav aria-label>. Links are keyboard focusable.'],
  },
  {
    type: 'Menu',
    label: 'Menu',
    category: 'navigation',
    description: 'Vertical or horizontal menu list.',
    icon: '≣',
    acceptsChildren: false,
    defaultProps: {
      label: 'Main menu',
      items: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings', href: '/settings' }],
      orientation: 'vertical',
    },
    defaultStyles: { className: 'rounded-md border border-gray-200 bg-white p-2' },
    editableFields: [
      { key: 'label', label: 'Menu label', type: 'text', group: 'accessibility', required: true },
      { key: 'items', label: 'Items (JSON)', type: 'json', group: 'content', required: true },
      { key: 'orientation', label: 'Orientation', type: 'select', group: 'layout', options: [
        { label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' },
      ]},
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Uses role=menu / menuitem semantics where appropriate.'],
  },
  {
    type: 'Breadcrumb',
    label: 'Breadcrumb',
    category: 'navigation',
    description: 'Hierarchical breadcrumb trail.',
    icon: '›',
    acceptsChildren: false,
    defaultProps: {
      ariaLabel: 'Breadcrumb',
      items: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products' }, { label: 'Current page' }],
    },
    defaultStyles: { className: 'text-sm text-gray-500' },
    editableFields: [
      { key: 'items', label: 'Items (JSON)', type: 'json', group: 'content', required: true },
      { key: 'ariaLabel', label: 'ARIA label', type: 'text', group: 'accessibility' },
    ],
    supportedEvents: [EVENT_PRESETS.click],
    a11yNotes: ['Uses nav + ol structure; current page marked with aria-current=page.'],
  },

  // ─── Feedback ─────────────────────────────────────────────
  {
    type: 'Alert',
    label: 'Alert',
    category: 'feedback',
    description: 'Inline alert banner.',
    icon: '!',
    acceptsChildren: false,
    defaultProps: { title: 'Notice', message: 'Alert message', variant: 'info', dismissible: false },
    defaultStyles: { className: 'rounded-lg border p-4' },
    editableFields: [
      { key: 'title', label: 'Title', type: 'text', group: 'content' },
      { key: 'message', label: 'Message', type: 'textarea', group: 'content', required: true },
      { key: 'variant', label: 'Variant', type: 'select', group: 'style', options: [
        { label: 'Info', value: 'info' }, { label: 'Success', value: 'success' }, { label: 'Warning', value: 'warning' }, { label: 'Error', value: 'error' },
      ]},
      { key: 'dismissible', label: 'Dismissible', type: 'boolean', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.dismiss, EVENT_PRESETS.click],
    a11yNotes: ['Uses role=alert for important messages; aria-live=polite.'],
  },
  {
    type: 'Modal',
    label: 'Modal',
    category: 'feedback',
    description: 'Dialog overlay (controlled via open prop).',
    icon: '⧉',
    acceptsChildren: true,
    defaultProps: { title: 'Modal title', description: '', open: true, closeLabel: 'Close dialog' },
    defaultStyles: { className: '' },
    editableFields: [
      { key: 'title', label: 'Title', type: 'text', group: 'content', required: true },
      { key: 'description', label: 'Description', type: 'textarea', group: 'content' },
      { key: 'open', label: 'Open', type: 'boolean', group: 'behavior' },
      { key: 'closeLabel', label: 'Close button label', type: 'text', group: 'accessibility' },
    ],
    supportedEvents: [EVENT_PRESETS.dismiss, EVENT_PRESETS.click],
    a11yNotes: ['Uses role=dialog, aria-modal=true, labelledby/describedby. Focus should trap inside modal.'],
  },
  {
    type: 'Toast',
    label: 'Toast',
    category: 'feedback',
    description: 'Transient notification (controlled via visible prop).',
    icon: '🔔',
    acceptsChildren: false,
    defaultProps: { message: 'Saved successfully', variant: 'success', visible: true, durationMs: 4000 },
    defaultStyles: { className: 'fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg' },
    editableFields: [
      { key: 'message', label: 'Message', type: 'text', group: 'content', required: true },
      { key: 'variant', label: 'Variant', type: 'select', group: 'style', options: [
        { label: 'Info', value: 'info' }, { label: 'Success', value: 'success' }, { label: 'Warning', value: 'warning' }, { label: 'Error', value: 'error' },
      ]},
      { key: 'visible', label: 'Visible', type: 'boolean', group: 'behavior' },
      { key: 'durationMs', label: 'Duration (ms)', type: 'number', group: 'behavior' },
    ],
    supportedEvents: [EVENT_PRESETS.dismiss],
    a11yNotes: ['Uses role=status and aria-live=polite for non-critical updates.'],
  },
]

export const COMPONENT_CATALOG_MAP = Object.fromEntries(
  COMPONENT_CATALOG.map((entry) => [entry.type, entry]),
) as Record<string, ComponentCatalogEntry>

export function getCatalogEntry(type: string): ComponentCatalogEntry | undefined {
  return COMPONENT_CATALOG_MAP[type]
}

export function getPaletteByCategory() {
  const grouped = new Map<string, ComponentCatalogEntry[]>()
  for (const entry of COMPONENT_CATALOG) {
    const list = grouped.get(entry.category) ?? []
    list.push(entry)
    grouped.set(entry.category, list)
  }
  return grouped
}

export function getDefaultProps(type: string): Record<string, unknown> {
  return structuredClone(COMPONENT_CATALOG_MAP[type]?.defaultProps ?? {})
}

export function getDefaultStyles(type: string) {
  return structuredClone(COMPONENT_CATALOG_MAP[type]?.defaultStyles ?? { className: '' })
}
