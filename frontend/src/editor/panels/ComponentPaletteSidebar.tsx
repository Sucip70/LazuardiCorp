import { useMemo, useState } from 'react'
import { PALETTE_ITEMS } from '../../types/editor'
import { DraggablePaletteItem } from './ComponentPalette'

export function ComponentPaletteSidebar() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PALETTE_ITEMS
    return PALETTE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    )
  }, [query])

  const categories = [...new Set(filtered.map((item) => item.category))]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 space-y-3 border-b border-gray-100 p-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Components</h2>
          <p className="text-xs text-gray-500">Drag items onto the canvas</p>
        </div>
        <label className="block">
          <span className="sr-only">Search components</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">No components match “{query.trim()}”</p>
        ) : (
          categories.map((category) => (
            <div key={category} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {category}
              </p>
              {filtered
                .filter((item) => item.category === category)
                .map((item) => (
                  <DraggablePaletteItem
                    key={item.type}
                    type={item.type}
                    label={item.label}
                    icon={item.icon}
                  />
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
