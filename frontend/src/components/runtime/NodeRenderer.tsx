import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { Breakpoint, ComponentNode } from '../../types/editor'
import { resolveRenderer } from '../../renderer/registry'
import { buildEventHandlers, defaultActionHandlers } from '../../renderer/events'
import { bindProps } from '../../renderer/formulas'
import {
  getRuntimeVarsSnapshot,
  subscribeRuntimeVars,
} from '../../renderer/runtimeVars'
import type { JsonEventDefinition, NormalizedNode } from '../../renderer/types'
import { resolveClassName, resolveInlineStyle } from '../../editor/utils/canvasUtils'

type NodeRendererProps = {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  breakpoint: Breakpoint
  selectedId: string | null
  onSelect?: (id: string) => void
  editable?: boolean
  renderChild?: (childId: string) => ReactNode
}

export function RuntimeNodeRenderer({
  node,
  nodes,
  breakpoint,
  selectedId,
  onSelect,
  editable = false,
  renderChild,
}: NodeRendererProps) {
  // Re-render when runtime vars change (preview bindings like {{vars.total}})
  useSyncExternalStore(subscribeRuntimeVars, getRuntimeVarsSnapshot, getRuntimeVarsSnapshot)

  const entry = resolveRenderer(node.type)
  const className = resolveClassName(node, breakpoint)
  const style = resolveInlineStyle(node, breakpoint)
  const isSelected = selectedId === node.id

  const selectionClass = editable
    ? `${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'}`
    : ''

  const boundProps = editable ? (node.props ?? {}) : bindProps(node.props ?? {})
  const nodeEvents = (node.events ?? {}) as Record<string, JsonEventDefinition>
  const interactiveProps = editable
    ? {}
    : buildEventHandlers(
        node.id,
        node.type,
        nodeEvents,
        boundProps,
        defaultActionHandlers,
      )

  const childElements =
    entry.acceptsChildren !== false && (node.children?.length ?? 0) > 0
      ? (node.children ?? []).map((childId) => {
          if (renderChild) return renderChild(childId)
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

  const Component = entry.component
  const normalizedNode = {
    ...(node as unknown as NormalizedNode),
    props: boundProps,
  }

  return (
    <div
      data-component-id={node.id}
      className="contents"
      onClick={
        editable
          ? (event) => {
              event.stopPropagation()
              onSelect?.(node.id)
            }
          : undefined
      }
    >
      <Component
        node={normalizedNode}
        className={`${className} relative ${selectionClass}`.trim()}
        style={style as CSSProperties}
        attributes={node.attributes ?? {}}
        eventHandlers={interactiveProps}
      >
        {childElements}
      </Component>
    </div>
  )
}
