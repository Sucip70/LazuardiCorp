import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LeftPanelTab = 'components' | 'pages' | 'layers'
export type RightPanelTab = 'props' | 'json'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UIState = {
  leftPanelTab: LeftPanelTab
  rightPanelTab: RightPanelTab
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  showGrid: boolean
  previewMode: boolean
  saveStatus: SaveStatus
  saveMessage: string | null
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
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      leftPanelTab: 'components',
      rightPanelTab: 'props',
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      showGrid: true,
      previewMode: false,
      saveStatus: 'idle',
      saveMessage: null,

      setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab, leftSidebarOpen: true }),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab, rightSidebarOpen: true }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
      setLeftSidebarOpen: (leftSidebarOpen) => set({ leftSidebarOpen }),
      setRightSidebarOpen: (rightSidebarOpen) => set({ rightSidebarOpen }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setSaveStatus: (saveStatus, saveMessage = null) => set({ saveStatus, saveMessage }),
    }),
    { name: 'lazuardi-editor-ui', partialize: (s) => ({ showGrid: s.showGrid }) },
  ),
)
