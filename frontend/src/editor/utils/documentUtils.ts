import type { ComponentNode, PageDocument } from '../../types/editor'
import { canAcceptChildren } from './canvasUtils'

function isPageDocument(value: unknown): value is PageDocument {
  if (!value || typeof value !== 'object') return false
  const doc = value as Record<string, unknown>
  return Array.isArray(doc.rootIds) && doc.nodes !== null && typeof doc.nodes === 'object'
}

function pagePayload(page: Record<string, unknown>): PageDocument | null {
  if (isPageDocument(page)) return normalizeDocument(page)

  const document = page.document
  if (isPageDocument(document)) return normalizeDocument(document)

  if (document && typeof document === 'object') {
    const wrapped = document as Record<string, unknown>
    if (Array.isArray(wrapped.pages) && wrapped.pages.length > 0) {
      const inner = wrapped.pages[0]
      if (inner && typeof inner === 'object' && isPageDocument(inner)) {
        return normalizeDocument(inner)
      }
    }
    if (isPageDocument(wrapped)) return normalizeDocument(wrapped)
  }

  return null
}

export function parseProjectDocument(data: unknown): PageDocument | null {
  if (!data || typeof data !== 'object') return null
  const doc = data as Record<string, unknown>

  if (isPageDocument(doc)) return normalizeDocument(doc)

  if (Array.isArray(doc.pages) && doc.pages.length > 0) {
    const page = doc.pages[0]
    if (page && typeof page === 'object') {
      return pagePayload(page as Record<string, unknown>)
    }
  }

  return null
}

/** Parse a page `document` field from the pages API (or a full page row). */
export function parsePageDocument(raw: unknown): PageDocument | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return parsePageDocument(JSON.parse(raw) as unknown)
    } catch {
      return null
    }
  }
  if (typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (isPageDocument(obj)) return normalizeDocument(obj as PageDocument)
  return pagePayload(obj)
}

export function normalizeDocument(doc: PageDocument): PageDocument {
  const nodes: Record<string, ComponentNode> = {}

  for (const [id, raw] of Object.entries(doc.nodes)) {
    nodes[id] = {
      ...raw,
      id: raw.id ?? id,
      children: Array.isArray(raw.children) ? [...raw.children] : [],
      props: raw.props ?? {},
      styles: raw.styles ?? {},
      meta: raw.meta ?? {},
    }
  }

  const rootIds = doc.rootIds.filter((id) => nodes[id] != null)

  return { rootIds, nodes }
}

export type AddComponentResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export function validateAddChild(
  nodes: Record<string, ComponentNode>,
  parentId: string,
  type: string,
): string | null {
  const parent = nodes[parentId]
  if (!parent) return `Parent component "${parentId}" was not found in the document.`
  if (!canAcceptChildren(parent.type)) {
    return `"${parent.meta?.label ?? parent.type}" cannot contain child components.`
  }
  if (!type.trim()) return 'Component type is required.'
  return null
}
