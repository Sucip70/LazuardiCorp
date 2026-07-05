import { getLibraryPaletteItems } from '../component-library/register'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Extensible component type slug (see component-library catalog). */
export type ComponentType = string

export type StyleSet = {
  className?: string
  css?: Record<string, string>
  breakpoints?: Partial<
    Record<
      Breakpoint,
      {
        className?: string
        css?: Record<string, string>
        hidden?: boolean
      }
    >
  >
}

export type ComponentNode = {
  id: string
  type: ComponentType
  parentId: string | null
  children: string[]
  props: Record<string, unknown>
  attributes?: Record<string, string | number | boolean>
  styles?: StyleSet
  events?: Record<string, unknown>
  meta?: {
    label?: string
    locked?: boolean
    hidden?: boolean
  }
}

export type PageDocument = {
  rootIds: string[]
  nodes: Record<string, ComponentNode>
}

export type PaletteItem = {
  type: ComponentType
  label: string
  category: string
  icon: string
}

export const PALETTE_ITEMS: PaletteItem[] = getLibraryPaletteItems()

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
}

export const DND_TYPES = {
  PALETTE: 'palette-component',
  CANVAS_NODE: 'canvas-node',
} as const
