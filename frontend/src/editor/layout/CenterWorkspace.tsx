import { useEffect } from 'react'
import { getCatalogEntry } from '../../component-library/catalog'
import { Canvas } from '../canvas/Canvas'
import { EventEditorForm } from '../panels/fields/EventsSection'
import { useEditorStore } from '../store/editorStore'
import { CANVAS_TAB_ID, useUIStore } from '../store/uiStore'

type CenterWorkspaceProps = {
  previewMode: boolean
}

export function CenterWorkspace({ previewMode }: CenterWorkspaceProps) {
  const centerTabs = useUIStore((s) => s.centerTabs)
  const activeCenterTabId = useUIStore((s) => s.activeCenterTabId)
  const setActiveCenterTab = useUIStore((s) => s.setActiveCenterTab)
  const closeCenterTab = useUIStore((s) => s.closeCenterTab)
  const closeEventTabsForNode = useUIStore((s) => s.closeEventTabsForNode)
  const nodes = useEditorStore((s) => s.nodes)

  // Drop event tabs whose node was deleted
  useEffect(() => {
    for (const tab of centerTabs) {
      if (tab.kind === 'event' && !nodes[tab.nodeId]) {
        closeEventTabsForNode(tab.nodeId)
      }
    }
  }, [nodes, centerTabs, closeEventTabsForNode])

  const activeTab = centerTabs.find((t) => t.id === activeCenterTabId) ?? centerTabs[0]
  const showCanvas = !activeTab || activeTab.kind === 'canvas'

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col" role="main">
      {/* Browser-style tab bar */}
      <div className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b border-gray-200 bg-gray-200/80 px-1 pt-1">
        {centerTabs.map((tab) => {
          const active = tab.id === activeCenterTabId
          const closable = tab.kind !== 'canvas'
          return (
            <div
              key={tab.id}
              className={`group flex max-w-[220px] items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1.5 text-xs ${
                active
                  ? 'border-gray-200 bg-white text-gray-900 shadow-sm'
                  : 'border-transparent bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-medium"
                onClick={() => setActiveCenterTab(tab.id)}
                title={tab.title}
              >
                {tab.kind === 'canvas' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="text-[10px] text-gray-400">
                      ▦
                    </span>
                    Canvas
                  </span>
                ) : (
                  tab.title
                )}
              </button>
              {closable ? (
                <button
                  type="button"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeCenterTab(tab.id)
                  }}
                >
                  ×
                </button>
              ) : (
                <span className="w-4 shrink-0" aria-hidden />
              )}
            </div>
          )
        })}
      </div>

      {/* Tab body — keep Canvas mounted so selection/zoom survive tab switches */}
      <div className={`relative min-h-0 flex-1 ${showCanvas ? '' : 'hidden'}`}>
        <Canvas previewMode={previewMode} />
      </div>

      {!showCanvas && activeTab?.kind === 'event' && (
        <div className="min-h-0 flex-1 overflow-auto bg-gray-50">
          <EventEditorForm
            nodeId={activeTab.nodeId}
            eventName={activeTab.eventName}
            description={
              getCatalogEntry(nodes[activeTab.nodeId]?.type ?? '')?.supportedEvents?.find(
                (e) => e.name === activeTab.eventName,
              )?.description
            }
            defaultAction={
              getCatalogEntry(nodes[activeTab.nodeId]?.type ?? '')?.supportedEvents?.find(
                (e) => e.name === activeTab.eventName,
              )?.defaultAction ?? 'handleClick'
            }
          />
        </div>
      )}
    </div>
  )
}

export { CANVAS_TAB_ID }
