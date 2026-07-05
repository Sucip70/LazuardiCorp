import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import type { ComponentType } from '../../types/editor'
import { DND_TYPES } from '../../types/editor'
import { useEditorStore } from '../store/editorStore'
import { findDropTarget } from '../utils/canvasUtils'

type EditorDndProviderProps = {
  children: ReactNode
}

export function EditorDndProvider({ children }: EditorDndProviderProps) {
  const [activePaletteType, setActivePaletteType] = useState<ComponentType | null>(null)
  const addComponent = useEditorStore((s) => s.addComponent)
  const moveNode = useEditorStore((s) => s.moveNode)
  const nodes = useEditorStore((s) => s.nodes)
  const rootIds = useEditorStore((s) => s.rootIds)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.kind === DND_TYPES.PALETTE) {
      setActivePaletteType(data.componentType as ComponentType)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePaletteType(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.kind === DND_TYPES.PALETTE && overData?.kind === 'drop-target') {
      const type = activeData.componentType as ComponentType
      const parentId = findDropTarget(nodes, overData.nodeId as string) ?? rootIds[0]
      if (!parentId) return
      const parent = nodes[parentId]
      addComponent(type, parentId, parent?.children.length ?? 0)
      return
    }

    if (activeData?.kind === DND_TYPES.CANVAS_NODE && overData?.kind === 'drop-target') {
      const nodeId = active.id as string
      const targetParentId = findDropTarget(nodes, overData.nodeId as string)
      if (!targetParentId || targetParentId === nodeId) return

      const parent = nodes[targetParentId]
      moveNode(nodeId, targetParentId, parent?.children.length ?? 0)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
