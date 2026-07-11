import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createBlankProject, updateProject } from '../../api/projects'
import {
  applyTemplate,
  listTemplates,
  type TemplateSummary,
} from '../../api/templates'
import { createEmptyDocument } from '../registry'
import { TemplateCard } from './TemplateCard'
import { TemplateCategoryFilter } from './TemplateCategoryFilter'

type TemplateGalleryProps = {
  mode?: 'browse' | 'select'
  onApplied?: (projectId: string) => void
}

type Selection = { kind: 'template'; template: TemplateSummary } | { kind: 'blank' }

export function TemplateGallery({ mode = 'browse', onApplied }: TemplateGalleryProps) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectSlug, setProjectSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listTemplates(category ?? undefined)
      .then((data) => {
        if (!active) return
        setTemplates(data.templates)
        if (data.categories) setCategories(data.categories)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Failed to load templates')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [category])

  const filtered = useMemo(() => templates, [templates])

  useEffect(() => {
    if (!selection) return
    if (selection.kind === 'blank') {
      setProjectName('Untitled Project')
      setProjectSlug(`blank-${Date.now().toString(36).slice(-6)}`)
      return
    }
    setProjectName(selection.template.name)
    setProjectSlug(`${selection.template.slug}-${Date.now().toString(36).slice(-4)}`)
  }, [selection])

  function goToProject(projectId: string) {
    if (onApplied) onApplied(projectId)
    else navigate(`/projects/${projectId}/visual`)
  }

  async function handleApply() {
    if (!selection) return
    setApplying(true)
    setError(null)
    try {
      const name =
        projectName.trim() ||
        (selection.kind === 'blank' ? 'Untitled Project' : selection.template.name)
      const slug = projectSlug.trim() || `site-${Date.now().toString(36).slice(-6)}`

      if (selection.kind === 'blank') {
        const project = await createBlankProject({ name, slug })
        await updateProject(project.id, createEmptyDocument())
        goToProject(project.id)
        return
      }

      const project = await applyTemplate({
        template_id: selection.template.id,
        name,
        slug,
      })
      goToProject(project.id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Session expired. Please sign in again.')
        navigate('/login', { state: { from: '/projects/new' } })
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to create project')
      }
    } finally {
      setApplying(false)
    }
  }

  const selectedTemplate = selection?.kind === 'template' ? selection.template : null
  const isBlank = selection?.kind === 'blank'
  const canCreate = selection !== null

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <TemplateCategoryFilter
          categories={categories}
          active={category}
          onChange={setCategory}
        />

        {loading && <p className="mt-6 text-sm text-gray-500">Loading templates…</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mode === 'select' && (
            <button
              type="button"
              onClick={() => setSelection({ kind: 'blank' })}
              className={`group flex flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
                isBlank ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-2xl text-gray-500 group-hover:border-blue-400 group-hover:text-blue-500">
                    +
                  </span>
                  <span className="text-sm font-medium text-gray-500">Start empty</span>
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow">
                  Blank
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="font-semibold text-gray-900">Blank project</h3>
                <p className="line-clamp-2 text-sm text-gray-500">
                  Start from scratch with an empty canvas and build your own layout.
                </p>
              </div>
            </button>
          )}

          {filtered.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              selected={selectedTemplate?.id === tmpl.id}
              onSelect={(template) => setSelection({ kind: 'template', template })}
            />
          ))}
        </div>

        {!loading && filtered.length === 0 && mode !== 'select' && (
          <p className="mt-6 text-sm text-gray-500">No templates in this category.</p>
        )}
      </div>

      {mode === 'select' && (
        <aside className="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:w-80">
          <h2 className="text-lg font-semibold text-gray-900">New project</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isBlank
              ? 'Starting from a blank canvas'
              : selectedTemplate
                ? `Starting from “${selectedTemplate.name}”`
                : 'Select a template or blank'}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              <span className="font-medium text-gray-700">Project name</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={!canCreate}
                placeholder="My website"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-700">URL slug</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
                disabled={!canCreate}
                placeholder="my-website"
              />
            </label>
          </div>

          {selectedTemplate?.preview_image && (
            <img
              src={selectedTemplate.preview_image}
              alt=""
              className="mt-4 w-full rounded-lg border border-gray-100"
            />
          )}

          <button
            type="button"
            disabled={!canCreate || applying}
            onClick={() => void handleApply()}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {applying ? 'Creating…' : isBlank ? 'Create blank project' : 'Create project'}
          </button>
        </aside>
      )}
    </div>
  )
}
