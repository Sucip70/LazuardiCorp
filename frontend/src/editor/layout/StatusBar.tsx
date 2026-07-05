import type { Breakpoint } from '../../types/editor'
import { BREAKPOINT_WIDTHS } from '../../types/editor'
import { useEditorStore } from '../store/editorStore'
import { useUIStore } from '../store/uiStore'

const BREAKPOINTS: { id: Breakpoint; label: string; icon: string }[] = [
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'tablet', label: 'Tablet', icon: '📲' },
  { id: 'desktop', label: 'Desktop', icon: '🖥' },
]

type StatusBarProps = {
  nodeCount?: number
  projectId?: string
}

export function StatusBar({ nodeCount = 0, projectId }: StatusBarProps) {
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint)
  const zoom = useEditorStore((s) => s.zoom)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const resetZoom = useEditorStore((s) => s.resetZoom)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const canUndo = useEditorStore((s) => s.canUndo())
  const canRedo = useEditorStore((s) => s.canRedo())
  const selectedId = useEditorStore((s) => s.selectedId)
  const showGrid = useUIStore((s) => s.showGrid)
  const toggleGrid = useUIStore((s) => s.toggleGrid)
  const saveStatus = useUIStore((s) => s.saveStatus)
  const saveMessage = useUIStore((s) => s.saveMessage)

  return (
    <footer className="flex h-10 shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-2 text-xs text-gray-600 sm:px-4">
      {/* Status message */}
      <div className="hidden min-w-0 flex-1 truncate sm:block">
        {saveMessage ?? (
          <>
            {selectedId ? `Selected: ${selectedId.slice(0, 16)}…` : 'No selection'}
            {' · '}
            {nodeCount} nodes
            {projectId && ` · ${projectId.slice(0, 8)}`}
          </>
        )}
        {saveStatus === 'saved' && !saveMessage && (
          <span className="text-green-600"> · All changes saved</span>
        )}
      </div>

      {/* Undo / redo — compact */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          ↪
        </button>
      </div>

      <div className="hidden h-4 w-px bg-gray-200 sm:block" />

      {/* Responsive preview modes */}
      <div
        className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5"
        role="group"
        aria-label="Responsive preview"
      >
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.id}
            type="button"
            onClick={() => setBreakpoint(bp.id)}
            className={`rounded px-2 py-1 ${
              breakpoint === bp.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={`${bp.label} (${BREAKPOINT_WIDTHS[bp.id]}px)`}
          >
            <span className="sm:hidden">{bp.icon}</span>
            <span className="hidden sm:inline">{bp.label}</span>
          </button>
        ))}
      </div>

      <div className="hidden h-4 w-px bg-gray-200 md:block" />

      {/* Grid toggle */}
      <button
        type="button"
        onClick={toggleGrid}
        className={`hidden rounded px-2 py-1 md:inline-block ${
          showGrid ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
        }`}
        title="Toggle grid (Ctrl+/)"
      >
        Grid
      </button>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
        <button
          type="button"
          onClick={zoomOut}
          className="rounded px-2 py-1 hover:bg-gray-100"
          title="Zoom out (Ctrl+-)"
        >
          −
        </button>
        <span className="min-w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={zoomIn}
          className="rounded px-2 py-1 hover:bg-gray-100"
          title="Zoom in (Ctrl+=)"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="hidden rounded px-2 py-1 hover:bg-gray-100 sm:inline-block"
          title="Reset zoom (Ctrl+0)"
        >
          100%
        </button>
      </div>
    </footer>
  )
}
