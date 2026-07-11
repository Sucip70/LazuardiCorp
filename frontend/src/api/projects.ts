import { apiFetch } from './client'

export type Project = {
  id: string
  data: unknown
}

export type ProjectV1 = {
  id: string
  name: string
  slug: string
  description?: string
}

export function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/api/projects')
}

export function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`)
}

export function createProject(data: unknown): Promise<Project> {
  return apiFetch<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

/** Create an empty project (Home page, no template). */
export function createBlankProject(payload: {
  name: string
  slug: string
  description?: string
}): Promise<ProjectV1> {
  return apiFetch<ProjectV1>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProject(id: string, data: unknown): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, {
    method: 'DELETE',
  })
}
