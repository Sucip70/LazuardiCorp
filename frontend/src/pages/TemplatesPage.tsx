import { AppShell } from '../components/layout/AppShell'
import { TemplateGallery } from '../components/templates/TemplateGallery'

export default function TemplatesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Template gallery</h1>
          <p className="mt-1 text-gray-500">
            Pre-built starters for landing pages, business sites, portfolios, blogs, and stores.
          </p>
        </div>
        <TemplateGallery mode="browse" />
      </div>
    </AppShell>
  )
}
