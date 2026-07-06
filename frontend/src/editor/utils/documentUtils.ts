import type { PageDocument } from '../../types/editor'

function isPageDocument(value: unknown): value is PageDocument {
  if (!value || typeof value !== 'object') return false
  const doc = value as Record<string, unknown>
  return Array.isArray(doc.rootIds) && doc.nodes !== null && typeof doc.nodes === 'object'
}

function pagePayload(page: Record<string, unknown>): PageDocument | null {
  if (isPageDocument(page)) return page

  const document = page.document
  if (isPageDocument(document)) return document

  if (document && typeof document === 'object') {
    const wrapped = document as Record<string, unknown>
    if (Array.isArray(wrapped.pages) && wrapped.pages.length > 0) {
      const inner = wrapped.pages[0]
      if (inner && typeof inner === 'object' && isPageDocument(inner)) {
        return inner
      }
    }
    if (isPageDocument(wrapped)) return wrapped
  }

  return null
}

export function parseProjectDocument(data: unknown): PageDocument | null {
  if (!data || typeof data !== 'object') return null
  const doc = data as Record<string, unknown>

  if (isPageDocument(doc)) return doc

  if (Array.isArray(doc.pages) && doc.pages.length > 0) {
    const page = doc.pages[0]
    if (page && typeof page === 'object') {
      return pagePayload(page as Record<string, unknown>)
    }
  }

  return null
}
