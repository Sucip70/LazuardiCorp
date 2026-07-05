import { useDraggable } from '@dnd-kit/core'
import type { ComponentType } from '../../types/editor'
import { DND_TYPES } from '../../types/editor'

type PaletteItemProps = {
  type: ComponentType
  label: string
  icon: string
}

export function DraggablePaletteItem({ type, label, icon }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { kind: DND_TYPES.PALETTE, componentType: type },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={`flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-semibold">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
