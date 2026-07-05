import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  applyTemplate,
  listTemplates,
  type TemplateSummary,
} from '../../api/templates'
import { TemplateCard } from './TemplateCard'
import { TemplateCategoryFilter } from './TemplateCategoryFilter'

type TemplateGalleryProps = {
  mode?: 'browse' | 'select'
  onApplied?: (projectId: string) => void
}

export function TemplateGallery({ mode = 'browse', onApplied }: TemplateGalleryProps) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<TemplateSummary | null>(null)
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
    if (!selected) return
    setProjectName(selected.name)
    setProjectSlug(`${selected.slug}-${Date.now().toString(36).slice(-4)}`)
  }, [selected])

  async function handleApply() {
    if (!selected) return
    setApplying(true)
    setError(null)
    try {
      const project = await applyTemplate({
        template_id: selected.id,
        name: projectName || selected.name,
        slug: projectSlug || `site-${Date.now().toString(36).slice(-6)}`,
      })
      if (onApplied) {
        onApplied(project.id)
      } else {
        navigate(`/projects/${project.id}/visual`)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create project')
    } finally {
      setApplying(false)
    }
  }

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

        {!loading && filtered.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">No templates in this category.</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              selected={selected?.id === tmpl.id}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {mode === 'select' && (
        <aside className="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:w-80">
          <h2 className="text-lg font-semibold text-gray-900">New project</h2>
          <p className="mt-1 text-sm text-gray-500">
            {selected ? `Starting from “${selected.name}”` : 'Select a template'}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              <span className="font-medium text-gray-700">Project name</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={!selected}
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-700">URL slug</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
                disabled={!selected}
              />
            </label>
          </div>

          {selected?.preview_image && (
            <img
              src={selected.preview_image}
              alt=""
              className="mt-4 w-full rounded-lg border border-gray-100"
            />
          )}

          <button
            type="button"
            disabled={!selected || applying}
            onClick={() => void handleApply()}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {applying ? 'Creating…' : 'Create project'}
          </button>
        </aside>
      )}
    </div>
  )
}
