import { memo, useMemo } from 'react'
import type { Breakpoint } from '../types/editor'
import { buildEventHandlers } from './events'
import { resolveRenderer } from './registry'
import { resolveClassName, resolveInlineStyle } from './styles'
import type { ActionHandler, NormalizedDocument } from './types'

type JsonNodeViewProps = {
  nodeId: string
  nodes: NormalizedDocument['nodes']
  breakpoint: Breakpoint
  actionHandlers: Record<string, ActionHandler>
}

function areNodePropsEqual(prev: JsonNodeViewProps, next: JsonNodeViewProps): boolean {
  if (prev.nodeId !== next.nodeId || prev.breakpoint !== next.breakpoint) return false
  if (prev.actionHandlers !== next.actionHandlers) return false

  const prevNode = prev.nodes[prev.nodeId]
  const nextNode = next.nodes[next.nodeId]
  if (!prevNode || !nextNode) return prevNode === nextNode

  return (
    prevNode.type === nextNode.type &&
    prevNode.children.join(',') === nextNode.children.join(',') &&
    JSON.stringify(prevNode.props) === JSON.stringify(nextNode.props) &&
    JSON.stringify(prevNode.styles) === JSON.stringify(nextNode.styles) &&
    JSON.stringify(prevNode.events) === JSON.stringify(nextNode.events) &&
    JSON.stringify(prevNode.attributes) === JSON.stringify(nextNode.attributes)
  )
}

export const JsonNodeView = memo(function JsonNodeView({
  nodeId,
  nodes,
  breakpoint,
  actionHandlers,
}: JsonNodeViewProps) {
  const node = nodes[nodeId]
  const entry = node ? resolveRenderer(node.type) : undefined

  const className = node ? resolveClassName(node, breakpoint) : ''
  const style = node ? resolveInlineStyle(node, breakpoint) : {}
  const eventHandlers = useMemo(
    () =>
      node
        ? buildEventHandlers(node.id, node.type, node.events, node.props, actionHandlers)
        : {},
    [node, actionHandlers],
  )

  if (!node || !entry) return null

  const Component = entry.component
  const childElements =
    entry.acceptsChildren !== false && node.children.length > 0
      ? node.children.map((childId) => (
          <JsonNodeView
            key={childId}
            nodeId={childId}
            nodes={nodes}
            breakpoint={breakpoint}
            actionHandlers={actionHandlers}
          />
        ))
      : null

  return (
    <Component
      node={node}
      className={className}
      style={style}
      attributes={node.attributes}
      eventHandlers={eventHandlers}
    >
      {childElements}
    </Component>
  )
}, areNodePropsEqual)
