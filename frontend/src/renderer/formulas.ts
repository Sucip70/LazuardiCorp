import { getComponentAttr, isComponentPath, resolveComponentPath } from './componentState'
import { getAllVars, getVar, resolveVarKey } from './runtimeVars'

export type FormulaValue = string | number | boolean | null

function toNumber(value: FormulaValue | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined || value === '') return NaN
  const n = Number(String(value).replace(/,/g, ''))
  return n
}

function toString(value: FormulaValue | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Resolve a binding key:
 * - `cmp_xxx.attr` → component live state / props
 * - `global.x` / `temp.x` / `vars.x` / flat → runtime vars
 */
export function resolvePath(key: string): FormulaValue | undefined {
  if (isComponentPath(key)) {
    const fromComponent = resolveComponentPath(key)
    if (fromComponent !== undefined) return fromComponent as FormulaValue
    // Known component path but missing attr → empty
    return ''
  }
  return resolveVarKey(key) as FormulaValue | undefined
}

/** Resolve {{varName}}, {{cmp_id.attr}}, {{vars.x}}, {{global.x}}, {{temp.x}}. */
export function resolveTemplate(template: string, vars?: Record<string, FormulaValue>): string {
  const source = vars ?? (getAllVars() as Record<string, FormulaValue>)
  return template.replace(/\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g, (_, key: string) => {
    const fromSource = source[key] ?? source[key.replace(/^vars\./, '')]
    if (fromSource !== undefined && fromSource !== null) return String(fromSource)
    const value = resolvePath(key)
    return value === null || value === undefined ? '' : String(value)
  })
}

/**
 * Safe math expression evaluator.
 * Supports numbers, + - * / % , parentheses, bare vars, and `cmp_id.attr` paths.
 */
export function evaluateMath(expression: string, vars?: Record<string, FormulaValue>): number {
  const source = vars ?? (getAllVars() as Record<string, FormulaValue>)
  let expr = resolveTemplate(expression, source).trim()
  if (!expr) return NaN

  // Dotted component paths first (e.g. cmp_1x2y.value)
  expr = expr.replace(/\b[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+\b/g, (path) => {
    if (source[path] !== undefined && source[path] !== null) {
      const n = toNumber(source[path])
      return Number.isFinite(n) ? String(n) : 'NaN'
    }
    if (isComponentPath(path)) {
      const n = toNumber(resolveComponentPath(path) as FormulaValue)
      return Number.isFinite(n) ? String(n) : 'NaN'
    }
    // scoped var paths like global.foo
    const n = toNumber(resolveVarKey(path) as FormulaValue)
    return Number.isFinite(n) ? String(n) : 'NaN'
  })

  // Remaining bare identifiers
  expr = expr.replace(/\b[a-zA-Z_][\w]*\b/g, (name) => {
    if (name === 'true') return '1'
    if (name === 'false') return '0'
    const n = toNumber(source[name] ?? getVar(name) ?? null)
    return Number.isFinite(n) ? String(n) : 'NaN'
  })

  if (!/^[\d.\s+\-*/%()]+$/.test(expr)) {
    return NaN
  }

  try {
    const result = new Function(`"use strict"; return (${expr});`)() as number
    return typeof result === 'number' ? result : NaN
  } catch {
    return NaN
  }
}

export type MathOp = 'add' | 'sub' | 'mul' | 'div' | 'mod' | 'min' | 'max' | 'abs' | 'round' | 'floor' | 'ceil' | 'percent'

export function applyMathOp(
  op: MathOp,
  a: FormulaValue,
  b?: FormulaValue,
  decimals?: number,
): number {
  const x = toNumber(a)
  const y = b === undefined ? NaN : toNumber(b)
  let result: number

  switch (op) {
    case 'add':
      result = x + y
      break
    case 'sub':
      result = x - y
      break
    case 'mul':
      result = x * y
      break
    case 'div':
      result = y === 0 ? NaN : x / y
      break
    case 'mod':
      result = y === 0 ? NaN : x % y
      break
    case 'min':
      result = Math.min(x, y)
      break
    case 'max':
      result = Math.max(x, y)
      break
    case 'abs':
      result = Math.abs(x)
      break
    case 'round':
      result = Math.round(x)
      break
    case 'floor':
      result = Math.floor(x)
      break
    case 'ceil':
      result = Math.ceil(x)
      break
    case 'percent':
      result = (x * y) / 100
      break
    default:
      result = NaN
  }

  if (decimals !== undefined && Number.isFinite(decimals) && Number.isFinite(result)) {
    const f = 10 ** decimals
    return Math.round(result * f) / f
  }
  return result
}

export type StringOp =
  | 'concat'
  | 'upper'
  | 'lower'
  | 'trim'
  | 'replace'
  | 'slice'
  | 'length'
  | 'template'

export function applyStringOp(
  op: StringOp,
  a: FormulaValue,
  b?: FormulaValue,
  c?: FormulaValue,
): FormulaValue {
  const left = toString(a)
  const right = toString(b)

  switch (op) {
    case 'concat':
      return left + right + (c !== undefined ? toString(c) : '')
    case 'upper':
      return left.toUpperCase()
    case 'lower':
      return left.toLowerCase()
    case 'trim':
      return left.trim()
    case 'replace':
      return left.split(right).join(toString(c))
    case 'slice': {
      const start = Number(b ?? 0)
      const end = c === undefined || c === '' ? undefined : Number(c)
      return left.slice(start, end)
    }
    case 'length':
      return left.length
    case 'template':
      return resolveTemplate(left)
    default:
      return left
  }
}

/** Resolve a payload field that may be a literal, {{var}}, @varName, or @cmp_id.attr */
export function resolveValue(raw: unknown): FormulaValue {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw
  const str = String(raw)
  if (str.startsWith('@')) {
    const key = str.slice(1)
    if (isComponentPath(key)) {
      return (resolveComponentPath(key) as FormulaValue) ?? null
    }
    return (getVar(key) as FormulaValue) ?? null
  }
  // Bare component path without {{ }}
  if (isComponentPath(str.trim())) {
    return (resolveComponentPath(str.trim()) as FormulaValue) ?? null
  }
  if (/\{\{/.test(str)) {
    const resolved = resolveTemplate(str)
    const asNum = Number(resolved)
    if (resolved.trim() !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(resolved.trim())) {
      return asNum
    }
    return resolved
  }
  const asNum = Number(str)
  if (str.trim() !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(str.trim())) {
    return asNum
  }
  return str
}

/** Interpolate all string props that contain {{...}} bindings. */
export function bindProps(props: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.includes('{{')) {
      next[key] = resolveTemplate(value)
    } else {
      next[key] = value
    }
  }
  return next
}

/** Preview visibility: hide when `hidden` is true. */
export function isNodeVisible(props: Record<string, unknown> | undefined): boolean {
  if (!props) return true
  if (props.hidden === true || props.hidden === 'true' || props.hidden === 1) return false
  return true
}

// Re-export for callers that need direct attr reads
export { getComponentAttr }
