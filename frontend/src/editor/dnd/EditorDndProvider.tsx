import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import type { ComponentType } from '../../types/editor'
import { DND_TYPES } from '../../types/editor'
import { useEditorStore } from '../store/editorStore'
import { useUIStore } from '../store/uiStore'
import { resolveDropParent } from '../utils/canvasUtils'

type EditorDndProviderProps = {
  children: ReactNode
}

function resolveTargetNodeId(overData: Record<string, unknown> | undefined): string | null {
  if (overData?.kind === 'drop-target') return overData.nodeId as string
  return null
}

export function EditorDndProvider({ children }: EditorDndProviderProps) {
  const [activePaletteType, setActivePaletteType] = useState<ComponentType | null>(null)
  const addComponent = useEditorStore((s) => s.addComponent)
  const moveNode = useEditorStore((s) => s.moveNode)
  const setDropTargetParentId = useUIStore((s) => s.setDropTargetParentId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function updateDropTargetHighlight(event: DragOverEvent | DragEndEvent) {
    const { active, over } = event
    const activeData = active.data.current
    const isPalette = activeData?.kind === DND_TYPES.PALETTE
    const isCanvasNode = activeData?.kind === DND_TYPES.CANVAS_NODE

    if (!isPalette && !isCanvasNode) {
      setDropTargetParentId(null)
      return
    }

    if (!over) {
      setDropTargetParentId(null)
      return
    }

    const { nodes, rootIds } = useEditorStore.getState()
    const overData = over.data.current
    const targetNodeId = resolveTargetNodeId(overData)
    const parentId = resolveDropParent(nodes, rootIds, targetNodeId)

    if (isCanvasNode && parentId === active.id) {
      setDropTargetParentId(null)
      return
    }

    setDropTargetParentId(parentId)
  }

  function clearDropHighlight() {
    setActivePaletteType(null)
    setDropTargetParentId(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.kind === DND_TYPES.PALETTE) {
      setActivePaletteType(data.componentType as ComponentType)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    updateDropTargetHighlight(event)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeData = active.data.current
    const { nodes, rootIds } = useEditorStore.getState()
    const highlightedParentId = useUIStore.getState().dropTargetParentId

    if (activeData?.kind === DND_TYPES.PALETTE) {
      const type = activeData.componentType as ComponentType
      const overData = over?.data.current as Record<string, unknown> | undefined
      const resolvedFromOver = over
        ? resolveDropParent(nodes, rootIds, resolveTargetNodeId(overData))
        : null
      const parentId = highlightedParentId ?? resolvedFromOver

      if (parentId && nodes[parentId]) {
        const parent = nodes[parentId]
        addComponent(type, parentId, parent.children.length)
      }
    } else if (activeData?.kind === DND_TYPES.CANVAS_NODE) {
      const nodeId = active.id as string
      const overData = over?.data.current as Record<string, unknown> | undefined
      const resolvedFromOver =
        overData?.kind === 'drop-target'
          ? resolveDropParent(nodes, rootIds, overData.nodeId as string)
          : null
      const targetParentId = highlightedParentId ?? resolvedFromOver

      if (targetParentId && targetParentId !== nodeId && nodes[targetParentId]) {
        const parent = nodes[targetParentId]
        moveNode(nodeId, targetParentId, parent.children.length)
      }
    }

    clearDropHighlight()
  }

  function handleDragCancel() {
    clearDropHighlight()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activePaletteType ? (
          <div className="rounded-md border border-blue-400 bg-white px-3 py-2 text-sm shadow-lg">
            Add {activePaletteType}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
