import { useUIStore } from '../store/uiStore'
import { JsonPanel } from '../panels/JsonPanel'
import { PropsPanel } from '../panels/PropsPanel'

type RightSidebarProps = {
  className?: string
}

export function RightSidebar({ className = '' }: RightSidebarProps) {
  const tab = useUIStore((s) => s.rightPanelTab)
  const setTab = useUIStore((s) => s.setRightPanelTab)

  return (
    <aside className={`flex h-full min-w-0 flex-col border-l border-gray-200 bg-white ${className}`}>
      <div className="flex shrink-0 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('props')}
          className={`flex-1 px-3 py-2.5 text-sm ${
            tab === 'props'
              ? 'border-b-2 border-blue-600 font-medium text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Properties
        </button>
        <button
          type="button"
          onClick={() => setTab('json')}
          className={`flex-1 px-3 py-2.5 text-sm ${
            tab === 'json'
              ? 'border-b-2 border-blue-600 font-medium text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          JSON
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'props' ? <PropsPanel /> : <JsonPanel />}
      </div>
    </aside>
  )
}
