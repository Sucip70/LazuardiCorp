import type { ComponentNode, PageDocument } from '../types/editor'
import { getCatalogEntry, getDefaultProps, getDefaultStyles } from '../component-library/catalog'

export function createNode(type: string, id: string, parentId: string | null): ComponentNode {
  const catalog = getCatalogEntry(type)
  return {
    id,
    type,
    parentId,
    children: [],
    props: getDefaultProps(type),
    styles: getDefaultStyles(type),
    meta: { label: catalog?.label ?? type },
  }
}

export function createEmptyDocument(): PageDocument {
  const root = createNode('Container', 'cmp_root', null)
  root.meta = { label: 'Page Root', locked: false }
  root.styles = {
    className: 'min-h-[480px] w-full flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm',
  }
  return { rootIds: [root.id], nodes: { [root.id]: root } }
}

/** @deprecated Use component-library catalog via createNode */
export const componentRegistry = {
  get(type: string) {
    const entry = getCatalogEntry(type)
    if (!entry) return undefined
    return {
      label: entry.label,
      acceptsChildren: entry.acceptsChildren,
      defaultProps: entry.defaultProps,
      defaultStyles: entry.defaultStyles,
    }
  },
}
