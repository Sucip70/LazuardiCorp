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
  const childCount = useEditorStore((s) => s.nodes[nodeId]?.children?.length ?? 0)
  const nodes = useEditorStore((s) => s.nodes)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const dropTargetParentId = useUIStore((s) => s.dropTargetParentId)

  const { setNodeRef: setDropRef } = useDroppable({
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

  const isDropParent = editable && dropTargetParentId === nodeId
  const parentLabel = node.meta?.label ?? node.type

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
      className={`relative min-h-[1.5rem] transition-shadow duration-100 ${
        isDropParent
          ? 'z-10 outline outline-2 outline-blue-500 ring-4 ring-blue-200/80'
          : ''
      }`}
      data-child-count={childCount}
      {...(editable ? attributes : {})}
      {...(editable ? listeners : {})}
    >
      {isDropParent && (
        <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          Drop into {parentLabel}
        </div>
      )}
      <RuntimeNodeRenderer
        node={node}
        nodes={nodes}
        breakpoint={breakpoint}
        selectedId={editable ? selectedId : null}
        onSelect={editable ? selectNode : undefined}
        editable={editable}
        renderChild={(childId) => (
          <CanvasNode key={childId} nodeId={childId} editable={editable} />
        )}
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
  const dropTargetParentId = useUIStore((s) => s.dropTargetParentId)

  const width = BREAKPOINT_WIDTHS[breakpoint]
  const editable = !previewMode
  const artboardHeight = 640
  const labelHeight = 24
  const scaledWidth = width * zoom
  const scaledHeight = (artboardHeight + labelHeight) * zoom

  const { setNodeRef: setCanvasDropRef, isOver: isCanvasOver } = useDroppable({
    id: 'canvas-drop-zone',
    data: { kind: 'canvas-drop-zone' },
    disabled: !editable,
  })

  const showCanvasHint = editable && isCanvasOver && !dropTargetParentId

  return (
    <div
      className="h-full w-full overflow-auto"
      onClick={() => editable && selectNode(null)}
    >
      <div
        className="mx-auto w-fit min-h-full p-4 sm:p-8"
        style={{ minWidth: scaledWidth + 32 }}
      >
        <div style={{ width: scaledWidth, minHeight: scaledHeight }}>
          <div
            className="origin-top-left"
            style={{
              transform: `scale(${zoom})`,
              width,
              minHeight: artboardHeight + labelHeight,
            }}
          >
            <div
              ref={setCanvasDropRef}
              className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-colors duration-100 ${
                previewMode
                  ? 'border-green-200 ring-2 ring-green-100'
                  : showCanvasHint
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-gray-200'
              }`}
              data-breakpoint={breakpoint}
              style={{ width, minHeight: artboardHeight }}
            >
              <CanvasGrid visible={showGrid && editable} />
              {previewMode && (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                  Preview
                </div>
              )}
              {rootIds.length === 0 ? (
                <div className="flex min-h-[640px] items-center justify-center p-8 text-sm text-gray-400">
                  Drop components here
                </div>
              ) : (
                rootIds.map((rootId) => (
                  <CanvasNode key={rootId} nodeId={rootId} editable={editable} />
                ))
              )}
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              {width}px · {breakpoint}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
