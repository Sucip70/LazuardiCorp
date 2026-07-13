import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listPages, loadPageDocument, type PageRecord } from '../api/pages'
import { getProject, getProjectV1 } from '../api/projects'
import { createEmptyDocument } from '../components/registry'
import { RuntimeNodeRenderer } from '../components/runtime/NodeRenderer'
import { parsePageDocument } from '../editor/utils/documentUtils'
import { applyGlobalDefaults, clearTemporaryVars, setRuntimeContext } from '../renderer/runtimeVars'
import { resetComponentRuntime } from '../renderer/componentState'
import { defaultActionHandlers } from '../renderer/events'
import { resolveTemplate } from '../renderer/formulas'
import type { ActionHandler } from '../renderer/types'
import type { PageDocument } from '../types/editor'
import { BREAKPOINT_WIDTHS, type Breakpoint } from '../types/editor'

function normalizePath(raw: string): string {
  let path = raw.trim() || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:|\/\/)/i.test(href)
}

function coerceDocument(raw: unknown): PageDocument {
  const parsed = parsePageDocument(raw)
  if (!parsed || parsed.rootIds.length === 0 || Object.keys(parsed.nodes).length === 0) {
    return createEmptyDocument()
  }
  return parsed
}

function parseGlobalVariables(data: unknown): { key: string; defaultValue: string }[] {
  if (!data || typeof data !== 'object') return []
  const root = data as Record<string, unknown>
  const fromSettings = (() => {
    const settings = root.settings
    if (!settings || typeof settings !== 'object') return null
    const variables = (settings as Record<string, unknown>).variables
    if (!variables || typeof variables !== 'object') return null
    return (variables as Record<string, unknown>).global
  })()
  const global = Array.isArray(fromSettings)
    ? fromSettings
    : (() => {
        const variables = root.variables
        if (!variables || typeof variables !== 'object') return null
        return (variables as Record<string, unknown>).global
      })()
  if (!Array.isArray(global)) return []
  return global
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const key = typeof row.key === 'string' ? row.key.trim() : ''
      if (!key) return null
      return {
        key,
        defaultValue: row.defaultValue == null ? '' : String(row.defaultValue),
      }
    })
    .filter((item): item is { key: string; defaultValue: string } => item !== null)
}

function findPageByPath(pages: PageRecord[], path: string): PageRecord | undefined {
  const normalized = normalizePath(path)
  return (
    pages.find((p) => normalizePath(p.path) === normalized) ??
    (normalized === '/' ? pages.find((p) => p.is_home) : undefined)
  )
}

export default function ProjectPreviewPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const pathParam = searchParams.get('path') ?? '/'
  const requestedPath = normalizePath(pathParam)

  const [pages, setPages] = useState<PageRecord[]>([])
  const [projectName, setProjectName] = useState('Preview')
  const [doc, setDoc] = useState<PageDocument | null>(null)
  const [activePage, setActivePage] = useState<PageRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [breakpoint] = useState<Breakpoint>('desktop')

  const goToPath = useCallback(
    (nextPath: string) => {
      const normalized = normalizePath(nextPath)
      setSearchParams({ path: normalized }, { replace: false })
    },
    [setSearchParams],
  )

  // Load project meta + page list once
  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const [project, projectV1, pagesRes] = await Promise.all([
          getProject(id),
          getProjectV1(id).catch(() => null),
          listPages(id),
        ])
        if (!active) return

        setProjectName(
          projectV1?.name?.trim() ||
            (typeof (project.data as { name?: string })?.name === 'string'
              ? (project.data as { name: string }).name
              : `Project ${id.slice(0, 8)}`),
        )
        const list = pagesRes.pages ?? []
        setPages(list)

        const fromV1 = projectV1 ? parseGlobalVariables(projectV1) : []
        const globals =
          fromV1.length > 0 ? fromV1 : parseGlobalVariables(project.data)
        applyGlobalDefaults(globals)
      } catch (err) {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Failed to load preview')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [id])

  // Load document whenever path / pages change
  useEffect(() => {
    if (!id || pages.length === 0) return
    let active = true

    ;(async () => {
      const page = findPageByPath(pages, requestedPath)
      if (!page) {
        setNotFound(true)
        setActivePage(null)
        setDoc(null)
        return
      }

      setNotFound(false)
      setRuntimeContext({ projectId: id, pageId: page.id })
      clearTemporaryVars()

      try {
        // Always fetch document so preview reflects the latest save
        const res = await loadPageDocument(id, page.id)
        if (!active) return
        setActivePage(page)
        const nextDoc = coerceDocument(res.document)
        resetComponentRuntime(nextDoc.nodes)
        setDoc(nextDoc)
      } catch (err) {
        if (!active) return
        // Fallback to list payload if document endpoint fails
        if (page.document !== undefined) {
          setActivePage(page)
          const nextDoc = coerceDocument(page.document)
          resetComponentRuntime(nextDoc.nodes)
          setDoc(nextDoc)
          return
        }
        setError(err instanceof ApiError ? err.message : 'Failed to load page')
      }
    })()

    return () => {
      active = false
    }
  }, [id, pages, requestedPath])

  const actionHandlers = useMemo((): Record<string, ActionHandler> => {
    return {
      ...defaultActionHandlers,
      navigate: (payload) => {
        const href = payload?.href
        if (typeof href !== 'string') return
        const resolved = resolveTemplate(href).trim()
        if (!resolved) return

        if (resolved.startsWith('#')) {
          document.querySelector(resolved)?.scrollIntoView({ behavior: 'smooth' })
          return
        }
        if (isExternalHref(resolved)) {
          window.location.assign(resolved)
          return
        }

        // Internal project path → SPA preview navigation
        const target = findPageByPath(pages, resolved)
        if (target) {
          goToPath(target.path)
          return
        }
        // Unknown internal path: still try SPA path so URL reflects intent
        goToPath(resolved)
      },
    }
  }, [pages, goToPath])

  const width = BREAKPOINT_WIDTHS[breakpoint]
  const homePath =
    pages.find((p) => p.is_home)?.path ??
    pages[0]?.path ??
    '/'

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-500">
        Missing project id
      </div>
    )
  }

  if (loading && pages.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading preview…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50 text-sm">
        <p className="text-red-600">{error}</p>
        <Link to={`/projects/${id}/visual`} className="text-blue-600 hover:underline">
          Back to editor
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <Link
          to={`/projects/${id}/visual`}
          className="rounded-md border border-gray-200 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Editor
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{projectName}</p>
          <p className="truncate text-xs text-gray-500">
            Preview · {activePage?.name ?? '—'} ·{' '}
            <span className="font-mono">{requestedPath}</span>
          </p>
        </div>
        <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
          Live preview
        </span>
      </header>

      <main className="flex flex-1 justify-center overflow-auto p-4 sm:p-8">
        {notFound ? (
          <div className="flex max-w-md flex-col items-center gap-3 self-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">Page not found</p>
            <p className="text-sm text-gray-500">
              No page with path <span className="font-mono">{requestedPath}</span>.
            </p>
            <button
              type="button"
              onClick={() => goToPath(homePath)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to home
            </button>
          </div>
        ) : doc ? (
          <div
            className="min-h-[640px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            style={{ maxWidth: width }}
          >
            {doc.rootIds.map((rootId) => {
              const node = doc.nodes[rootId]
              if (!node) return null
              return (
                <RuntimeNodeRenderer
                  key={rootId}
                  node={node}
                  nodes={doc.nodes}
                  breakpoint={breakpoint}
                  selectedId={null}
                  editable={false}
                  actionHandlers={actionHandlers}
                />
              )
            })}
          </div>
        ) : (
          <div className="self-center text-sm text-gray-400">Loading page…</div>
        )}
      </main>
    </div>
  )
}
