import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  createPage,
  deletePage,
  listPages,
  loadPageDocument,
  savePageDocument,
  updatePage,
  type PageRecord,
} from '../api/pages'
import { getProject, getProjectV1, updateProjectV1 } from '../api/projects'
import { SaveAsTemplateModal } from '../components/templates/SaveAsTemplateModal'
import { createEmptyDocument } from '../components/registry'
import { EditorShell } from '../editor/layout/EditorShell'
import { parsePageDocument } from '../editor/utils/documentUtils'
import { useEditorStore } from '../editor/store/editorStore'
import {
  suggestPagePath,
  toEditorPage,
  usePagesStore,
} from '../editor/store/pagesStore'
import { useUIStore } from '../editor/store/uiStore'
import {
  serializeGlobalVariables,
  useVariablesStore,
  type GlobalVariableDef,
} from '../editor/store/variablesStore'
import { clearTemporaryVars, setRuntimeContext } from '../renderer/runtimeVars'
import { resetComponentRuntime } from '../renderer/componentState'
import type { PageDocument } from '../types/editor'

function parseGlobalVariables(data: unknown): GlobalVariableDef[] {
  if (!data || typeof data !== 'object') return []
  const root = data as Record<string, unknown>

  // Prefer project.settings.variables.global (v1), then legacy data.variables.global
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
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const key = typeof row.key === 'string' ? row.key.trim() : ''
      if (!key) return null
      return {
        id: typeof row.id === 'string' ? row.id : `var_${index}_${key}`,
        key,
        defaultValue: row.defaultValue == null ? '' : String(row.defaultValue),
        description: typeof row.description === 'string' ? row.description : '',
      } satisfies GlobalVariableDef
    })
    .filter((item): item is GlobalVariableDef => item !== null)
}

function projectDisplayName(data: unknown, id: string): string {
  if (data && typeof data === 'object') {
    const root = data as Record<string, unknown>
    if (typeof root.name === 'string' && root.name.trim()) return root.name
  }
  return `Project ${id.slice(0, 8)}`
}

function coerceDocument(raw: unknown): PageDocument {
  const parsed = parsePageDocument(raw)
  if (!parsed || parsed.rootIds.length === 0 || Object.keys(parsed.nodes).length === 0) {
    return createEmptyDocument()
  }
  return parsed
}

function sortPages(pages: PageRecord[]): PageRecord[] {
  return [...pages].sort((a, b) => {
    if (a.is_home !== b.is_home) return a.is_home ? -1 : 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  })
}

export default function VisualEditorPage() {
  const { id } = useParams()
  const [projectName, setProjectName] = useState('Untitled Project')
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [pagesBusy, setPagesBusy] = useState(false)
  const pageDocsRef = useRef<Record<string, unknown>>({})

  const loadDocument = useEditorStore((s) => s.loadDocument)
  const getDocument = useEditorStore((s) => s.getDocument)
  const setSaveStatus = useUIStore((s) => s.setSaveStatus)
  const setPreviewMode = useUIStore((s) => s.setPreviewMode)
  const loadGlobalDefs = useVariablesStore((s) => s.loadGlobalDefs)
  const resetVariables = useVariablesStore((s) => s.resetVariables)
  const setActivePageId = useVariablesStore((s) => s.setActivePageId)
  const setPages = usePagesStore((s) => s.setPages)
  const upsertPage = usePagesStore((s) => s.upsertPage)
  const removePage = usePagesStore((s) => s.removePage)
  const resetPages = usePagesStore((s) => s.resetPages)

  const applyPageDocument = useCallback(
    (pageId: string, raw: unknown) => {
      pageDocsRef.current[pageId] = raw
      const doc = coerceDocument(raw)
      loadDocument(doc)
      setActivePageId(pageId)
      setRuntimeContext({ projectId: id ?? 'default', pageId })
      clearTemporaryVars()
      resetComponentRuntime(doc.nodes)
    },
    [id, loadDocument, setActivePageId],
  )

  useEffect(() => {
    if (!id) {
      loadDocument(createEmptyDocument())
      resetVariables()
      resetPages()
      setRuntimeContext({ projectId: 'default', pageId: 'page_home' })
      setActivePageId('page_home')
      return
    }

    let active = true
    setRuntimeContext({ projectId: id, pageId: useVariablesStore.getState().activePageId })

    ;(async () => {
      try {
        const [project, projectV1, pagesRes] = await Promise.all([
          getProject(id),
          getProjectV1(id).catch(() => null),
          listPages(id),
        ])
        if (!active) return

        setProjectName(
          projectV1?.name?.trim() || projectDisplayName(project.data, project.id),
        )
        const fromV1 = projectV1 ? parseGlobalVariables(projectV1) : []
        loadGlobalDefs(fromV1.length > 0 ? fromV1 : parseGlobalVariables(project.data))

        const sorted = sortPages(pagesRes.pages ?? [])
        setPages(sorted.map(toEditorPage))

        for (const page of sorted) {
          if (page.document !== undefined) pageDocsRef.current[page.id] = page.document
        }

        const home = sorted.find((p) => p.is_home) ?? sorted[0]
        if (home) {
          applyPageDocument(home.id, home.document)
        } else {
          loadDocument(createEmptyDocument())
        }
      } catch (err) {
        if (!active) return
        const message = err instanceof ApiError ? err.message : 'Failed to load project'
        setError(message)
        loadDocument(createEmptyDocument())
        resetVariables()
        resetPages()
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [
    id,
    loadDocument,
    loadGlobalDefs,
    resetVariables,
    resetPages,
    setPages,
    setActivePageId,
    applyPageDocument,
  ])

  const persistCurrentPage = useCallback(async () => {
    if (!id) return
    const pageId = useVariablesStore.getState().activePageId
    if (!pageId || pageId === 'page_home') return

    const doc = getDocument()
    await savePageDocument(id, pageId, doc)
    pageDocsRef.current[pageId] = doc
  }, [id, getDocument])

  const persist = useCallback(async () => {
    if (!id) return
    if (useUIStore.getState().saveStatus === 'saving') return

    setSaveStatus('saving')
    try {
      await persistCurrentPage()
      await updateProjectV1(id, {
        name: projectName,
        settings: {
          variables: {
            global: serializeGlobalVariables(),
          },
        },
      })
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Save failed'
      setSaveStatus('error', message)
    }
  }, [id, persistCurrentPage, projectName, setSaveStatus])

  useEffect(() => {
    if (!id) return
    const AUTO_SAVE_MS = 60_000
    const interval = window.setInterval(() => void persist(), AUTO_SAVE_MS)
    return () => window.clearInterval(interval)
  }, [id, persist])

  const handleSelectPage = useCallback(
    async (pageId: string) => {
      if (!id || pageId === useVariablesStore.getState().activePageId) return
      setPagesBusy(true)
      try {
        await persistCurrentPage()
        const cached = pageDocsRef.current[pageId]
        if (cached !== undefined) {
          applyPageDocument(pageId, cached)
        } else {
          const res = await loadPageDocument(id, pageId)
          applyPageDocument(pageId, res.document)
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to switch page'
        setSaveStatus('error', message)
      } finally {
        setPagesBusy(false)
      }
    },
    [id, persistCurrentPage, applyPageDocument, setSaveStatus],
  )

  const handleAddPage = useCallback(
    async (name: string) => {
      if (!id) return
      const trimmed = name.trim()
      if (!trimmed) return

      const path = suggestPagePath(
        trimmed,
        usePagesStore.getState().pages.map((p) => p.path),
      )

      setPagesBusy(true)
      try {
        await persistCurrentPage()
        const empty = createEmptyDocument()
        const created = await createPage(id, {
          name: trimmed,
          path,
          sort_order: usePagesStore.getState().pages.length,
          document: empty,
        })
        const editorPage = toEditorPage(created)
        upsertPage(editorPage)
        pageDocsRef.current[created.id] = created.document ?? empty
        applyPageDocument(created.id, created.document ?? empty)
        setSaveStatus('saved')
        window.setTimeout(() => setSaveStatus('idle'), 1500)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to create page'
        setSaveStatus('error', message)
        throw err
      } finally {
        setPagesBusy(false)
      }
    },
    [id, persistCurrentPage, upsertPage, applyPageDocument, setSaveStatus],
  )

  const handleRenamePage = useCallback(
    async (pageId: string, name: string) => {
      if (!id) return
      const trimmed = name.trim()
      if (!trimmed) return

      setPagesBusy(true)
      try {
        const updated = await updatePage(id, pageId, { name: trimmed })
        upsertPage(toEditorPage(updated))
        setSaveStatus('saved')
        window.setTimeout(() => setSaveStatus('idle'), 1500)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to rename page'
        setSaveStatus('error', message)
        throw err
      } finally {
        setPagesBusy(false)
      }
    },
    [id, upsertPage, setSaveStatus],
  )

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (!id) return
      const page = usePagesStore.getState().pages.find((p) => p.id === pageId)
      if (!page || page.isHome) return

      setPagesBusy(true)
      try {
        await deletePage(id, pageId)
        removePage(pageId)
        delete pageDocsRef.current[pageId]

        if (useVariablesStore.getState().activePageId === pageId) {
          const remaining = usePagesStore.getState().pages
          const next = remaining.find((p) => p.isHome) ?? remaining[0]
          if (next) {
            const cached = pageDocsRef.current[next.id]
            if (cached !== undefined) applyPageDocument(next.id, cached)
            else {
              const res = await loadPageDocument(id, next.id)
              applyPageDocument(next.id, res.document)
            }
          } else {
            loadDocument(createEmptyDocument())
          }
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to delete page'
        setSaveStatus('error', message)
        throw err
      } finally {
        setPagesBusy(false)
      }
    },
    [id, removePage, applyPageDocument, loadDocument, setSaveStatus],
  )

  const handleRenameProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setProjectName(trimmed)
      if (!id) return
      try {
        await updateProjectV1(id, { name: trimmed })
        setSaveStatus('saved')
        window.setTimeout(() => setSaveStatus('idle'), 1500)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to rename project'
        setSaveStatus('error', message)
        throw err
      }
    },
    [id, setSaveStatus],
  )

  const handlePreview = useCallback(async () => {
    if (!id) {
      setPreviewMode(true)
      return
    }

    try {
      await persist()
      const currentPath =
        usePagesStore.getState().pages.find(
          (p) => p.id === useVariablesStore.getState().activePageId,
        )?.path ?? '/'
      const url = `/projects/${id}/preview?path=${encodeURIComponent(currentPath)}`
      const tab = window.open(url, '_blank')
      if (!tab) {
        throw new Error('Popup blocked — allow popups to open preview')
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Preview failed'
      setSaveStatus('error', message)
    }
  }, [id, persist, setPreviewMode, setSaveStatus])

  const handleExport = useCallback(() => {
    if (!id) return
    window.open(`/api/v1/projects/${id}/export?format=static`, '_blank')
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading editor…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-gray-50 text-sm">
        <p className="text-red-600">{error}</p>
        <p className="text-gray-500">Started with an empty canvas.</p>
      </div>
    )
  }

  return (
    <>
      <EditorShell
        projectId={id}
        projectName={projectName}
        backHref="/"
        onSave={persist}
        onPreview={handlePreview}
        onExport={handleExport}
        onSaveAsTemplate={id ? () => setSaveTemplateOpen(true) : undefined}
        onRenameProject={handleRenameProject}
        onSelectPage={id ? handleSelectPage : undefined}
        onAddPage={id ? handleAddPage : undefined}
        onRenamePage={id ? handleRenamePage : undefined}
        onDeletePage={id ? handleDeletePage : undefined}
        pagesBusy={pagesBusy}
      />
      {id && (
        <SaveAsTemplateModal
          projectId={id}
          open={saveTemplateOpen}
          onClose={() => setSaveTemplateOpen(false)}
        />
      )}
    </>
  )
}
