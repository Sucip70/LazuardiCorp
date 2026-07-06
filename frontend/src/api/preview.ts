import { getToken } from './auth'
import { ApiError } from './client'

export async function fetchProjectPreview(projectId: string): Promise<string> {
  const token = getToken()
  const response = await fetch(`/api/v1/projects/${projectId}/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String(body.error)
        : `Preview failed with status ${response.status}`
    throw new ApiError(response.status, message)
  }

  return response.text()
}

export function openPreviewHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const tab = window.open(url, '_blank')
  if (!tab) {
    URL.revokeObjectURL(url)
    throw new Error('Popup blocked — allow popups to open preview')
  }
  tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
}
