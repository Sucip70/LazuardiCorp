import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getProject, updateProject } from '../api/projects'
import { fetchProjectPreview, openPreviewHtml } from '../api/preview'
import { SaveAsTemplateModal } from '../components/templates/SaveAsTemplateModal'
import { createEmptyDocument } from '../components/registry'
import { EditorShell } from '../editor/layout/EditorShell'
import { parseProjectDocument } from '../editor/utils/documentUtils'
import { useEditorStore } from '../editor/store/editorStore'
import { useUIStore } from '../editor/store/uiStore'
import {
  serializeGlobalVariables,
  useVariablesStore,
  type GlobalVariableDef,
} from '../editor/store/variablesStore'
import { clearTemporaryVars, setRuntimeContext } from '../renderer/runtimeVars'

function parseGlobalVariables(data: unknown): GlobalVariableDef[] {
  if (!data || typeof data !== 'object') return []
  const root = data as Record<string, unknown>
  const variables = root.variables
  if (!variables || typeof variables !== 'object') return []
  const global = (variables as Record<string, unknown>).global
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

export default function VisualEditorPage() {
  const { id } = useParams()
  const [projectName, setProjectName] = useState('Untitled Project')
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)

  const loadDocument = useEditorStore((s) => s.loadDocument)
  const getDocument = useEditorStore((s) => s.getDocument)
  const setSaveStatus = useUIStore((s) => s.setSaveStatus)
  const setPreviewMode = useUIStore((s) => s.setPreviewMode)
  const loadGlobalDefs = useVariablesStore((s) => s.loadGlobalDefs)
  const resetVariables = useVariablesStore((s) => s.resetVariables)
  const activePageId = useVariablesStore((s) => s.activePageId)

  useEffect(() => {
    if (!id) {
      loadDocument(createEmptyDocument())
      resetVariables()
      setRuntimeContext({ projectId: 'default', pageId: 'page_home' })
      return
    }

    let active = true
    setRuntimeContext({ projectId: id, pageId: useVariablesStore.getState().activePageId })

    getProject(id)
      .then((project) => {
        if (!active) return
        setProjectName(projectDisplayName(project.data, project.id))
        const parsed = parseProjectDocument(project.data)
        loadDocument(parsed ?? createEmptyDocument())
        loadGlobalDefs(parseGlobalVariables(project.data))
        clearTemporaryVars()
      })
      .catch((err) => {
        if (!active) return
        const message = err instanceof ApiError ? err.message : 'Failed to load project'
        setError(message)
        loadDocument(createEmptyDocument())
        resetVariables()
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, loadDocument, loadGlobalDefs, resetVariables])

  const persist = useCallback(async () => {
    if (!id) return
    if (useUIStore.getState().saveStatus === 'saving') return

    setSaveStatus('saving')
    try {
      const doc = getDocument()
      await updateProject(id, {
        schemaVersion: '1.0.0',
        name: projectName,
        variables: {
          global: serializeGlobalVariables(),
        },
        pages: [
          {
            id: activePageId || 'page_home',
            name: 'Home',
            path: '/',
            rootIds: doc.rootIds,
            nodes: doc.nodes,
          },
        ],
      })
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Save failed'
      setSaveStatus('error', message)
    }
  }, [id, getDocument, setSaveStatus, projectName, activePageId])

  useEffect(() => {
    if (!id) return
    const AUTO_SAVE_MS = 60_000
    const interval = window.setInterval(() => void persist(), AUTO_SAVE_MS)
    return () => window.clearInterval(interval)
  }, [id, persist])

  const handlePreview = useCallback(async () => {
    if (!id) {
      setPreviewMode(true)
      return
    }

    try {
      await persist()
      openPreviewHtml(await fetchProjectPreview(id))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Preview failed'
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
