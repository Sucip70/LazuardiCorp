import type { Breakpoint } from '../types/editor'
import { useEditorStore } from './store/editorStore'

const BREAKPOINTS: { id: Breakpoint; label: string; width: string }[] = [
  { id: 'mobile', label: 'Mobile', width: '375px' },
  { id: 'tablet', label: 'Tablet', width: '768px' },
  { id: 'desktop', label: 'Desktop', width: '1280px' },
]

export function EditorToolbar() {
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

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Redo
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.id}
            type="button"
            onClick={() => setBreakpoint(bp.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              breakpoint === bp.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={zoomOut}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        >
          −
        </button>
        <span className="min-w-14 text-center text-sm text-gray-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        >
          Reset
        </button>
      </div>
    </header>
  )
}
