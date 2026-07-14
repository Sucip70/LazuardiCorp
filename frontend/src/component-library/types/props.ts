import type { Breakpoint, StyleSet } from '../../types/editor'

/** Shared layout props for containers. Spacing/flex alignment live in Visual Style. */
export type LayoutBaseProps = {
  tag?: 'div' | 'section' | 'main' | 'article' | 'aside' | 'header' | 'footer' | 'nav'
  /** Scroll when children exceed the box. Pair with maxHeight / scrollMaxWidth. */
  overflow?: 'visible' | 'vertical' | 'horizontal' | 'both' | 'hidden'
  /** CSS length, e.g. 320px or 50vh — enables vertical scrolling. */
  maxHeight?: string
  /** CSS length clamp for horizontal scrolling. */
  scrollMaxWidth?: string
  ariaLabel?: string
}

export type ContainerProps = LayoutBaseProps & {
  maxWidth?: 'full' | 'xl' | 'lg' | 'md' | 'sm'
}

export type RowProps = LayoutBaseProps & {
  wrap?: boolean
}

export type ColumnProps = LayoutBaseProps

export type SectionProps = LayoutBaseProps & {
  title?: string
  subtitle?: string
}

export type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  id?: string
}

export type ParagraphProps = {
  text: string
  size?: 'sm' | 'base' | 'lg'
  leading?: 'normal' | 'relaxed' | 'loose'
}

export type SpanProps = {
  text: string
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'default' | 'muted' | 'primary' | 'danger'
}

export type ImageProps = {
  src: string
  alt: string
  objectFit?: 'cover' | 'contain' | 'fill'
  loading?: 'lazy' | 'eager'
  width?: number
  height?: number
}

export type VideoProps = {
  src: string
  poster?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  ariaLabel?: string
}

export type IconProps = {
  name: string
  label: string
  size?: 'sm' | 'md' | 'lg'
}

export type ButtonProps = {
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  ariaLabel?: string
}

export type LinkProps = {
  href: string
  label: string
  target?: '_self' | '_blank'
  underline?: boolean
}

export type AccordionItem = {
  id: string
  title: string
  content: string
}

export type AccordionProps = {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpenIds?: string[]
}

export type TabItem = {
  id: string
  label: string
}

export type TabsProps = {
  items: TabItem[]
  activeTabId?: string
  orientation?: 'horizontal' | 'vertical'
}

export type InputProps = {
  name: string
  label: string
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  helperText?: string
  defaultValue?: string
  /** One-way display binding, e.g. "{{result}}" */
  value?: string
  /** Output only: display this named runtime variable (read-only). Typed values use componentId.value. */
  bindToVar?: string
  bindScope?: 'global' | 'temporary'
  /** Hide entirely in preview */
  hidden?: boolean
  /** Show only when template resolves to a truthy value, e.g. "{{total}}" */
  showIf?: string
}

export type TextAreaProps = {
  name: string
  label: string
  placeholder?: string
  rows?: number
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  defaultValue?: string
  value?: string
  bindToVar?: string
  bindScope?: 'global' | 'temporary'
}

export type SelectOption = { label: string; value: string }

export type SelectProps = {
  name: string
  label: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  value?: string
  bindToVar?: string
  bindScope?: 'global' | 'temporary'
}

export type ComboboxProps = {
  name: string
  label: string
  options: SelectOption[]
  placeholder?: string
  emptyText?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  defaultValue?: string
  value?: string
  bindToVar?: string
  bindScope?: 'global' | 'temporary'
}

export type CheckboxProps = {
  name: string
  label: string
  checked?: boolean
  disabled?: boolean
}

export type RadioOption = { label: string; value: string }

export type RadioGroupProps = {
  name: string
  legend: string
  options: RadioOption[]
  defaultValue?: string
  orientation?: 'horizontal' | 'vertical'
}

export type NavLink = { label: string; href: string }

export type NavbarProps = {
  brand: string
  brandHref?: string
  links: NavLink[]
  sticky?: boolean
}

export type MenuProps = {
  label: string
  items: NavLink[]
  orientation?: 'horizontal' | 'vertical'
}

export type BreadcrumbItem = { label: string; href?: string }

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
  ariaLabel?: string
}

export type AlertProps = {
  title?: string
  message: string
  variant?: 'info' | 'success' | 'warning' | 'error'
  dismissible?: boolean
}

export type ModalProps = {
  title: string
  description?: string
  open?: boolean
  closeLabel?: string
}

export type ToastProps = {
  message: string
  variant?: 'info' | 'success' | 'warning' | 'error'
  durationMs?: number
  visible?: boolean
}

export type ComponentPropsMap = {
  Container: ContainerProps
  Row: RowProps
  Column: ColumnProps
  Section: SectionProps
  Heading: HeadingProps
  Paragraph: ParagraphProps
  Span: SpanProps
  Image: ImageProps
  Video: VideoProps
  Icon: IconProps
  Button: ButtonProps
  Link: LinkProps
  Accordion: AccordionProps
  Tabs: TabsProps
  Input: InputProps
  TextArea: TextAreaProps
  Select: SelectProps
  Combobox: ComboboxProps
  Checkbox: CheckboxProps
  Radio: RadioGroupProps
  Navbar: NavbarProps
  Menu: MenuProps
  Breadcrumb: BreadcrumbProps
  Alert: AlertProps
  Modal: ModalProps
  Toast: ToastProps
}

export type LibraryComponentType = keyof ComponentPropsMap

export type ResponsiveClassMap = Partial<Record<Breakpoint, string>>

export type ComponentStyleDefaults = {
  base: StyleSet
  responsive?: ResponsiveClassMap
}
