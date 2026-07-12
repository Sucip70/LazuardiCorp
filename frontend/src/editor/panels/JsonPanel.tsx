import { useEffect, useMemo, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import type { ComponentNode } from '../../types/editor'

function serializeNode(node: ComponentNode): string {
  return JSON.stringify(node, null, 2)
}

export function JsonPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  const node = useEditorStore((s) => (selectedId ? s.nodes[selectedId] : null))
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const updateNodeAttributes = useEditorStore((s) => s.updateNodeAttributes)
  const updateNodeMeta = useEditorStore((s) => s.updateNodeMeta)

  const source = useMemo(() => (node ? serializeNode(node) : ''), [node])
  const [text, setText] = useState(source)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    setText(source)
    setError(null)
    setApplied(false)
  }, [source, selectedId])

  function handleApply() {
    if (!node || !selectedId) return
    try {
      const parsed = JSON.parse(text) as Partial<ComponentNode>
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('JSON must be an object')
        return
      }

      if (parsed.props && typeof parsed.props === 'object') {
        // Replace props wholesale by clearing then merging from empty via full object
        updateNodeProps(selectedId, parsed.props as Record<string, unknown>)
      }
      if (parsed.styles !== undefined) {
        updateNodeStyles(selectedId, parsed.styles as ComponentNode['styles'])
      }
      if (parsed.events && typeof parsed.events === 'object') {
        updateNodeEvents(selectedId, parsed.events as Record<string, unknown>)
      }
      if (parsed.attributes && typeof parsed.attributes === 'object') {
        updateNodeAttributes(
          selectedId,
          parsed.attributes as Record<string, string | number | boolean>,
        )
      }
      if (parsed.meta && typeof parsed.meta === 'object') {
        updateNodeMeta(selectedId, parsed.meta as ComponentNode['meta'])
      }

      setError(null)
      setApplied(true)
      window.setTimeout(() => setApplied(false), 1500)
    } catch {
      setError('Invalid JSON')
    }
  }

  if (!selectedId || !node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-gray-700">No component selected</p>
        <p className="text-xs text-gray-500">
          Select a component on the canvas or in Layers to inspect its JSON here.
        </p>
      </div>
    )
  }

  const dirty = text !== source

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <p className="truncate text-xs font-medium text-gray-800">
          {node.meta?.label ?? node.type}
          <span className="ml-1 font-normal text-gray-400">({node.type})</span>
        </p>
        <p className="mt-0.5 break-all font-mono text-[10px] text-gray-400">{node.id}</p>
      </div>

      <textarea
        className="min-h-0 flex-1 resize-none border-0 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800 outline-none focus:bg-white"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
          setApplied(false)
        }}
      />

      <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 px-3 py-2">
        {error && <span className="flex-1 text-xs text-red-600">{error}</span>}
        {applied && !error && <span className="flex-1 text-xs text-green-600">Applied</span>}
        {!error && !applied && (
          <span className="flex-1 text-[11px] text-gray-400">
            {dirty ? 'Unsaved edits in panel' : 'Synced with selection'}
          </span>
        )}
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setText(source)
            setError(null)
          }}
          className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={handleApply}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
