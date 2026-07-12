import type { LeftPanelTab } from '../store/uiStore'
import { useUIStore } from '../store/uiStore'
import { useVariablesStore } from '../store/variablesStore'
import { usePagesStore } from '../store/pagesStore'
import { ComponentPaletteSidebar } from '../panels/ComponentPaletteSidebar'
import { LayersPanel } from '../panels/LayersPanel'
import { PagesPanel } from '../panels/PagesPanel'
import { VariablesPanel } from '../panels/VariablesPanel'

const TABS: { id: LeftPanelTab; label: string; icon: string }[] = [
  { id: 'components', label: 'Components', icon: '▦' },
  { id: 'pages', label: 'Pages', icon: '📄' },
  { id: 'layers', label: 'Layers', icon: '☰' },
  { id: 'variables', label: 'Variables', icon: '𝑥' },
]

type LeftSidebarProps = {
  className?: string
  onSelectPage?: (pageId: string) => void
  onAddPage?: (name: string) => void | Promise<void>
  onDeletePage?: (pageId: string) => void | Promise<void>
  pagesBusy?: boolean
}

export function LeftSidebar({
  className = '',
  onSelectPage,
  onAddPage,
  onDeletePage,
  pagesBusy = false,
}: LeftSidebarProps) {
  const tab = useUIStore((s) => s.leftPanelTab)
  const setTab = useUIStore((s) => s.setLeftPanelTab)
  const setActivePageId = useVariablesStore((s) => s.setActivePageId)
  const activePageId = useVariablesStore((s) => s.activePageId)
  const pages = usePagesStore((s) => s.pages)

  function handleSelectPage(pageId: string) {
    if (pageId === activePageId) return
    onSelectPage?.(pageId)
    // activePageId is updated by the parent after a successful switch
    if (!onSelectPage) setActivePageId(pageId)
  }

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-200 bg-white ${className}`}
    >
      <nav className="flex shrink-0 border-b border-gray-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] sm:text-xs ${
              tab === item.id
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={item.label}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="hidden truncate sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'components' && <ComponentPaletteSidebar />}
        {tab === 'pages' && (
          <PagesPanel
            pages={pages}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            onAddPage={onAddPage}
            onDeletePage={onDeletePage}
            busy={pagesBusy}
          />
        )}
        {tab === 'layers' && <LayersPanel />}
        {tab === 'variables' && <VariablesPanel />}
      </div>
    </aside>
  )
}
