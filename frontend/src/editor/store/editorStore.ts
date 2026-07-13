import { create } from 'zustand'
import { current } from 'immer'
import { immer } from 'zustand/middleware/immer'
import { createEmptyDocument, createNode } from '../../components/registry'
import type { Breakpoint, ComponentNode, ComponentType, PageDocument } from '../../types/editor'
import {
  normalizeDocument,
  validateAddChild,
  type AddComponentResult,
} from '../utils/documentUtils'

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
  addComponent: (type: ComponentType, parentId: string, index?: number) => AddComponentResult
  moveNode: (nodeId: string, newParentId: string | null, index: number) => void
  /** Reorder among siblings (same parent / roots). */
  reorderNode: (nodeId: string, direction: 'up' | 'down') => void
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
  updateNodeStyles: (nodeId: string, styles: ComponentNode['styles']) => void
  updateNodeStyleCss: (
    nodeId: string,
    cssPatch: Record<string, string | undefined>,
    breakpoint?: Breakpoint,
  ) => void
  updateNodeEvents: (nodeId: string, events: Record<string, unknown>) => void
  updateNodeAttributes: (
    nodeId: string,
    attributes: Record<string, string | number | boolean>,
  ) => void
  updateNodeMeta: (nodeId: string, meta: ComponentNode['meta']) => void
  resizeNode: (nodeId: string, width: number, height: number) => void
  deleteNode: (nodeId: string) => void
  undo: () => void
  redo: () => void
  getDocument: () => PageDocument
  canUndo: () => boolean
  canRedo: () => boolean
}

function cloneDocument(doc: PageDocument): PageDocument {
  return JSON.parse(JSON.stringify(doc)) as PageDocument
}

function snapshot(state: EditorState): Snapshot {
  const plain = current(state)
  return cloneDocument({ rootIds: plain.rootIds, nodes: plain.nodes })
}

function pushHistory(state: EditorState) {
  state.past.push(snapshot(state))
  if (state.past.length > MAX_HISTORY) {
    state.past.shift()
  }
  state.future = []
}

function restoreSnapshot(state: EditorState, snap: Snapshot) {
  const cloned = cloneDocument(snap)
  state.rootIds = cloned.rootIds
  state.nodes = cloned.nodes
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
): boolean {
  const node = nodes[nodeId]
  if (!node) return false

  node.parentId = parentId

  if (parentId === null) {
    rootIds.splice(index, 0, nodeId)
    return true
  }

  const parent = nodes[parentId]
  if (!parent) return false
  if (!Array.isArray(parent.children)) parent.children = []
  parent.children.splice(index, 0, nodeId)
  return true
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
        const normalized = hasContent ? normalizeDocument(doc) : createEmptyDocument()
        const cloned = cloneDocument(normalized)
        state.rootIds = cloned.rootIds
        state.nodes = cloned.nodes
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
      const state = get()
      const validationError = validateAddChild(state.nodes, parentId, type)
      if (validationError) return { ok: false, error: validationError }

      const id = newId(type)
      let attached = false

      set((draft) => {
        pushHistory(draft)
        const node = createNode(type, id, parentId)
        draft.nodes[id] = node

        const parent = draft.nodes[parentId]
        const insertAt = index ?? parent?.children.length ?? draft.rootIds.length
        attached = attachNode(draft.nodes, draft.rootIds, id, parentId, insertAt)
        if (attached) {
          draft.selectedId = id
        } else {
          delete draft.nodes[id]
        }
      })

      if (!attached) {
        return { ok: false, error: `Failed to attach "${type}" to the selected parent.` }
      }

      return { ok: true, id }
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

    reorderNode: (nodeId, direction) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node || node.meta?.locked) return

        const parentId = node.parentId
        const siblings =
          parentId === null ? state.rootIds : state.nodes[parentId]?.children
        if (!siblings) return

        const from = siblings.indexOf(nodeId)
        if (from < 0) return
        const to = direction === 'up' ? from - 1 : from + 1
        if (to < 0 || to >= siblings.length) return

        pushHistory(state)
        detachNode(state.nodes, state.rootIds, nodeId)
        attachNode(state.nodes, state.rootIds, nodeId, parentId, to)
      }),

    updateNodeProps: (nodeId, props) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        const next = { ...node.props, ...props }
        for (const [key, value] of Object.entries(props)) {
          if (value === undefined) delete next[key]
        }
        node.props = next
      }),

    updateNodeStyles: (nodeId, styles) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.styles = { ...node.styles, ...styles }
      }),

    updateNodeStyleCss: (nodeId, cssPatch, breakpoint = 'desktop') =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)

        const mergeCss = (current: Record<string, string> = {}) => {
          const next = { ...current }
          for (const [key, value] of Object.entries(cssPatch)) {
            if (value === undefined || value === '') delete next[key]
            else next[key] = value
          }
          return next
        }

        if (breakpoint === 'desktop') {
          node.styles = {
            ...node.styles,
            css: mergeCss(node.styles?.css),
          }
          return
        }

        const bpStyles = node.styles?.breakpoints?.[breakpoint] ?? {}
        node.styles = {
          ...node.styles,
          breakpoints: {
            ...node.styles?.breakpoints,
            [breakpoint]: {
              ...bpStyles,
              css: mergeCss(bpStyles.css),
            },
          },
        }
      }),

    updateNodeEvents: (nodeId, events) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.events = events
      }),

    updateNodeAttributes: (nodeId, attributes) =>
      set((state) => {
        const node = state.nodes[nodeId]
        if (!node) return
        pushHistory(state)
        node.attributes = attributes
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
      return cloneDocument({ rootIds, nodes })
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  })),
)
