import { apiFetch } from './client'

export type Project = {
  id: string
  data: unknown
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
