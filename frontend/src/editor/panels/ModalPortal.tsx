import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalPortalProps = {
  open: boolean
  children: ReactNode
  onClose: () => void
}

export function ModalPortal({ open, children, onClose }: ModalPortalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function useModalSearch(initial = '') {
  const [query, setQuery] = useState(initial)
  return { query, setQuery, reset: () => setQuery('') }
}

export function useFilteredPalette<T extends { label: string; type: string; category: string }>(
  items: T[],
  query: string,
) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    )
  }, [items, query])
}
