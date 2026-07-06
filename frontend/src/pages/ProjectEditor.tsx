import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createProject, getProject, updateProject } from '../api/projects'
import { AppShell } from '../components/layout/AppShell'

export default function ProjectEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [jsonText, setJsonText] = useState('{}')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !id) return

    const projectId = id
    let active = true

    getProject(projectId)
      .then((project) => {
        if (active) setJsonText(JSON.stringify(project.data, null, 2))
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load project')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, isNew])

  function parseJson(): unknown | null {
    try {
      const parsed: unknown = JSON.parse(jsonText)
      setValidationError(null)
      return parsed
    } catch {
      setValidationError('Invalid JSON. Fix the syntax before saving.')
      return null
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const data = parseJson()
    if (data === null) return

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        await createProject(data)
      } else if (id) {
        await updateProject(id, data)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'New project (JSON)' : 'Edit project JSON'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isNew
                ? 'Create a project by pasting raw JSON data.'
                : 'Advanced editing — prefer the visual editor for day-to-day work.'}
            </p>
            {id && (
              <p className="mt-1 font-mono text-xs text-gray-400">{id}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {id && (
              <Link
                to={`/projects/${id}/visual`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Visual editor
              </Link>
            )}
            <Link
              to="/"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to home
            </Link>
          </div>
        </div>

        {loading && (
          <p className="mt-8 text-sm text-gray-500">Loading project…</p>
        )}

        {!loading && (
          <form
            className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={(e) => void handleSubmit(e)}
          >
            <label htmlFor="project-json" className="text-sm font-medium text-gray-700">
              Project JSON
            </label>
            <textarea
              id="project-json"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setValidationError(null)
              }}
              rows={24}
              spellCheck={false}
            />

            {validationError && (
              <p className="mt-3 text-sm text-red-600">{validationError}</p>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <Link
                to="/"
                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
