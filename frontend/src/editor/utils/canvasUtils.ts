import type { CSSProperties } from 'react'
import type { Breakpoint, ComponentNode } from '../../types/editor'
import { getCatalogEntry } from '../../component-library/catalog'

export function resolveClassName(node: ComponentNode, breakpoint: Breakpoint): string {
  const base = node.styles?.className ?? ''
  const bp = node.styles?.breakpoints?.[breakpoint]
  if (bp?.hidden) return `${base} hidden`.trim()
  return [base, bp?.className].filter(Boolean).join(' ')
}

export function resolveInlineStyle(node: ComponentNode, breakpoint: Breakpoint): CSSProperties {
  const base = node.styles?.css ?? {}
  const bp = node.styles?.breakpoints?.[breakpoint]?.css ?? {}
  return { ...base, ...bp } as CSSProperties
}

export function canAcceptChildren(type: ComponentNode['type']): boolean {
  return getCatalogEntry(type)?.acceptsChildren ?? rendererRegistryFallback(type)
}

function rendererRegistryFallback(type: string): boolean {
  return ['Container', 'Row', 'Column', 'Section', 'Link', 'Form', 'Tabs', 'Modal', 'Navbar'].includes(type)
}

export function findDropTarget(
  nodes: Record<string, ComponentNode>,
  targetId: string,
): string | null {
  let current: string | null = targetId
  while (current !== null) {
    const currentNode: ComponentNode | undefined = nodes[current]
    if (!currentNode) return null
    if (canAcceptChildren(currentNode.type)) return current
    current = currentNode.parentId
  }
  return null
}
