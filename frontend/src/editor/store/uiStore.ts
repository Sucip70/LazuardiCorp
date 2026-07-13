import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LeftPanelTab = 'components' | 'pages' | 'layers' | 'variables'
export type RightPanelTab = 'props' | 'json'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type CenterTab =
  | { id: 'canvas'; kind: 'canvas'; title: 'Canvas' }
  | {
      id: string
      kind: 'event'
      title: string
      nodeId: string
      eventName: string
    }

export const CANVAS_TAB_ID = 'canvas' as const

const CANVAS_TAB: CenterTab = { id: CANVAS_TAB_ID, kind: 'canvas', title: 'Canvas' }

type UIState = {
  leftPanelTab: LeftPanelTab
  rightPanelTab: RightPanelTab
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  showGrid: boolean
  previewMode: boolean
  saveStatus: SaveStatus
  saveMessage: string | null
  dropTargetParentId: string | null
  editorError: string | null
  /** Browser-style center tabs; Canvas is always first and cannot be closed. */
  centerTabs: CenterTab[]
  activeCenterTabId: string
}

type UIActions = {
  setLeftPanelTab: (tab: LeftPanelTab) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setLeftSidebarOpen: (open: boolean) => void
  setRightSidebarOpen: (open: boolean) => void
  toggleGrid: () => void
  setPreviewMode: (on: boolean) => void
  setSaveStatus: (status: SaveStatus, message?: string | null) => void
  setDropTargetParentId: (nodeId: string | null) => void
  setEditorError: (message: string | null) => void
  setActiveCenterTab: (tabId: string) => void
  openEventTab: (args: { nodeId: string; eventName: string; label?: string }) => void
  closeCenterTab: (tabId: string) => void
  closeEventTabsForNode: (nodeId: string) => void
}

function eventTabId(nodeId: string, eventName: string) {
  return `event:${nodeId}:${eventName}`
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      leftPanelTab: 'components',
      rightPanelTab: 'props',
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      showGrid: true,
      previewMode: false,
      saveStatus: 'idle',
      saveMessage: null,
      dropTargetParentId: null,
      editorError: null,
      centerTabs: [CANVAS_TAB],
      activeCenterTabId: CANVAS_TAB_ID,

      setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab, leftSidebarOpen: true }),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab, rightSidebarOpen: true }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
      setLeftSidebarOpen: (leftSidebarOpen) => set({ leftSidebarOpen }),
      setRightSidebarOpen: (rightSidebarOpen) => set({ rightSidebarOpen }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setSaveStatus: (saveStatus, saveMessage = null) => set({ saveStatus, saveMessage }),
      setDropTargetParentId: (dropTargetParentId) => set({ dropTargetParentId }),
      setEditorError: (editorError) => set({ editorError }),

      setActiveCenterTab: (tabId) => {
        const exists = get().centerTabs.some((t) => t.id === tabId)
        if (exists) set({ activeCenterTabId: tabId })
      },

      openEventTab: ({ nodeId, eventName, label }) => {
        const id = eventTabId(nodeId, eventName)
        const title = label ? `${label} · ${eventName}` : eventName
        set((s) => {
          const existing = s.centerTabs.find((t) => t.id === id)
          if (existing) {
            return {
              activeCenterTabId: id,
              centerTabs: s.centerTabs.map((t) =>
                t.id === id && t.kind === 'event' ? { ...t, title } : t,
              ),
            }
          }
          const tab: CenterTab = {
            id,
            kind: 'event',
            title,
            nodeId,
            eventName,
          }
          return {
            centerTabs: [...s.centerTabs, tab],
            activeCenterTabId: id,
          }
        })
      },

      closeCenterTab: (tabId) => {
        if (tabId === CANVAS_TAB_ID) return
        set((s) => {
          const idx = s.centerTabs.findIndex((t) => t.id === tabId)
          if (idx < 0) return s
          const nextTabs = s.centerTabs.filter((t) => t.id !== tabId)
          let activeCenterTabId = s.activeCenterTabId
          if (activeCenterTabId === tabId) {
            const fallback = nextTabs[Math.max(0, idx - 1)] ?? CANVAS_TAB
            activeCenterTabId = fallback.id
          }
          return { centerTabs: nextTabs, activeCenterTabId }
        })
      },

      closeEventTabsForNode: (nodeId) => {
        set((s) => {
          const nextTabs = s.centerTabs.filter(
            (t) => t.kind !== 'event' || t.nodeId !== nodeId,
          )
          const activeStillOpen = nextTabs.some((t) => t.id === s.activeCenterTabId)
          return {
            centerTabs: nextTabs,
            activeCenterTabId: activeStillOpen ? s.activeCenterTabId : CANVAS_TAB_ID,
          }
        })
      },
    }),
    { name: 'lazuardi-editor-ui', partialize: (s) => ({ showGrid: s.showGrid }) },
  ),
)
