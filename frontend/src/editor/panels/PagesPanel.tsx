import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { suggestPagePath, usePagesStore } from '../store/pagesStore'
import { useEditorStore } from '../store/editorStore'

export type EditorPage = {
  id: string
  name: string
  path: string
  isHome?: boolean
}

type PagesPanelProps = {
  pages?: EditorPage[]
  activePageId?: string
  onSelectPage?: (pageId: string) => void
  onAddPage?: (name: string) => void | Promise<void>
  onRenamePage?: (pageId: string, name: string) => void | Promise<void>
  onDeletePage?: (pageId: string) => void | Promise<void>
  busy?: boolean
}

function TrashIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.226-.038.337 9.022A2.75 2.75 0 006.92 17.5h6.16a2.75 2.75 0 002.742-2.543l.337-9.022.226.038a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PencilIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  )
}

export function PagesPanel({
  pages: pagesProp,
  activePageId = '',
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  busy = false,
}: PagesPanelProps) {
  const storePages = usePagesStore((s) => s.pages)
  const pages = pagesProp ?? storePages
  const selectedId = useEditorStore((s) => s.selectedId)
  const [modalOpen, setModalOpen] = useState(false)
  const [pageName, setPageName] = useState('New page')
  const [submitting, setSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<EditorPage | null>(null)
  const [editName, setEditName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EditorPage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const editTitleId = useId()
  const deleteTitleId = useId()

  const previewPath = suggestPagePath(
    pageName || 'page',
    pages.map((p) => p.path),
  )

  useEffect(() => {
    if (!modalOpen) return
    const t = window.setTimeout(() => nameInputRef.current?.select(), 50)
    return () => window.clearTimeout(t)
  }, [modalOpen])

  useEffect(() => {
    if (!editTarget) return
    const t = window.setTimeout(() => editInputRef.current?.select(), 50)
    return () => window.clearTimeout(t)
  }, [editTarget])

  function openModal() {
    if (!onAddPage || busy) return
    setPageName('New page')
    setModalOpen(true)
  }

  function closeModal() {
    if (submitting) return
    setModalOpen(false)
  }

  function openEditModal(page: EditorPage) {
    if (!onRenamePage || busy) return
    setEditTarget(page)
    setEditName(page.name)
  }

  function closeEditModal() {
    if (renaming) return
    setEditTarget(null)
  }

  function closeDeleteModal() {
    if (deleting) return
    setDeleteTarget(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = pageName.trim()
    if (!name || !onAddPage) return
    setSubmitting(true)
    try {
      await onAddPage(name)
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRenameSubmit(e: FormEvent) {
    e.preventDefault()
    const name = editName.trim()
    if (!name || !editTarget || !onRenamePage) return
    if (name === editTarget.name) {
      setEditTarget(null)
      return
    }
    setRenaming(true)
    try {
      await onRenamePage(editTarget.id, name)
      setEditTarget(null)
    } finally {
      setRenaming(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !onDeletePage) return
    setDeleting(true)
    try {
      await onDeletePage(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const actionCount = (onRenamePage ? 1 : 0) + (onDeletePage ? 1 : 0)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={openModal}
          disabled={!onAddPage || busy}
          title={onAddPage ? 'Create a new page' : 'Open a saved project to add pages'}
          className="w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + New page
        </button>
      </div>
      <ul className="flex-1 overflow-auto p-2">
        {pages.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-gray-400">No pages yet</li>
        )}
        {pages.map((page) => {
          const active = page.id === activePageId
          const showDelete = Boolean(onDeletePage && !page.isHome)
          const showEdit = Boolean(onRenamePage)
          const pr = showEdit && showDelete ? 'pr-14' : actionCount > 0 ? 'pr-8' : 'pr-3'
          return (
            <li key={page.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelectPage?.(page.id)}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  if (showEdit) openEditModal(page)
                }}
                disabled={busy}
                className={`mb-1 flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${pr} ${
                  active
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">
                  {page.name}
                  {page.isHome ? (
                    <span className="ml-1 text-[10px] font-normal text-gray-400">home</span>
                  ) : null}
                </span>
                <span className="text-xs text-gray-400">{page.path}</span>
              </button>
              {(showEdit || showDelete) && (
                <div className="absolute right-1.5 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  {showEdit && (
                    <button
                      type="button"
                      title="Rename page"
                      aria-label={`Rename ${page.name}`}
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(page)
                      }}
                      className="inline-flex rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                    >
                      <PencilIcon />
                    </button>
                  )}
                  {showDelete && (
                    <button
                      type="button"
                      title="Delete page"
                      aria-label={`Delete ${page.name}`}
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(page)
                      }}
                      className="inline-flex rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
        {selectedId ? 'Editing current page canvas' : 'Select a page'}
      </p>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              New page
            </h2>
            <p className="mt-1 text-sm text-gray-500">Give this page a name. Path is generated automatically.</p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">Name</span>
                <input
                  ref={nameInputRef}
                  required
                  autoFocus
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="About"
                  disabled={submitting}
                />
              </label>
              <p className="text-xs text-gray-400">
                Path: <span className="font-mono text-gray-600">{previewPath}</span>
              </p>
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !pageName.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={editTitleId}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 id={editTitleId} className="text-base font-semibold text-gray-900">
              Rename page
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Path stays <span className="font-mono text-gray-600">{editTarget.path}</span>
            </p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void handleRenameSubmit(e)}>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">Name</span>
                <input
                  ref={editInputRef}
                  required
                  autoFocus
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={renaming}
                />
              </label>
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={renaming}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !editName.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {renaming ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 id={deleteTitleId} className="text-base font-semibold text-gray-900">
              Delete page
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{deleteTarget.name}</span>
              <span className="text-gray-400"> ({deleteTarget.path})</span>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
