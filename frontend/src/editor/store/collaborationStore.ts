import { create } from 'zustand'

/** Presence info for real-time collaboration (WebSocket-ready stub). */
export type Collaborator = {
  id: string
  name: string
  color: string
  avatarUrl?: string
  cursor?: { x: number; y: number }
  selectedNodeId?: string | null
  isSelf?: boolean
}

type CollaborationState = {
  enabled: boolean
  collaborators: Collaborator[]
  connectionStatus: 'offline' | 'connecting' | 'connected'
}

type CollaborationActions = {
  setCollaborators: (users: Collaborator[]) => void
  setConnectionStatus: (status: CollaborationState['connectionStatus']) => void
  updateCursor: (userId: string, cursor: { x: number; y: number }) => void
  updateSelection: (userId: string, nodeId: string | null) => void
}

const DEMO_COLLABORATORS: Collaborator[] = [
  { id: 'self', name: 'You', color: '#2563eb', isSelf: true },
]

export const useCollaborationStore = create<CollaborationState & CollaborationActions>((set) => ({
  enabled: false,
  collaborators: DEMO_COLLABORATORS,
  connectionStatus: 'offline',

  setCollaborators: (collaborators) => set({ collaborators }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  updateCursor: (userId, cursor) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === userId ? { ...c, cursor } : c,
      ),
    })),
  updateSelection: (userId, selectedNodeId) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === userId ? { ...c, selectedNodeId } : c,
      ),
    })),
}))

/** Hook for future WebSocket / Yjs / Liveblocks integration. */
export function useCollaboration(_projectId?: string) {
  const enabled = useCollaborationStore((s) => s.enabled)
  const collaborators = useCollaborationStore((s) => s.collaborators)
  const connectionStatus = useCollaborationStore((s) => s.connectionStatus)
  return { enabled, collaborators, connectionStatus }
}
