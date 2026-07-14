import type { Breakpoint, ComponentNode, StyleSet } from '../../../types/editor'

export function getBreakpointClassName(styles: StyleSet | undefined, breakpoint: Breakpoint): string {
  if (breakpoint === 'desktop') return styles?.className ?? ''
  return styles?.breakpoints?.[breakpoint]?.className ?? ''
}

export function getBreakpointCss(styles: StyleSet | undefined, breakpoint: Breakpoint): Record<string, string> {
  const base = styles?.css ?? {}
  if (breakpoint === 'desktop') return { ...base }
  const bp = styles?.breakpoints?.[breakpoint]?.css ?? {}
  return { ...base, ...bp }
}

export function setBreakpointClassName(
  styles: StyleSet | undefined,
  breakpoint: Breakpoint,
  className: string,
): StyleSet {
  if (breakpoint === 'desktop') {
    return { ...styles, className }
  }
  return {
    ...styles,
    breakpoints: {
      ...styles?.breakpoints,
      [breakpoint]: { ...styles?.breakpoints?.[breakpoint], className },
    },
  }
}

export function setBreakpointCss(
  styles: StyleSet | undefined,
  breakpoint: Breakpoint,
  css: Record<string, string>,
): StyleSet {
  if (breakpoint === 'desktop') {
    return { ...styles, css }
  }
  return {
    ...styles,
    breakpoints: {
      ...styles?.breakpoints,
      [breakpoint]: { ...styles?.breakpoints?.[breakpoint], css },
    },
  }
}

export function patchBreakpointCss(
  styles: StyleSet | undefined,
  breakpoint: Breakpoint,
  patch: Record<string, string | undefined>,
): StyleSet {
  const current = getBreakpointCss(styles, breakpoint)
  const next = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') delete next[key]
    else next[key] = value
  }
  return setBreakpointCss(styles, breakpoint, next)
}

export const CSS_FIELDS = {
  typography: [
    { key: 'color', label: 'Text color', type: 'color' as const },
    { key: 'fontSize', label: 'Font size', type: 'text' as const, placeholder: '16px' },
    { key: 'fontWeight', label: 'Font weight', type: 'select' as const, options: ['300', '400', '500', '600', '700', 'bold'] },
    { key: 'textAlign', label: 'Text align', type: 'select' as const, options: ['left', 'center', 'right', 'justify'] },
  ],
  spacing: [
    { key: 'marginTop', label: 'Margin top', type: 'text' as const, placeholder: '0' },
    { key: 'marginRight', label: 'Margin right', type: 'text' as const, placeholder: '0' },
    { key: 'marginBottom', label: 'Margin bottom', type: 'text' as const, placeholder: '0' },
    { key: 'marginLeft', label: 'Margin left', type: 'text' as const, placeholder: '0' },
    { key: 'paddingTop', label: 'Padding top', type: 'text' as const, placeholder: '0' },
    { key: 'paddingRight', label: 'Padding right', type: 'text' as const, placeholder: '0' },
    { key: 'paddingBottom', label: 'Padding bottom', type: 'text' as const, placeholder: '0' },
    { key: 'paddingLeft', label: 'Padding left', type: 'text' as const, placeholder: '0' },
  ],
  layout: [
    { key: 'display', label: 'Display', type: 'select' as const, options: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'] },
    { key: 'width', label: 'Width', type: 'text' as const, placeholder: 'auto' },
    { key: 'height', label: 'Height', type: 'text' as const, placeholder: 'auto' },
    { key: 'maxWidth', label: 'Max width', type: 'text' as const, placeholder: 'none' },
    { key: 'maxHeight', label: 'Max height', type: 'text' as const, placeholder: 'none' },
    { key: 'overflow', label: 'Overflow', type: 'select' as const, options: ['visible', 'hidden', 'auto', 'scroll'] },
    { key: 'overflowX', label: 'Overflow X', type: 'select' as const, options: ['visible', 'hidden', 'auto', 'scroll'] },
    { key: 'overflowY', label: 'Overflow Y', type: 'select' as const, options: ['visible', 'hidden', 'auto', 'scroll'] },
  ],
  background: [
    { key: 'backgroundColor', label: 'Background', type: 'color' as const },
    { key: 'borderRadius', label: 'Border radius', type: 'text' as const, placeholder: '0' },
    { key: 'borderWidth', label: 'Border width', type: 'text' as const, placeholder: '0' },
    { key: 'borderColor', label: 'Border color', type: 'color' as const },
  ],
  flex: [
    { key: 'alignItems', label: 'Align items', type: 'select' as const, options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
    { key: 'justifyContent', label: 'Justify content', type: 'select' as const, options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
    { key: 'gap', label: 'Gap', type: 'text' as const, placeholder: '0' },
  ],
}

export const TAILWIND_PRESETS = [
  { label: 'Padding SM', classes: 'p-2' },
  { label: 'Padding MD', classes: 'p-4' },
  { label: 'Padding LG', classes: 'p-6' },
  { label: 'Gap SM', classes: 'gap-2' },
  { label: 'Gap MD', classes: 'gap-4' },
  { label: 'Gap LG', classes: 'gap-6' },
  { label: 'Items center', classes: 'items-center' },
  { label: 'Justify between', classes: 'justify-between' },
  { label: 'Margin auto', classes: 'mx-auto' },
  { label: 'Flex center', classes: 'flex items-center justify-center' },
  { label: 'Overflow Y', classes: 'overflow-y-auto' },
  { label: 'Rounded LG', classes: 'rounded-lg' },
  { label: 'Shadow MD', classes: 'shadow-md' },
  { label: 'Text center', classes: 'text-center' },
]

export function appendTailwindClasses(current: string, extra: string): string {
  const parts = new Set(current.split(/\s+/).filter(Boolean))
  for (const cls of extra.split(/\s+/).filter(Boolean)) parts.add(cls)
  return [...parts].join(' ')
}

export function getPropValue(node: ComponentNode, key: string): unknown {
  if (key in (node.props ?? {})) return node.props[key]
  if (node.type === 'Text' && key === 'text') return node.props.content
  if (node.type === 'Text' && key === 'content') return node.props.content
  return node.props[key]
}
