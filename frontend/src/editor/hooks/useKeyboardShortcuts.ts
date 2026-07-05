import { useEffect } from 'react'
import type { Breakpoint } from '../../types/editor'
import { useEditorStore } from '../store/editorStore'
import { useUIStore } from '../store/uiStore'

type ShortcutHandlers = {
  onSave?: () => void
  onPreview?: () => void
  onExport?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const deleteNode = useEditorStore((s) => s.deleteNode)
  const selectNode = useEditorStore((s) => s.selectNode)
  const selectedId = useEditorStore((s) => s.selectedId)
  const nodes = useEditorStore((s) => s.nodes)
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const resetZoom = useEditorStore((s) => s.resetZoom)
  const toggleGrid = useUIStore((s) => s.toggleGrid)
  const setPreviewMode = useUIStore((s) => s.setPreviewMode)
  const previewMode = useUIStore((s) => s.previewMode)

  useEffect(() => {
    function isEditingTarget(target: EventTarget | null) {
      const el = target as HTMLElement
      const tag = el?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditingTarget(event.target)) return

      const meta = event.metaKey || event.ctrlKey

      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handlers.onSave?.()
        return
      }

      if (meta && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        if (handlers.onPreview) handlers.onPreview()
        else setPreviewMode(!previewMode)
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        handlers.onExport?.()
        return
      }

      if (meta && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (meta && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
        return
      }

      if (event.key === 'Escape') {
        selectNode(null)
        return
      }

      if (meta && event.key === '/') {
        event.preventDefault()
        toggleGrid()
        return
      }

      if (meta && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        zoomIn()
        return
      }

      if (meta && event.key === '-') {
        event.preventDefault()
        zoomOut()
        return
      }

      if (meta && event.key === '0') {
        event.preventDefault()
        resetZoom()
        return
      }

      const bpKeys: Record<string, Breakpoint> = { '1': 'mobile', '2': 'tablet', '3': 'desktop' }
      if (meta && bpKeys[event.key]) {
        event.preventDefault()
        setBreakpoint(bpKeys[event.key])
        return
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        const node = nodes[selectedId]
        if (!node || node.parentId === null) return
        event.preventDefault()
        deleteNode(selectedId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    undo,
    redo,
    deleteNode,
    selectNode,
    selectedId,
    nodes,
    setBreakpoint,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleGrid,
    setPreviewMode,
    previewMode,
    handlers,
  ])
}
