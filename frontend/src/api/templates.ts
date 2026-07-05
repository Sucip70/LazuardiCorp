import { apiFetch } from './client'

export type TemplateSummary = {
  id: string
  slug: string
  name: string
  category: string
  description: string
  preview_image: string
  version: number
  is_builtin: boolean
  created_at: string
}

export type TemplateListResponse = {
  templates: TemplateSummary[]
  categories?: string[]
}

export type TemplateDetail = TemplateSummary & {
  json_data?: unknown
}

export type ApplyTemplatePayload = {
  template_id: string
  name: string
  slug: string
  user_template_id?: string
  version?: number
}

export type ProjectSummary = {
  id: string
  name: string
  slug: string
}

export function listTemplates(category?: string): Promise<TemplateListResponse> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return apiFetch<TemplateListResponse>(`/api/v1/templates${query}`)
}

export function listTemplateCategories(): Promise<{ categories: string[] }> {
  return apiFetch<{ categories: string[] }>('/api/v1/templates/categories')
}

export function getTemplate(id: string, includeData = false): Promise<TemplateDetail> {
  const query = includeData ? '?include=data' : ''
  return apiFetch<TemplateDetail>(`/api/v1/templates/${id}${query}`)
}

export function applyTemplate(payload: ApplyTemplatePayload): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>('/api/v1/templates/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveProjectAsTemplate(
  projectId: string,
  payload: { name: string; category: string; description?: string; preview_image?: string },
): Promise<TemplateDetail> {
  return apiFetch<TemplateDetail>(`/api/v1/projects/${projectId}/as-template`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  landing: 'Landing',
  business: 'Business',
  portfolio: 'Portfolio',
  blog: 'Blog',
  ecommerce: 'E-Commerce',
}
