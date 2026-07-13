import type { ComponentNode } from '../types/editor'

type AttrValue = string | number | boolean | null
type AttrMap = Record<string, AttrValue>

const listeners = new Set<() => void>()
let version = 0

/** Live per-component attributes (e.g. typed `.value`). */
const instanceAttrs = new Map<string, AttrMap>()

/** Current page nodes for resolving static props like `.label`. */
let documentNodes: Record<string, ComponentNode> = {}

function notify() {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeComponentState(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getComponentStateSnapshot() {
  return version
}

export function setRuntimeDocument(nodes: Record<string, ComponentNode> | null | undefined) {
  documentNodes = nodes ?? {}
  // Seed defaultValue → value when not yet set for form-like nodes
  for (const [id, node] of Object.entries(documentNodes)) {
    const props = node.props ?? {}
    const existing = instanceAttrs.get(id)
    if (existing && Object.prototype.hasOwnProperty.call(existing, 'value')) continue
    if (props.defaultValue === undefined || props.defaultValue === null) continue
    const map = existing ?? {}
    map.value = props.defaultValue as AttrValue
    instanceAttrs.set(id, map)
  }
  notify()
}

export function getRuntimeDocumentNodes(): Record<string, ComponentNode> {
  return documentNodes
}

export function clearComponentState() {
  instanceAttrs.clear()
  notify()
}

/** Clear live attrs and optionally replace the document node map. */
export function resetComponentRuntime(nodes?: Record<string, ComponentNode> | null) {
  instanceAttrs.clear()
  if (nodes !== undefined) {
    setRuntimeDocument(nodes)
  } else {
    notify()
  }
}

export function setComponentAttr(nodeId: string, key: string, value: AttrValue) {
  if (!nodeId.trim() || !key.trim()) return
  const map = instanceAttrs.get(nodeId) ?? {}
  map[key] = value
  instanceAttrs.set(nodeId, map)
  notify()
}

export function getComponentAttr(
  nodeId: string,
  key: string,
): AttrValue | undefined {
  const live = instanceAttrs.get(nodeId)?.[key]
  if (live !== undefined) return live

  const node = documentNodes[nodeId]
  if (!node) return undefined
  const fromProps = node.props?.[key]
  if (fromProps === undefined || fromProps === null) return undefined
  if (
    typeof fromProps === 'string' ||
    typeof fromProps === 'number' ||
    typeof fromProps === 'boolean'
  ) {
    return fromProps
  }
  return String(fromProps)
}

/**
 * Resolve `nodeId.attr` (e.g. cmp_1x2y.value).
 * Returns undefined if the path is not a component attribute reference.
 */
export function resolveComponentPath(
  path: string,
): AttrValue | undefined {
  const trimmed = path.trim()
  const dot = trimmed.indexOf('.')
  if (dot <= 0) return undefined
  const nodeId = trimmed.slice(0, dot)
  const attr = trimmed.slice(dot + 1)
  if (!nodeId || !attr || attr.includes('.')) return undefined
  // Must look like a component id or exist in the document
  if (!documentNodes[nodeId] && !instanceAttrs.has(nodeId) && !/^cmp_[\w-]+$/i.test(nodeId)) {
    return undefined
  }
  return getComponentAttr(nodeId, attr)
}

/** True when `path` is a dotted component attribute reference. */
export function isComponentPath(path: string): boolean {
  const trimmed = path.trim()
  const dot = trimmed.indexOf('.')
  if (dot <= 0) return false
  const nodeId = trimmed.slice(0, dot)
  const attr = trimmed.slice(dot + 1)
  if (!nodeId || !attr || attr.includes('.')) return false
  if (documentNodes[nodeId] || instanceAttrs.has(nodeId)) return true
  return /^cmp_[\w-]+$/i.test(nodeId)
}
