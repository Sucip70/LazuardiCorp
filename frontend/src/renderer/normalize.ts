import type { JsonTreeNode, NormalizedDocument, NormalizedNode } from './types'
import type { StyleSet } from '../types/editor'

let idCounter = 0

function nextId(type: string, explicit?: string) {
  if (explicit) return explicit
  idCounter += 1
  return `cmp_${type.toLowerCase()}_${idCounter}`
}

function mergeStylesFromProps(props: Record<string, unknown>, styles?: StyleSet): StyleSet {
  const merged: StyleSet = { ...(styles ?? {}) }
  if (typeof props.className === 'string') {
    merged.className = [merged.className, props.className].filter(Boolean).join(' ')
  }
  if (props.style && typeof props.style === 'object' && !Array.isArray(props.style)) {
    merged.css = { ...merged.css, ...(props.style as Record<string, string>) }
  }
  return merged
}

function stripStyleProps(props: Record<string, unknown>): Record<string, unknown> {
  const next = { ...props }
  delete next.className
  delete next.style
  return next
}

function normalizeProps(type: string, props: Record<string, unknown>): Record<string, unknown> {
  const normalized = stripStyleProps({ ...props })

  if (type === 'Text') {
    if (typeof normalized.text === 'string' && normalized.content === undefined) {
      normalized.content = normalized.text
    }
    if (typeof normalized.variant === 'string' && normalized.as === undefined) {
      normalized.as = normalized.variant
    }
  }

  if (type === 'Button' || type === 'Link') {
    if (typeof normalized.text === 'string' && normalized.label === undefined) {
      normalized.label = normalized.text
    }
  }

  return normalized
}

function normalizeTreeNode(
  node: JsonTreeNode,
  parentId: string | null,
  nodes: Record<string, NormalizedNode>,
  rootIds: string[],
): string {
  const id = nextId(node.type, node.id)
  const props = normalizeProps(node.type, node.props ?? {})
  const childIds: string[] = []

  for (const child of node.children ?? []) {
    if (typeof child === 'object' && child !== null && 'type' in child) {
      childIds.push(normalizeTreeNode(child as JsonTreeNode, id, nodes, rootIds))
    }
  }

  nodes[id] = {
    id,
    type: node.type,
    parentId,
    children: childIds,
    props,
    attributes: { ...(node.attributes ?? {}) },
    styles: mergeStylesFromProps(node.props ?? {}, node.styles),
    events: { ...(node.events ?? {}) },
  }

  if (parentId === null) {
    rootIds.push(id)
  }

  return id
}

function isNormalizedDocument(value: unknown): value is NormalizedDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rootIds' in value &&
    'nodes' in value &&
    Array.isArray((value as NormalizedDocument).rootIds)
  )
}

function normalizeFlatDocument(input: JsonRendererInputLike): NormalizedDocument {
  const rootIds = [...input.rootIds]
  const nodes: Record<string, NormalizedNode> = {}

  for (const [nodeId, raw] of Object.entries(input.nodes)) {
    const childEntries = raw.children ?? []
    const childIds: string[] = []

    for (const child of childEntries) {
      if (typeof child === 'string') {
        childIds.push(child)
      } else if (typeof child === 'object' && child !== null && 'type' in child) {
        childIds.push(normalizeTreeNode(child as JsonTreeNode, nodeId, nodes, rootIds))
      }
    }

    const props = normalizeProps(raw.type, raw.props ?? {})
    nodes[nodeId] = {
      id: nodeId,
      type: raw.type,
      parentId: raw.parentId ?? null,
      children: childIds,
      props,
      attributes: { ...(raw.attributes ?? {}) },
      styles: mergeStylesFromProps(raw.props ?? {}, raw.styles),
      events: { ...(raw.events ?? {}) },
    }
  }

  return { rootIds, nodes }
}

type JsonRendererInputLike = {
  rootIds: string[]
  nodes: Record<
    string,
    {
      id?: string
      type: string
      parentId?: string | null
      children?: string[] | JsonTreeNode[]
      props?: Record<string, unknown>
      attributes?: Record<string, string | number | boolean>
      styles?: StyleSet
      events?: NormalizedNode['events']
    }
  >
}

export function normalizeJsonInput(input: unknown): NormalizedDocument {
  idCounter = 0

  if (!input) {
    return { rootIds: [], nodes: {} }
  }

  if (isNormalizedDocument(input)) {
    const nodes: Record<string, NormalizedNode> = {}
    for (const [id, node] of Object.entries(input.nodes)) {
      nodes[id] = {
        ...node,
        attributes: node.attributes ?? {},
        styles: node.styles ?? {},
        events: node.events ?? {},
      }
    }
    return { rootIds: [...input.rootIds], nodes }
  }

  if (Array.isArray(input)) {
    const rootIds: string[] = []
    const nodes: Record<string, NormalizedNode> = {}
    for (const tree of input) {
      normalizeTreeNode(tree, null, nodes, rootIds)
    }
    return { rootIds, nodes }
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>

    if ('rootIds' in obj && 'nodes' in obj) {
      return normalizeFlatDocument(obj as JsonRendererInputLike)
    }

    if ('type' in obj) {
      const rootIds: string[] = []
      const nodes: Record<string, NormalizedNode> = {}
      normalizeTreeNode(obj as JsonTreeNode, null, nodes, rootIds)
      return { rootIds, nodes }
    }
  }

  return { rootIds: [], nodes: {} }
}

export function getDocumentNodeCount(document: NormalizedDocument): number {
  return Object.keys(document.nodes).length
}
