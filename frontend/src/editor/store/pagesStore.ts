import { create } from 'zustand'
import type { EditorPage } from '../panels/PagesPanel'

type PagesState = {
  pages: EditorPage[]
  loading: boolean
}

type PagesActions = {
  setPages: (pages: EditorPage[]) => void
  setLoading: (loading: boolean) => void
  upsertPage: (page: EditorPage) => void
  removePage: (pageId: string) => void
  resetPages: () => void
}

export const usePagesStore = create<PagesState & PagesActions>((set) => ({
  pages: [],
  loading: false,

  setPages: (pages) => set({ pages }),
  setLoading: (loading) => set({ loading }),

  upsertPage: (page) =>
    set((state) => {
      const idx = state.pages.findIndex((p) => p.id === page.id)
      if (idx < 0) return { pages: [...state.pages, page] }
      const next = [...state.pages]
      next[idx] = page
      return { pages: next }
    }),

  removePage: (pageId) =>
    set((state) => ({ pages: state.pages.filter((p) => p.id !== pageId) })),

  resetPages: () => set({ pages: [], loading: false }),
}))

export function toEditorPage(page: {
  id: string
  name: string
  path: string
  is_home?: boolean
  isHome?: boolean
}): EditorPage {
  return {
    id: page.id,
    name: page.name,
    path: page.path,
    isHome: page.is_home ?? page.isHome,
  }
}

export function suggestPagePath(name: string, existingPaths: string[]): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let base = slug ? `/${slug}` : '/page'
  if (base === '/') base = '/page'

  let path = base
  let n = 2
  const taken = new Set(existingPaths)
  while (taken.has(path)) {
    path = `${base}-${n}`
    n += 1
  }
  return path
}
