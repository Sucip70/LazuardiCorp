import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { BREAKPOINT_WIDTHS } from '../../types/editor'
import { DND_TYPES } from '../../types/editor'
import { RuntimeNodeRenderer } from '../../components/runtime/NodeRenderer'
import { useUIStore } from '../store/uiStore'
import { useEditorStore } from '../store/editorStore'
import { CanvasGrid } from './CanvasGrid'
import { SelectionOverlay } from './SelectionOverlay'

function CanvasNode({ nodeId, editable }: { nodeId: string; editable: boolean }) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const nodes = useEditorStore((s) => s.nodes)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectNode = useEditorStore((s) => s.selectNode)

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${nodeId}`,
    data: { kind: 'drop-target', nodeId },
    disabled: !editable,
  })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: nodeId,
    data: { kind: DND_TYPES.CANVAS_NODE, nodeId },
    disabled: !editable || node?.meta?.locked || node?.parentId === null,
  })

  if (!node) return null

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <div
      ref={(el) => {
        setDropRef(el)
        setNodeRef(el)
      }}
      style={style}
      className={`relative ${isOver && editable ? 'outline outline-2 outline-dashed outline-blue-400' : ''}`}
      {...(editable ? attributes : {})}
      {...(editable ? listeners : {})}
    >
      <RuntimeNodeRenderer
        node={node}
        nodes={nodes}
        breakpoint={breakpoint}
        selectedId={editable ? selectedId : null}
        onSelect={editable ? selectNode : undefined}
        editable={editable}
      />
      {editable && selectedId === nodeId && <SelectionOverlay nodeId={nodeId} />}
    </div>
  )
}

type CanvasProps = {
  previewMode?: boolean
}

export function Canvas({ previewMode = false }: CanvasProps) {
  const rootIds = useEditorStore((s) => s.rootIds)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const zoom = useEditorStore((s) => s.zoom)
  const selectNode = useEditorStore((s) => s.selectNode)
  const showGrid = useUIStore((s) => s.showGrid)

  const width = BREAKPOINT_WIDTHS[breakpoint]
  const editable = !previewMode

  return (
    <div
      className="flex h-full items-start justify-center overflow-auto p-4 sm:p-8"
      onClick={() => editable && selectNode(null)}
    >
      <div
        className="origin-top transition-transform duration-150"
        style={{ transform: `scale(${zoom})` }}
      >
        <div
          className={`relative overflow-hidden rounded-xl border bg-white shadow-sm ${
            previewMode ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'
          }`}
          data-breakpoint={breakpoint}
          style={{ width, minHeight: 640 }}
        >
          <CanvasGrid visible={showGrid && editable} />
          {previewMode && (
            <div className="absolute left-3 top-3 z-10 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
              Preview
            </div>
          )}
          {rootIds.map((rootId) => (
            <CanvasNode key={rootId} nodeId={rootId} editable={editable} />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          {width}px · {breakpoint}
        </p>
      </div>
    </div>
  )
}
