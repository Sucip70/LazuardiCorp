import { useEditorStore } from '../store/editorStore'
import type { ComponentNode } from '../../types/editor'

function LayerRow({
  node,
  nodes,
  depth,
}: {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  depth: number
}) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const isSelected = selectedId === node.id

  return (
    <>
      <button
        type="button"
        onClick={() => selectNode(node.id)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="truncate font-mono text-xs text-gray-400">{node.type}</span>
        <span className="truncate">{node.meta?.label ?? node.id.slice(0, 12)}</span>
        {node.meta?.locked && <span className="ml-auto text-xs">🔒</span>}
      </button>
      {node.children.map((childId) => {
        const child = nodes[childId]
        if (!child) return null
        return <LayerRow key={childId} node={child} nodes={nodes} depth={depth + 1} />
      })}
    </>
  )
}

export function LayersPanel() {
  const rootIds = useEditorStore((s) => s.rootIds)
  const nodes = useEditorStore((s) => s.nodes)

  return (
    <div className="flex h-full flex-col overflow-auto p-2">
      <p className="mb-2 px-2 text-xs text-gray-500">Document tree — click to select</p>
      {rootIds.map((rootId) => {
        const node = nodes[rootId]
        if (!node) return null
        return <LayerRow key={rootId} node={node} nodes={nodes} depth={0} />
      })}
    </div>
  )
}
