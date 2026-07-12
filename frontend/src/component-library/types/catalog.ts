import type { Breakpoint } from '../../types/editor'

export type EditorFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'className'
  | 'color'

export type EditorField = {
  key: string
  label: string
  type: EditorFieldType
  options?: { label: string; value: string }[]
  group?: 'content' | 'layout' | 'style' | 'behavior' | 'accessibility'
  responsive?: boolean
  required?: boolean
  helpText?: string
}

export type SupportedEvent = {
  name: string
  description: string
  defaultAction?: string
}

export type ComponentCatalogEntry = {
  type: string
  label: string
  category: ComponentCategory
  description: string
  icon: string
  acceptsChildren: boolean
  defaultProps: Record<string, unknown>
  defaultStyles: { className?: string; breakpoints?: Partial<Record<Breakpoint, { className?: string; hidden?: boolean }>> }
  editableFields: EditorField[]
  supportedEvents: SupportedEvent[]
  a11yNotes: string[]
}

export type ComponentCategory =
  | 'layout'
  | 'typography'
  | 'media'
  | 'interactive'
  | 'forms'
  | 'navigation'
  | 'feedback'

export const EVENT_PRESETS = {
  click: { name: 'onClick', description: 'Fires when the element is clicked', defaultAction: 'navigate' },
  change: { name: 'onChange', description: 'Fires when the value changes', defaultAction: 'setVar' },
  submit: { name: 'onSubmit', description: 'Fires when a form is submitted', defaultAction: 'submitForm' },
  focus: { name: 'onFocus', description: 'Fires when the element receives focus' },
  blur: { name: 'onBlur', description: 'Fires when the element loses focus' },
  dismiss: { name: 'onDismiss', description: 'Fires when a dismissible UI is closed', defaultAction: 'toggleVisibility' },
  tabChange: { name: 'onTabChange', description: 'Fires when the active tab changes', defaultAction: 'custom' },
  start: {
    name: 'onStart',
    description: 'Fires once when the page opens or preview starts (root only)',
    defaultAction: 'setVar',
  },
  load: {
    name: 'onLoad',
    description: 'Fires after onStart when the page is ready / refreshed (root only)',
    defaultAction: 'setVar',
  },
} as const
