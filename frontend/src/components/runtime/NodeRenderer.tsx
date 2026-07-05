import type { CSSProperties, MouseEvent } from 'react'
import type { Breakpoint, ComponentNode } from '../../types/editor'
import { getCatalogEntry } from '../../component-library/catalog'
import { resolveRenderer } from '../../renderer/registry'
import { resolveClassName, resolveInlineStyle } from '../../editor/utils/canvasUtils'

type NodeRendererProps = {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  breakpoint: Breakpoint
  selectedId: string | null
  onSelect?: (id: string) => void
  editable?: boolean
}

export function RuntimeNodeRenderer({
  node,
  nodes,
  breakpoint,
  selectedId,
  onSelect,
  editable = false,
}: NodeRendererProps) {
  const className = resolveClassName(node, breakpoint)
  const style = resolveInlineStyle(node, breakpoint)
  const isSelected = selectedId === node.id
  const def = getCatalogEntry(node.type)
  const acceptsChildren = def?.acceptsChildren ?? resolveRenderer(node.type).acceptsChildren !== false

  const childElements = acceptsChildren
    ? node.children.map((childId) => {
        const child = nodes[childId]
        if (!child) return null
        return (
          <RuntimeNodeRenderer
            key={childId}
            node={child}
            nodes={nodes}
            breakpoint={breakpoint}
            selectedId={selectedId}
            onSelect={onSelect}
            editable={editable}
          />
        )
      })
    : null

  const selectionClass = editable
    ? `${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'}`
    : ''

  const interactiveProps = editable
    ? {
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          onSelect?.(node.id)
        },
        'data-component-id': node.id,
      }
    : {}

  const mergedClassName = `${className} relative ${selectionClass}`.trim()
  const mergedStyle: CSSProperties = style

  switch (node.type) {
    case 'Text': {
      const Tag = String(node.props.as ?? 'p')
      if (Tag === 'label') {
        return (
          <label className={mergedClassName} style={mergedStyle} {...interactiveProps}>
            {String(node.props.content ?? '')}
          </label>
        )
      }
      if (Tag === 'span') {
        return (
          <span className={mergedClassName} style={mergedStyle} {...interactiveProps}>
            {String(node.props.content ?? '')}
          </span>
        )
      }
      if (Tag.startsWith('h') && Tag.length === 2) {
        const Heading = Tag as 'h1' | 'h2' | 'h3' | 'h4'
        const content = String(node.props.content ?? '')
        if (Heading === 'h1') return <h1 className={mergedClassName} style={mergedStyle} {...interactiveProps}>{content}</h1>
        if (Heading === 'h2') return <h2 className={mergedClassName} style={mergedStyle} {...interactiveProps}>{content}</h2>
        if (Heading === 'h3') return <h3 className={mergedClassName} style={mergedStyle} {...interactiveProps}>{content}</h3>
        return <h4 className={mergedClassName} style={mergedStyle} {...interactiveProps}>{content}</h4>
      }
      return (
        <p className={mergedClassName} style={mergedStyle} {...interactiveProps}>
          {String(node.props.content ?? '')}
        </p>
      )
    }
    case 'Image':
      return (
        <img
          className={mergedClassName}
          style={mergedStyle}
          {...interactiveProps}
          src={String(node.props.src ?? '')}
          alt={String(node.props.alt ?? '')}
        />
      )
    case 'Button':
      return (
        <button type="button" className={mergedClassName} style={mergedStyle} {...interactiveProps}>
          {String(node.props.label ?? 'Button')}
        </button>
      )
    case 'Link':
      return (
        <a
          href={String(node.props.href ?? '#')}
          className={mergedClassName}
          style={mergedStyle}
          {...interactiveProps}
        >
          {childElements && childElements.length > 0
            ? childElements
            : String(node.props.label ?? 'Link')}
        </a>
      )
    case 'Form':
      return (
        <form
          className={mergedClassName}
          style={mergedStyle}
          {...interactiveProps}
          onSubmit={(event) => event.preventDefault()}
        >
          {childElements}
        </form>
      )
    case 'Input':
      return (
        <input
          className={mergedClassName}
          style={mergedStyle}
          {...interactiveProps}
          name={String(node.props.name ?? 'field')}
          type={String(node.props.inputType ?? 'text')}
          placeholder={String(node.props.placeholder ?? '')}
        />
      )
    case 'Container':
    default: {
      const tag = String(node.props.tag ?? 'div')
      return (
        <div className={mergedClassName} style={mergedStyle} {...interactiveProps} data-tag={tag}>
          {childElements}
        </div>
      )
    }
  }
}
