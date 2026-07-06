import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createEmptyDocument, createNode } from '../../components/registry'
import type { Breakpoint, ComponentNode, ComponentType, PageDocument } from '../../types/editor'

const MAX_HISTORY = 50

type Snapshot = PageDocument

type EditorState = {
  rootIds: string[]
  nodes: Record<string, ComponentNode>
  selectedId: string | null
  breakpoint: Breakpoint
  zoom: number
  past: Snapshot[]
  future: Snapshot[]
}

type EditorActions = {
  loadDocument: (doc: PageDocument) => void
  selectNode: (id: string | null) => void
  setBreakpoint: (breakpoint: Breakpoint) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  addComponent: (type: ComponentType, parentId: string, index?: number) => string
  moveNode: (nodeId: string, newParentId: string, index: number) => void
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
  updateNodeStyles: (nodeId: string, styles: ComponentNode['styles']) => void
  updateNodeMeta: (nodeId: string, meta: ComponentNode['meta']) => void
  resizeNode: (nodeId: string, width: number, height: number) => void
  deleteNode: (nodeId: string) => void
  undo: () => void
  redo: () => void
  getDocument: () => PageDocument
  canUndo: () => boolean
  canRedo: () => boolean
}

function snapshot(state: EditorState): Snapshot {
  return {
    rootIds: structuredClone(state.rootIds),
    nodes: structuredClone(state.nodes),
  }
}

function pushHistory(state: EditorState) {
  state.past.push(snapshot(state))
  if (state.past.length > MAX_HISTORY) {
    state.past.shift()
  }
  state.future = []
}

function restoreSnapshot(state: EditorState, snap: Snapshot) {
  state.rootIds = structuredClone(snap.rootIds)
  state.nodes = structuredClone(snap.nodes)
}

function removeNodeRecursive(nodes: Record<string, ComponentNode>, nodeId: string) {
  const node = nodes[nodeId]
  if (!node) return
  for (const childId of node.children) {
    removeNodeRecursive(nodes, childId)
  }
  delete nodes[nodeId]
}

function detachNode(
  nodes: Record<string, ComponentNode>,
  rootIds: string[],
  nodeId: string,
) {
  const node = nodes[nodeId]
  if (!node) return

  if (node.parentId === null) {
    const idx = rootIds.indexOf(nodeId)
    if (idx >= 0) rootIds.splice(idx, 1)
  } else {
    const parent = nodes[node.parentId]
    if (parent) {
      parent.children = parent.children.filter((id) => id !== nodeId)
    }
  }
}

function attachNode(
  nodes: Record<string, ComponentNode>,
  rootIds: string[],
  nodeId: string,
  parentId: string | null,
  index: number,
) {
  const node = nodes[nodeId]
  if (!node) return

  node.parentId = parentId

  if (parentId === null) {
    rootIds.splice(index, 0, nodeId)
    return
  }

  const parent = nodes[parentId]
  if (!parent) return
  parent.children.splice(index, 0, nodeId)
}

function newId(type: ComponentType) {
  return `cmp_${type.toLowerCase()}_${crypto.randomUUID().slice(0, 8)}`
}

const empty = createEmptyDocument()

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    rootIds: empty.rootIds,
    nodes: empty.nodes,
    selectedId: empty.rootIds[0] ?? null,
    breakpoint: 'desktop',
    zoom: 1,
    past: [],
    future: [],

    loadDocument: (doc) =>
      set((state) => {
        const hasContent =
          doc.rootIds.length > 0 &&
          doc.rootIds.every((id) => doc.nodes[id] != null)
        const normalized = hasContent ? doc : createEmptyDocument()
        state.rootIds = structuredClone(normalized.rootIds)
        state.nodes = structuredClone(normalized.nodes)
        state.selectedId = normalized.rootIds[0] ?? null
        state.past = []
        state.future = []
      }),

    selectNode: (id) => set({ selectedId: id }),

    setBreakpoint: (breakpoint) => set({ breakpoint }),

    setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.25, zoom)) }),

    zoomIn: () => {
      const { zoom, setZoom } = get()
      setZoom(Number((zoom + 0.1).toFixed(2)))
    },

    zoomOut: () => {
      const { zoom, setZoom } = get()
      setZoom(Number((zoom - 0.1).toFixed(2)))
    },

    resetZoom: () => set({ zoom: 1 }),

    addComponent: (type, parentId, index) => {
      const id = newId(type)
      set((state) => {
        pushHistory(state)
        const node = createNode(type, id, parentId)
        state.nodes[id] = node

        const parent = state.nodes[parentId]
        const insertAt = index ?? parent?.children.length ?? state.rootIds.length
        attachNode(state.nodes, state.rootIds, id, parentId, insertAt)
        state.selectedId = id
      })
      return id
    },

    moveNode: (nodeId, newParentId, index) =>
      set((state) => {
        if (nodeId === newParentId) return
        const node = state.nodes[nodeId]
        if (!node || node.meta?.locked) return

        pushHistory(state)
        detachNode(state.nodes, state.rootIds, nodeId)
        attachNode(state.nodes, state.rootIds, nodeId, newParentId, index)
      }),

    updateNodeProps: (nodeId, props) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.props = { ...node.props, ...props }
      }),

    updateNodeStyles: (nodeId, styles) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.styles = { ...node.styles, ...styles }
      }),

    updateNodeMeta: (nodeId, meta) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.meta = { ...node.meta, ...meta }
      }),

    resizeNode: (nodeId, width, height) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.styles = {
          ...node.styles,
          css: {
            ...node.styles?.css,
            width: `${Math.round(width)}px`,
            height: `${Math.round(height)}px`,
          },
        }
      }),

    deleteNode: (nodeId) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node || node.parentId === null) return

        pushHistory(state)
        detachNode(state.nodes, state.rootIds, nodeId)
        removeNodeRecursive(state.nodes, nodeId)
        if (state.selectedId === nodeId) {
          state.selectedId = node.parentId
        }
      }),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return
        state.future.unshift(snapshot(state))
        const previous = state.past.pop()
        if (previous) restoreSnapshot(state, previous)
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return
        state.past.push(snapshot(state))
        const next = state.future.shift()
        if (next) restoreSnapshot(state, next)
      }),

    getDocument: () => {
      const { rootIds, nodes } = get()
      return { rootIds: structuredClone(rootIds), nodes: structuredClone(nodes) }
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  })),
)
