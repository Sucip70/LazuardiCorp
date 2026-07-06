import { PALETTE_ITEMS } from '../../types/editor'
import { ModalPortal, useFilteredPalette, useModalSearch } from './ModalPortal'

type LayerAddChildModalProps = {
  open: boolean
  parentId: string | null
  parentLabel: string
  onClose: () => void
  onSelect: (type: string, parentId: string) => void
}

export function LayerAddChildModal({
  open,
  parentId,
  parentLabel,
  onClose,
  onSelect,
}: LayerAddChildModalProps) {
  const { query, setQuery, reset } = useModalSearch()
  const filtered = useFilteredPalette(PALETTE_ITEMS, query)

  function handleSelect(type: string) {
    if (!parentId) return
    onSelect(type, parentId)
    reset()
    onClose()
  }

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="flex max-h-[80vh] flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add child component</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose a component to add inside <span className="font-medium">{parentLabel}</span>
          </p>
          <input
            autoFocus
            type="search"
            placeholder="Search components…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">No components match your search.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleSelect(item.type)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50 active:bg-blue-100"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900">{item.label}</span>
                  <span className="block text-xs text-gray-500">{item.category}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
