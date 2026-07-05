import { PALETTE_ITEMS } from '../../types/editor'
import { DraggablePaletteItem } from './ComponentPalette'

export function ComponentPaletteSidebar() {
  const categories = [...new Set(PALETTE_ITEMS.map((item) => item.category))]

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Components</h2>
        <p className="text-xs text-gray-500">Drag items onto the canvas</p>
      </div>

      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {category}
          </p>
          {PALETTE_ITEMS.filter((item) => item.category === category).map((item) => (
            <DraggablePaletteItem
              key={item.type}
              type={item.type}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
