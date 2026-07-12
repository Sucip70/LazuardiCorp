import { apiFetch } from './client'
import type { PageDocument } from '../types/editor'

export type PageRecord = {
  id: string
  project_id: string
  name: string
  path: string
  sort_order: number
  is_home: boolean
  meta?: unknown
  document?: unknown
  created_at?: string
  updated_at?: string
}

export type PageListResponse = {
  pages: PageRecord[]
}

export type PageDocumentResponse = {
  page_id: string
  document: unknown
}

export function listPages(projectId: string): Promise<PageListResponse> {
  return apiFetch<PageListResponse>(`/api/v1/projects/${projectId}/pages`)
}

export function createPage(
  projectId: string,
  payload: {
    name: string
    path: string
    sort_order?: number
    is_home?: boolean
    document?: PageDocument | Record<string, unknown>
  },
): Promise<PageRecord> {
  return apiFetch<PageRecord>(`/api/v1/projects/${projectId}/pages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function loadPageDocument(
  projectId: string,
  pageId: string,
): Promise<PageDocumentResponse> {
  return apiFetch<PageDocumentResponse>(
    `/api/v1/projects/${projectId}/pages/${pageId}/document`,
  )
}

export function savePageDocument(
  projectId: string,
  pageId: string,
  document: PageDocument,
): Promise<PageDocumentResponse> {
  return apiFetch<PageDocumentResponse>(
    `/api/v1/projects/${projectId}/pages/${pageId}/document`,
    {
      method: 'PUT',
      body: JSON.stringify({ document }),
    },
  )
}

export function deletePage(projectId: string, pageId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/projects/${projectId}/pages/${pageId}`, {
    method: 'DELETE',
  })
}

export function updatePage(
  projectId: string,
  pageId: string,
  payload: {
    name?: string
    path?: string
    sort_order?: number
    is_home?: boolean
  },
): Promise<PageRecord> {
  return apiFetch<PageRecord>(`/api/v1/projects/${projectId}/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
