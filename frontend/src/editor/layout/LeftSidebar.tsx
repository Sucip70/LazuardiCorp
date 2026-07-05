import type { LeftPanelTab } from '../store/uiStore'
import { useUIStore } from '../store/uiStore'
import { ComponentPaletteSidebar } from '../panels/ComponentPaletteSidebar'
import { LayersPanel } from '../panels/LayersPanel'
import { PagesPanel } from '../panels/PagesPanel'

const TABS: { id: LeftPanelTab; label: string; icon: string }[] = [
  { id: 'components', label: 'Components', icon: '▦' },
  { id: 'pages', label: 'Pages', icon: '📄' },
  { id: 'layers', label: 'Layers', icon: '☰' },
]

type LeftSidebarProps = {
  className?: string
  onSelectPage?: (pageId: string) => void
}

export function LeftSidebar({ className = '', onSelectPage }: LeftSidebarProps) {
  const tab = useUIStore((s) => s.leftPanelTab)
  const setTab = useUIStore((s) => s.setLeftPanelTab)

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
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs ${
              tab === item.id
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={item.label}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'components' && <ComponentPaletteSidebar />}
        {tab === 'pages' && <PagesPanel onSelectPage={onSelectPage} />}
        {tab === 'layers' && <LayersPanel />}
      </div>
    </aside>
  )
}
