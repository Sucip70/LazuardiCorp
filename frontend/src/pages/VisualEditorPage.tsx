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



  useEffect(() => {

    if (!id) {

      loadDocument(createEmptyDocument())

      return

    }



    let active = true



    getProject(id)

      .then((project) => {

        if (!active) return

        setProjectName(`Project ${project.id.slice(0, 8)}`)

        const parsed = parseProjectDocument(project.data)

        loadDocument(parsed ?? createEmptyDocument())

      })

      .catch((err) => {

        if (!active) return

        const message = err instanceof ApiError ? err.message : 'Failed to load project'

        setError(message)

        loadDocument(createEmptyDocument())

      })

      .finally(() => {

        if (active) setLoading(false)

      })



    return () => {

      active = false

    }

  }, [id, loadDocument])



  const persist = useCallback(async () => {
    if (!id) return
    if (useUIStore.getState().saveStatus === 'saving') return

    setSaveStatus('saving')
    try {
      const doc = getDocument()
      await updateProject(id, {
        schemaVersion: '1.0.0',
        pages: [{ id: 'page_home', name: 'Home', path: '/', rootIds: doc.rootIds, nodes: doc.nodes }],
      })
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Save failed'
      setSaveStatus('error', message)
    }
  }, [id, getDocument, setSaveStatus])

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
        backHref={id ? `/projects/${id}` : '/'}
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


