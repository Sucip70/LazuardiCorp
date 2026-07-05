import type { CSSProperties } from 'react'
import type { Breakpoint } from '../types/editor'
import type { NormalizedNode } from './types'

export function resolveClassName(node: NormalizedNode, breakpoint: Breakpoint): string {
  const base = node.styles.className ?? ''
  const bp = node.styles.breakpoints?.[breakpoint]
  if (bp?.hidden) return `${base} hidden`.trim()
  return [base, bp?.className].filter(Boolean).join(' ')
}

export function resolveInlineStyle(node: NormalizedNode, breakpoint: Breakpoint): CSSProperties {
  const base = node.styles.css ?? {}
  const bp = node.styles.breakpoints?.[breakpoint]?.css ?? {}
  return { ...base, ...bp }
}
