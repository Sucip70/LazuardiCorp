import { Link } from 'react-router-dom'
import { TemplateGallery } from '../components/templates/TemplateGallery'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link to="/" className="text-sm text-blue-600 hover:underline">
              ← Projects
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Template Gallery</h1>
            <p className="text-sm text-gray-500">
              Pre-built starters for landing pages, business sites, portfolios, blogs, and stores.
            </p>
          </div>
          <Link
            to="/projects/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start from template
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <TemplateGallery mode="browse" />
      </main>
    </div>
  )
}
