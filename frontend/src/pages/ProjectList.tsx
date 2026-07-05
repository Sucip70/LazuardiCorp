import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { deleteProject, listProjects, type Project } from '../api/projects'

function previewData(data: unknown): string {
  const text = JSON.stringify(data)
  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProjects() {
    setLoading(true)
    setError(null)
    try {
      setProjects(await listProjects())
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to load projects'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    listProjects()
      .then((data) => {
        if (active) {
          setProjects(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) {
          const message =
            err instanceof ApiError ? err.message : 'Failed to load projects'
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
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm(`Delete project ${id}?`)) {
      return
    }

    try {
      await deleteProject(id)
      await loadProjects()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete project'
      setError(message)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Projects</h1>
        <div className="flex gap-2">
          <Link className="button" to="/templates">
            Templates
          </Link>
          <Link className="button primary" to="/projects/new">
            New Project
          </Link>
        </div>
      </header>

      {loading && <p className="status">Loading projects...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <p className="status">No projects yet. Create your first one.</p>
      )}

      {!loading && projects.length > 0 && (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-item">
              <div className="project-meta">
                <code>{project.id}</code>
                <span className="project-preview">{previewData(project.data)}</span>
              </div>
              <div className="project-actions">
                <Link className="button" to={`/projects/${project.id}/visual`}>
                  Visual
                </Link>
                <Link className="button" to={`/projects/${project.id}`}>
                  Edit
                </Link>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => void handleDelete(project.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
