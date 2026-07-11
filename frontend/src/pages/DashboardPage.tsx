import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { deleteProject, listProjects, type Project } from '../api/projects'
import { AppShell } from '../components/layout/AppShell'
import { useCurrentUser } from '../hooks/useCurrentUser'

function projectTitle(project: Project): string {
  const data = project.data as Record<string, unknown> | null
  if (data && typeof data.name === 'string') return data.name
  if (data?.pages && Array.isArray(data.pages) && data.pages[0]) {
    const page = data.pages[0] as Record<string, unknown>
    if (typeof page.name === 'string') return page.name
  }
  return `Project ${project.id.slice(0, 8)}`
}

export function DashboardPage() {
  const { user } = useCurrentUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProjects() {
    setLoading(true)
    setError(null)
    try {
      setProjects(await listProjects())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this project?')) return
    setError(null)
    const previous = projects
    setProjects((list) => list.filter((p) => p.id !== id))
    try {
      await deleteProject(id)
    } catch (err) {
      setProjects(previous)
      setError(err instanceof ApiError ? err.message : 'Failed to delete')
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-1 text-gray-500">Manage your websites and start something new.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/templates"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Templates
            </Link>
            <Link
              to="/projects/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New project
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Projects</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{projects.length}</p>
          </div>
          <Link
            to="/projects/new"
            className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-5 transition hover:border-blue-400 hover:bg-blue-50"
          >
            <p className="font-medium text-blue-700">+ New project</p>
            <p className="mt-1 text-sm text-blue-600/80">Start blank or pick a template</p>
          </Link>
          <Link
            to="/templates"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300"
          >
            <p className="font-medium text-gray-900">Template gallery</p>
            <p className="mt-1 text-sm text-gray-500">Landing, blog, store & more</p>
          </Link>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-gray-900">Your projects</h2>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-600">No projects yet.</p>
            <Link to="/projects/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
              Create your first project →
            </Link>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-gray-900">{projectTitle(project)}</h3>
                <p className="mt-1 font-mono text-xs text-gray-400">{project.id.slice(0, 8)}…</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/projects/${project.id}/visual`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Open editor
                  </Link>
                  <Link
                    to={`/projects/${project.id}`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    JSON
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(project.id)}
                    className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
