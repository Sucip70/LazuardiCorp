import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { Breakpoint, ComponentNode } from '../../types/editor'
import { resolveRenderer } from '../../renderer/registry'
import { buildEventHandlers, defaultActionHandlers } from '../../renderer/events'
import { bindProps, isNodeVisible } from '../../renderer/formulas'
import {
  getComponentStateSnapshot,
  subscribeComponentState,
} from '../../renderer/componentState'
import {
  getRuntimeVarsSnapshot,
  subscribeRuntimeVars,
} from '../../renderer/runtimeVars'
import type { ActionHandler, JsonEventDefinition, NormalizedNode } from '../../renderer/types'
import { resolveClassName, resolveInlineStyle } from '../../editor/utils/canvasUtils'

type NodeRendererProps = {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  breakpoint: Breakpoint
  selectedId: string | null
  onSelect?: (id: string) => void
  editable?: boolean
  renderChild?: (childId: string) => ReactNode
  /** Merge over defaultActionHandlers (e.g. preview navigate). */
  actionHandlers?: Record<string, ActionHandler>
}

type DomLikeEvent = {
  altKey?: boolean
  stopPropagation?: () => void
}

/**
 * In edit mode, event actions only run when Alt (Option on macOS) is held.
 * Also stops pointer propagation on Alt so canvas drag-and-drop does not steal the click.
 */
function gateHandlersForEditMode(
  handlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  const next: Record<string, (...args: unknown[]) => void> = {}

  for (const [name, fn] of Object.entries(handlers)) {
    next[name] = (...args: unknown[]) => {
      const ev = args[0] as DomLikeEvent | undefined
      if (!ev?.altKey) return
      fn(...args)
    }
  }

  const prevPointerDown = next.onPointerDown
  next.onPointerDown = (...args: unknown[]) => {
    const ev = args[0] as DomLikeEvent | undefined
    if (ev?.altKey) {
      ev.stopPropagation?.()
    }
    prevPointerDown?.(...args)
  }

  return next
}

export function RuntimeNodeRenderer({
  node,
  nodes,
  breakpoint,
  selectedId,
  onSelect,
  editable = false,
  renderChild,
  actionHandlers,
}: NodeRendererProps) {
  // Re-render when runtime vars or component instance attrs change
  useSyncExternalStore(subscribeRuntimeVars, getRuntimeVarsSnapshot, getRuntimeVarsSnapshot)
  useSyncExternalStore(subscribeComponentState, getComponentStateSnapshot, getComponentStateSnapshot)

  const entry = resolveRenderer(node.type)
  const className = resolveClassName(node, breakpoint)
  const style = resolveInlineStyle(node, breakpoint)
  const isSelected = selectedId === node.id

  const selectionClass = editable
    ? `${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'}`
    : ''

  // Display: unbound in editor so templates stay editable as text.
  // Events: always resolve {{bindings}} so Alt+click / preview actions work.
  const displayProps = editable ? (node.props ?? {}) : bindProps(node.props ?? {})
  const eventProps = bindProps(node.props ?? {})
  const visible = isNodeVisible(node.props)

  // Preview: honor hidden. Editor: always render so you can select & edit.
  if (!editable && !visible) {
    return null
  }

  const handlers = { ...defaultActionHandlers, ...actionHandlers }
  const nodeEvents = (node.events ?? {}) as Record<string, JsonEventDefinition>
  const builtHandlers = buildEventHandlers(node.id, node.type, nodeEvents, eventProps, handlers)
  const interactiveProps = editable ? gateHandlersForEditMode(builtHandlers) : builtHandlers

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
              actionHandlers={actionHandlers}
            />
          )
        })
      : null

  const Component = entry.component
  const normalizedNode = {
    ...(node as unknown as NormalizedNode),
    props: displayProps,
  }

  return (
    <div
      data-component-id={node.id}
      className="contents"
      onClick={
        editable
          ? (event) => {
              event.stopPropagation()
              // Alt+click runs component events — skip selection
              if (event.altKey) return
              onSelect?.(node.id)
            }
          : undefined
      }
      onPointerDown={
        editable
          ? (event) => {
              if (event.altKey) event.stopPropagation()
            }
          : undefined
      }
    >
      <Component
        node={normalizedNode}
        className={`${className} relative ${selectionClass} ${editable && !visible ? 'opacity-40' : ''}`.trim()}
        style={style as CSSProperties}
        attributes={node.attributes ?? {}}
        eventHandlers={interactiveProps}
      >
        {childElements}
      </Component>
    </div>
  )
}
