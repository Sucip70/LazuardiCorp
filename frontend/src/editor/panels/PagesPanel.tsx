import { useEditorStore } from '../store/editorStore'

export type EditorPage = {
  id: string
  name: string
  path: string
  isHome?: boolean
}

type PagesPanelProps = {
  pages?: EditorPage[]
  activePageId?: string
  onSelectPage?: (pageId: string) => void
  onAddPage?: () => void
}

const DEFAULT_PAGES: EditorPage[] = [
  { id: 'page_home', name: 'Home', path: '/', isHome: true },
]

export function PagesPanel({
  pages = DEFAULT_PAGES,
  activePageId = 'page_home',
  onSelectPage,
  onAddPage,
}: PagesPanelProps) {
  const selectedId = useEditorStore((s) => s.selectedId)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={onAddPage}
          className="w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
        >
          + New page
        </button>
      </div>
      <ul className="flex-1 overflow-auto p-2">
        {pages.map((page) => {
          const active = page.id === activePageId
          return (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelectPage?.(page.id)}
                className={`mb-1 flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{page.name}</span>
                <span className="text-xs text-gray-400">{page.path}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
        {selectedId ? 'Editing current page canvas' : 'Select a page'}
      </p>
    </div>
  )
}
