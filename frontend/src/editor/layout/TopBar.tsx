import { Link } from 'react-router-dom'
import { useCollaboration } from '../store/collaborationStore'
import { useEditorStore } from '../store/editorStore'
import { useUIStore } from '../store/uiStore'

type TopBarProps = {
  projectName: string
  backHref: string
  saving?: boolean
  onSave?: () => void
  onPreview?: () => void
  onExport?: () => void
  onSaveAsTemplate?: () => void
}

export function TopBar({
  projectName,
  backHref,
  saving = false,
  onSave,
  onPreview,
  onExport,
  onSaveAsTemplate,
}: TopBarProps) {
  const saveStatus = useUIStore((s) => s.saveStatus)
  const previewMode = useUIStore((s) => s.previewMode)
  const setPreviewMode = useUIStore((s) => s.setPreviewMode)
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar)
  const zoom = useEditorStore((s) => s.zoom)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const resetZoom = useEditorStore((s) => s.resetZoom)
  const { collaborators, connectionStatus } = useCollaboration()

  const saveLabel =
    saving || saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'Save'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 sm:px-4">
      {/* Mobile sidebar toggles */}
      <div className="flex items-center gap-1 lg:hidden">
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Toggle components panel"
        >
          ☰
        </button>
      </div>

      {/* Logo + project */}
      <Link to={backHref} className="flex items-center gap-2 shrink-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          L
        </span>
        <span className="hidden font-semibold text-gray-900 sm:inline">Lazuardi</span>
      </Link>

      <span className="hidden text-gray-300 sm:inline">/</span>
      <p className="truncate text-sm font-medium text-gray-800 max-w-[120px] sm:max-w-xs">
        {projectName}
      </p>

      {/* Collaboration avatars */}
      {collaborators.length > 0 && (
        <div className="ml-2 hidden items-center -space-x-2 sm:flex" title={`Collaboration: ${connectionStatus}`}>
          {collaborators.slice(0, 4).map((user) => (
            <span
              key={user.id}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0)}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Zoom — visible in top bar for quick access */}
      <div className="hidden items-center gap-0.5 rounded-lg border border-gray-200 p-0.5 sm:flex">
        <button
          type="button"
          onClick={zoomOut}
          className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          title="Zoom out (Ctrl+-)"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="min-w-12 rounded px-1 py-1 text-xs font-medium hover:bg-gray-100"
          title="Reset zoom (Ctrl+0)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          title="Zoom in (Ctrl+=)"
        >
          +
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saveStatus === 'saving'}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 sm:px-3"
          title="Save (Ctrl+S)"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (onPreview) onPreview()
            else setPreviewMode(!previewMode)
          }}
          className={`rounded-md border px-2 py-1.5 text-sm sm:px-3 ${
            previewMode
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
          title="Preview (Ctrl+P)"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onExport}
          className="hidden rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 sm:inline-block"
          title="Export (Ctrl+Shift+E)"
        >
          Export
        </button>
        {onSaveAsTemplate && (
          <button
            type="button"
            onClick={onSaveAsTemplate}
            className="hidden rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 md:inline-block"
            title="Save as template"
          >
            Template
          </button>
        )}
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle properties panel"
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
