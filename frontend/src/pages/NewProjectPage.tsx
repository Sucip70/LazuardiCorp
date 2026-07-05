import { Link } from 'react-router-dom'
import { TemplateGallery } from '../components/templates/TemplateGallery'

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back to projects
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Create a new project</h1>
          <p className="text-sm text-gray-500">Pick a template to get started quickly.</p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <TemplateGallery mode="select" />
      </main>
    </div>
  )
}
