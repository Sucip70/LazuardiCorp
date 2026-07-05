import { useId, useState } from 'react'
import type { RenderComponentProps } from '../../renderer/types'
import {
  alertVariantClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  iconGlyph,
  layoutClasses,
  mergeAria,
} from '../utils/styleHelpers'

function maxWidthClass(value: unknown): string {
  switch (value) {
    case 'sm': return 'max-w-sm'
    case 'md': return 'max-w-3xl'
    case 'lg': return 'max-w-5xl'
    case 'full': return 'max-w-full'
    default: return 'max-w-5xl'
  }
}

// ─── Layout ─────────────────────────────────────────────────

export function ContainerLib(props: RenderComponentProps) {
  const { node, children, className, style, attributes, eventHandlers } = props
  const aria = mergeAria(attributes, node.props)
  return (
    <div className={`mx-auto w-full ${maxWidthClass(node.props.maxWidth)} ${className}`} style={style} {...aria} {...eventHandlers}>
      {children}
    </div>
  )
}

export function RowLib(props: RenderComponentProps) {
  const { node, children, className, style, attributes, eventHandlers } = props
  return (
    <div className={`${layoutClasses(node.props, 'row')} ${className}`} style={style} {...attributes} {...eventHandlers}>
      {children}
    </div>
  )
}

export function ColumnLib(props: RenderComponentProps) {
  const { node, children, className, style, attributes, eventHandlers } = props
  return (
    <div className={`${layoutClasses(node.props, 'col')} ${className}`} style={style} {...attributes} {...eventHandlers}>
      {children}
    </div>
  )
}

export function SectionLib(props: RenderComponentProps) {
  const { node, children, className, style, attributes, eventHandlers } = props
  const titleId = useId()
  const title = String(node.props.title ?? '')
  const subtitle = String(node.props.subtitle ?? '')
  return (
    <section
      className={className}
      style={style}
      aria-labelledby={title ? titleId : undefined}
      {...attributes}
      {...eventHandlers}
    >
      {title && <h2 id={titleId} className="text-xl font-semibold text-gray-900">{title}</h2>}
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// ─── Typography ─────────────────────────────────────────────

export function HeadingLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const level = Number(node.props.level ?? 2)
  const text = String(node.props.text ?? '')
  const id = node.props.id ? String(node.props.id) : undefined
  const common = { id, className, style, ...attributes, ...eventHandlers }
  if (level === 1) return <h1 {...common}>{text}</h1>
  if (level === 3) return <h3 {...common}>{text}</h3>
  if (level === 4) return <h4 {...common}>{text}</h4>
  if (level === 5) return <h5 {...common}>{text}</h5>
  if (level === 6) return <h6 {...common}>{text}</h6>
  return <h2 {...common}>{text}</h2>
}

export function ParagraphLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const sizeClass = node.props.size === 'sm' ? 'text-sm' : node.props.size === 'lg' ? 'text-lg' : 'text-base'
  return (
    <p className={`${sizeClass} ${className}`.trim()} style={style} {...attributes} {...eventHandlers}>
      {String(node.props.text ?? '')}
    </p>
  )
}

export function SpanLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const weight = node.props.weight === 'bold' ? 'font-bold' : node.props.weight === 'medium' ? 'font-medium' : ''
  const color = node.props.color === 'muted' ? 'text-gray-500' : node.props.color === 'primary' ? 'text-blue-600' : ''
  return (
    <span className={`${weight} ${color} ${className}`.trim()} style={style} {...attributes} {...eventHandlers}>
      {String(node.props.text ?? '')}
    </span>
  )
}

// ─── Media ──────────────────────────────────────────────────

export function ImageLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const fit = node.props.objectFit === 'contain' ? 'object-contain' : 'object-cover'
  return (
    <img
      className={`${fit} ${className}`.trim()}
      style={style}
      src={String(node.props.src ?? '')}
      alt={String(node.props.alt ?? '')}
      loading={node.props.loading === 'eager' ? 'eager' : 'lazy'}
      {...attributes}
      {...eventHandlers}
    />
  )
}

export function VideoLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const aria = mergeAria(attributes, node.props)
  return (
    <video
      className={className}
      style={style}
      src={String(node.props.src ?? '')}
      poster={node.props.poster ? String(node.props.poster) : undefined}
      controls={node.props.controls !== false}
      muted={Boolean(node.props.muted)}
      loop={Boolean(node.props.loop)}
      aria-label={String(aria['aria-label'] ?? 'Video')}
      {...eventHandlers}
    />
  )
}

export function IconLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const size = node.props.size === 'sm' ? 'h-6 w-6 text-sm' : node.props.size === 'lg' ? 'h-10 w-10 text-lg' : 'h-8 w-8 text-base'
  const label = String(node.props.label ?? 'Icon')
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center justify-center ${size} ${className}`.trim()}
      style={style}
      {...attributes}
      {...eventHandlers}
    >
      {iconGlyph(String(node.props.name ?? 'info'))}
    </span>
  )
}

// ─── Interactive ────────────────────────────────────────────

export function ButtonLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const variant = buttonVariantClasses(String(node.props.variant ?? 'primary'))
  const size = buttonSizeClasses(String(node.props.size ?? 'md'))
  const label = String(node.props.label ?? 'Button')
  const aria = mergeAria(attributes, node.props)
  return (
    <button
      type={node.props.type === 'submit' ? 'submit' : node.props.type === 'reset' ? 'reset' : 'button'}
      disabled={Boolean(node.props.disabled)}
      className={`${variant} ${size} ${className}`.trim()}
      style={style}
      aria-label={aria['aria-label'] ? String(aria['aria-label']) : undefined}
      {...eventHandlers}
    >
      {label}
    </button>
  )
}

export function LinkLib({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const underline = node.props.underline !== false ? 'underline' : 'no-underline'
  const label = String(node.props.label ?? 'Link')
  const target = String(node.props.target ?? '_self')
  return (
    <a
      href={String(node.props.href ?? '#')}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={`${underline} ${className}`.trim()}
      style={style}
      {...attributes}
      {...eventHandlers}
    >
      {children ?? label}
      {target === '_blank' && <span className="sr-only"> (opens in new tab)</span>}
    </a>
  )
}

type AccordionItem = { id: string; title: string; content: string }

export function AccordionLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const items = (node.props.items as AccordionItem[] | undefined) ?? []
  return (
    <div className={className} style={style} {...attributes} {...eventHandlers}>
      {items.map((item) => (
        <details key={item.id} className="group p-4" name={node.props.allowMultiple ? undefined : 'accordion'}>
          <summary className="cursor-pointer list-none font-medium text-gray-900 marker:content-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {item.title}
          </summary>
          <p className="mt-2 text-sm text-gray-600">{item.content}</p>
        </details>
      ))}
    </div>
  )
}

type TabItem = { id: string; label: string }

export function TabsLib({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const items = (node.props.items as TabItem[] | undefined) ?? []
  const [active, setActive] = useState(String(node.props.activeTabId ?? items[0]?.id ?? ''))
  const vertical = node.props.orientation === 'vertical'

  return (
    <div className={`${vertical ? 'flex gap-4' : ''} ${className}`.trim()} style={style} {...attributes}>
      <div role="tablist" aria-orientation={vertical ? 'vertical' : 'horizontal'} className={`flex ${vertical ? 'flex-col' : 'flex-row gap-2 border-b border-gray-200'}`}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            className={`px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active === item.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="mt-4"
        {...eventHandlers}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Forms ──────────────────────────────────────────────────

const fieldClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

export function InputLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const inputId = useId()
  const helperId = useId()
  const label = String(node.props.label ?? 'Label')
  const helper = String(node.props.helperText ?? '')
  return (
    <div className={className} style={style}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        id={inputId}
        name={String(node.props.name ?? 'field')}
        type={String(node.props.inputType ?? 'text')}
        placeholder={String(node.props.placeholder ?? '')}
        required={Boolean(node.props.required)}
        disabled={Boolean(node.props.disabled)}
        defaultValue={String(node.props.defaultValue ?? '')}
        aria-describedby={helper ? helperId : undefined}
        className={fieldClass}
        {...attributes}
        {...eventHandlers}
      />
      {helper && <p id={helperId} className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

export function TextAreaLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const inputId = useId()
  return (
    <div className={className} style={style}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{String(node.props.label ?? 'Label')}</label>
      <textarea
        id={inputId}
        name={String(node.props.name ?? 'field')}
        rows={Number(node.props.rows ?? 4)}
        placeholder={String(node.props.placeholder ?? '')}
        required={Boolean(node.props.required)}
        disabled={Boolean(node.props.disabled)}
        defaultValue={String(node.props.defaultValue ?? '')}
        className={fieldClass}
        {...attributes}
        {...eventHandlers}
      />
    </div>
  )
}

type SelectOption = { label: string; value: string }

export function SelectLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const inputId = useId()
  const options = (node.props.options as SelectOption[] | undefined) ?? []
  return (
    <div className={className} style={style}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{String(node.props.label ?? 'Label')}</label>
      <select
        id={inputId}
        name={String(node.props.name ?? 'field')}
        required={Boolean(node.props.required)}
        disabled={Boolean(node.props.disabled)}
        defaultValue={String(node.props.defaultValue ?? '')}
        className={fieldClass}
        {...attributes}
        {...eventHandlers}
      >
        {node.props.placeholder ? <option value="">{String(node.props.placeholder)}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function CheckboxLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const inputId = useId()
  return (
    <div className={`flex items-start gap-2 ${className}`.trim()} style={style}>
      <input
        id={inputId}
        type="checkbox"
        name={String(node.props.name ?? 'checkbox')}
        defaultChecked={Boolean(node.props.checked)}
        disabled={Boolean(node.props.disabled)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        {...attributes}
        {...eventHandlers}
      />
      <label htmlFor={inputId} className="text-sm text-gray-700">{String(node.props.label ?? 'Checkbox')}</label>
    </div>
  )
}

type RadioOption = { label: string; value: string }

export function RadioLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const horizontal = node.props.orientation === 'horizontal'
  const options = (node.props.options as RadioOption[] | undefined) ?? []
  const name = String(node.props.name ?? 'radio')
  return (
    <fieldset className={className} style={style} {...attributes}>
      <legend className="text-sm font-medium text-gray-700">{String(node.props.legend ?? 'Choose one')}</legend>
      <div className={`mt-2 flex ${horizontal ? 'flex-row gap-4' : 'flex-col gap-2'}`}>
        {options.map((opt) => {
          const id = `${name}-${opt.value}`
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                defaultChecked={node.props.defaultValue === opt.value}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                {...eventHandlers}
              />
              <label htmlFor={id} className="text-sm text-gray-700">{opt.label}</label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

// ─── Navigation ─────────────────────────────────────────────

type NavLink = { label: string; href: string }

export function NavbarLib({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const links = (node.props.links as NavLink[] | undefined) ?? []
  const sticky = node.props.sticky ? 'sticky top-0 z-40' : ''
  return (
    <nav className={`${sticky} ${className}`.trim()} style={style} aria-label="Main navigation" {...attributes} {...eventHandlers}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a href={String(node.props.brandHref ?? '/')} className="text-lg font-semibold text-gray-900">
          {String(node.props.brand ?? 'Brand')}
        </a>
        <ul className="hidden items-center gap-4 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:underline">{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
      {children}
    </nav>
  )
}

export function MenuLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const items = (node.props.items as NavLink[] | undefined) ?? []
  const horizontal = node.props.orientation === 'horizontal'
  return (
    <nav aria-label={String(node.props.label ?? 'Menu')} className={className} style={style} {...attributes} {...eventHandlers}>
      <ul className={`flex ${horizontal ? 'flex-row gap-2' : 'flex-col gap-1'}`} role="menu">
        {items.map((item) => (
          <li key={item.href} role="none">
            <a href={item.href} role="menuitem" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

type BreadcrumbItem = { label: string; href?: string }

export function BreadcrumbLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const items = (node.props.items as BreadcrumbItem[] | undefined) ?? []
  return (
    <nav aria-label={String(node.props.ariaLabel ?? 'Breadcrumb')} className={className} style={style} {...attributes} {...eventHandlers}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isLast ? (
                <a href={item.href} className="hover:text-gray-900 focus:outline-none focus-visible:underline">{item.label}</a>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Feedback ───────────────────────────────────────────────

export function AlertLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const variant = alertVariantClasses(String(node.props.variant ?? 'info'))
  return (
    <div role="alert" aria-live="polite" className={`${variant} ${className}`.trim()} style={style} {...attributes} {...eventHandlers}>
      {node.props.title ? <p className="font-semibold">{String(node.props.title)}</p> : null}
      <p className="text-sm">{String(node.props.message ?? '')}</p>
      {node.props.dismissible ? (
        <button type="button" className="mt-2 text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Dismiss alert">
          Dismiss
        </button>
      ) : null}
    </div>
  )
}

export function ModalLib({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const titleId = useId()
  const descId = useId()
  if (node.props.open === false) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={node.props.description ? descId : undefined}
        className={`w-full max-w-lg rounded-xl bg-white p-6 shadow-xl ${className}`.trim()}
        style={style}
        {...attributes}
        {...eventHandlers}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">{String(node.props.title ?? 'Modal')}</h2>
          <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={String(node.props.closeLabel ?? 'Close dialog')}>
            ×
          </button>
        </div>
        {node.props.description ? (
          <p id={descId} className="mt-2 text-sm text-gray-600">{String(node.props.description)}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function ToastLib({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  if (node.props.visible === false) return null
  const variant = alertVariantClasses(String(node.props.variant ?? 'info'))
  return (
    <div role="status" aria-live="polite" className={`${variant} ${className}`.trim()} style={style} {...attributes} {...eventHandlers}>
      {String(node.props.message ?? '')}
    </div>
  )
}
