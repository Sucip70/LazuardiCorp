import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { saveProjectAsTemplate, TEMPLATE_CATEGORY_LABELS } from '../../api/templates'

type SaveAsTemplateModalProps = {
  projectId: string
  open: boolean
  onClose: () => void
  onSaved?: (templateId: string) => void
}

const CATEGORIES = Object.keys(TEMPLATE_CATEGORY_LABELS)

export function SaveAsTemplateModal({ projectId, open, onClose, onSaved }: SaveAsTemplateModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('landing')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const tmpl = await saveProjectAsTemplate(projectId, { name, category, description })
      onSaved?.(tmpl.id)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Save as template</h2>
        <p className="mt-1 text-sm text-gray-500">Create a reusable template from this project (version 1).</p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Category</span>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {TEMPLATE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Description</span>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
