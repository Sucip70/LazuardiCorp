import { AppShell } from '../components/layout/AppShell'
import { TemplateGallery } from '../components/templates/TemplateGallery'

export default function NewProjectPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a new project</h1>
          <p className="mt-1 text-gray-500">Start blank or pick a template to get going quickly.</p>
        </div>
        <TemplateGallery mode="select" />
      </div>
    </AppShell>
  )
}
