import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  createProject,
  getProject,
  updateProject,
} from '../api/projects'

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
    if (isNew || !id) {
      return
    }

    const projectId = id
    let active = true

    getProject(projectId)
      .then((project) => {
        if (active) {
          setJsonText(JSON.stringify(project.data, null, 2))
        }
      })
      .catch((err) => {
        if (active) {
          const message =
            err instanceof ApiError ? err.message : 'Failed to load project'
          setError(message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
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
    if (data === null) {
      return
    }

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
      const message =
        err instanceof ApiError ? err.message : 'Failed to save project'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>{isNew ? 'New Project' : 'Edit Project'}</h1>
        <Link className="button" to="/">
          Back to list
        </Link>
      </header>

      {loading && <p className="status">Loading project...</p>}

      {!loading && (
        <form className="editor-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="project-json">Project JSON</label>
          <textarea
            id="project-json"
            className="json-editor"
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value)
              setValidationError(null)
            }}
            rows={20}
            spellCheck={false}
          />

          {validationError && <p className="error">{validationError}</p>}
          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <Link className="button" to="/">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}
