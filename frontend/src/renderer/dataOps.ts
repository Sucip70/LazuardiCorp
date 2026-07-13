import type { FormulaValue } from './formulas'
import { evaluateMath, resolveTemplate, resolveValue } from './formulas'
import { getVar } from './runtimeVars'

function asString(value: FormulaValue | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function asNumber(value: FormulaValue | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined || value === '') return NaN
  return Number(String(value).replace(/,/g, ''))
}

/** Parse a runtime value that may be JSON-encoded array/object. */
export function parseDataValue(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw
  const s = String(raw).trim()
  if (!s) return s
  if (
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('{') && s.endsWith('}')) ||
    s === 'null' ||
    s === 'true' ||
    s === 'false' ||
    /^-?\d+(\.\d+)?$/.test(s)
  ) {
    try {
      return JSON.parse(s)
    } catch {
      return raw
    }
  }
  return raw
}

function toStoreValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function resolveData(raw: unknown): unknown {
  if (typeof raw === 'string' && (raw.includes('{{') || raw.startsWith('@') || /^cmp_[\w-]+\./.test(raw) || /^[a-zA-Z_][\w]*$/.test(raw))) {
    // Variable / binding path
    if (/^[a-zA-Z_][\w]*$/.test(raw) && !raw.includes('{{')) {
      const fromVar = getVar(raw)
      if (fromVar !== undefined) return parseDataValue(fromVar)
    }
    return parseDataValue(resolveValue(raw))
  }
  if (typeof raw === 'string') return parseDataValue(raw)
  return raw
}

export type RegexOp = 'test' | 'match' | 'replace' | 'split' | 'exec'

export function applyRegexOp(
  op: RegexOp,
  input: FormulaValue,
  pattern: FormulaValue,
  flagsOrReplacement?: FormulaValue,
  replacementOrFlags?: FormulaValue,
): FormulaValue {
  const text = asString(input)
  const pat = asString(pattern)
  try {
    if (op === 'replace') {
      const replacement = asString(flagsOrReplacement ?? '')
      const flags = asString(replacementOrFlags ?? 'g')
      const re = new RegExp(pat, flags || 'g')
      return text.replace(re, replacement)
    }
    const flags = asString(flagsOrReplacement ?? '')
    const re = new RegExp(pat, flags)
    switch (op) {
      case 'test':
        return re.test(text)
      case 'match': {
        const m = text.match(re)
        return m ? JSON.stringify([...m]) : null
      }
      case 'exec': {
        const m = re.exec(text)
        return m ? JSON.stringify({ match: m[0], index: m.index, groups: m.slice(1) }) : null
      }
      case 'split':
        return JSON.stringify(text.split(re))
      default:
        return text
    }
  } catch (err) {
    console.warn('[runtime] regex error', err)
    return null
  }
}

export type ArrayOp =
  | 'parse'
  | 'stringify'
  | 'length'
  | 'get'
  | 'set'
  | 'push'
  | 'pop'
  | 'shift'
  | 'unshift'
  | 'join'
  | 'slice'
  | 'concat'
  | 'includes'
  | 'indexOf'
  | 'reverse'
  | 'sort'
  | 'unique'
  | 'flatten'
  | 'sum'
  | 'min'
  | 'max'
  | 'filter'
  | 'map'
  | 'find'
  | 'some'
  | 'every'
  | 'range'

function asArray(raw: unknown): unknown[] {
  const v = parseDataValue(raw)
  if (Array.isArray(v)) return [...v]
  if (v === null || v === undefined || v === '') return []
  return [v]
}

export function applyArrayOp(
  op: ArrayOp,
  a?: FormulaValue,
  b?: FormulaValue,
  c?: FormulaValue,
): FormulaValue {
  switch (op) {
    case 'parse': {
      const v = parseDataValue(a)
      return toStoreValue(Array.isArray(v) ? v : [])
    }
    case 'stringify':
      return JSON.stringify(asArray(a))
    case 'length':
      return asArray(a).length
    case 'get': {
      const arr = asArray(a)
      const i = Math.trunc(asNumber(b))
      const item = arr[i]
      return toStoreValue(item === undefined ? null : item)
    }
    case 'set': {
      const arr = asArray(a)
      const i = Math.trunc(asNumber(b))
      arr[i] = parseDataValue(c)
      return toStoreValue(arr)
    }
    case 'push': {
      const arr = asArray(a)
      arr.push(parseDataValue(b))
      return toStoreValue(arr)
    }
    case 'pop': {
      const arr = asArray(a)
      arr.pop()
      return toStoreValue(arr)
    }
    case 'shift': {
      const arr = asArray(a)
      arr.shift()
      return toStoreValue(arr)
    }
    case 'unshift': {
      const arr = asArray(a)
      arr.unshift(parseDataValue(b))
      return toStoreValue(arr)
    }
    case 'join':
      return asArray(a).map((x) => asString(x as FormulaValue)).join(asString(b ?? ','))
    case 'slice': {
      const start = asNumber(b)
      const end = c === undefined || c === '' ? undefined : asNumber(c)
      return toStoreValue(asArray(a).slice(start, end))
    }
    case 'concat':
      return toStoreValue(asArray(a).concat(asArray(b)))
    case 'includes':
      return asArray(a).some((x) => JSON.stringify(x) === JSON.stringify(parseDataValue(b)))
    case 'indexOf': {
      const needle = JSON.stringify(parseDataValue(b))
      return asArray(a).findIndex((x) => JSON.stringify(x) === needle)
    }
    case 'reverse':
      return toStoreValue(asArray(a).reverse())
    case 'sort': {
      const arr = asArray(a)
      arr.sort((x, y) => String(x).localeCompare(String(y), undefined, { numeric: true }))
      return toStoreValue(arr)
    }
    case 'unique': {
      const seen = new Set<string>()
      const out: unknown[] = []
      for (const item of asArray(a)) {
        const k = JSON.stringify(item)
        if (seen.has(k)) continue
        seen.add(k)
        out.push(item)
      }
      return toStoreValue(out)
    }
    case 'flatten':
      return toStoreValue(asArray(a).flat(Number.isFinite(asNumber(b)) ? asNumber(b) : 1))
    case 'sum':
      return asArray(a).reduce<number>((acc, x) => acc + (Number(x) || 0), 0)
    case 'min': {
      const nums = asArray(a).map((x) => Number(x)).filter((n) => Number.isFinite(n))
      return nums.length ? Math.min(...nums) : null
    }
    case 'max': {
      const nums = asArray(a).map((x) => Number(x)).filter((n) => Number.isFinite(n))
      return nums.length ? Math.max(...nums) : null
    }
    case 'filter': {
      // Keep truthy items, or items matching template/expr with $item
      const arr = asArray(a)
      const mode = asString(b || 'truthy')
      if (mode === 'truthy' || mode === '') {
        return toStoreValue(arr.filter(Boolean))
      }
      const out = arr.filter((item, index) => {
        const itemStr = typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          ? String(item)
          : JSON.stringify(item)
        const expr = mode
          .replace(/\{\{\s*item\s*\}\}/g, itemStr)
          .replace(/\$item/g, itemStr)
          .replace(/\{\{\s*index\s*\}\}/g, String(index))
        if (expr.includes('{{') || /[+\-*/%<>=!]/.test(expr)) {
          const n = evaluateMath(expr)
          if (Number.isFinite(n)) return n !== 0
          const t = resolveTemplate(expr)
          return Boolean(t) && t !== 'false' && t !== '0'
        }
        return itemStr.includes(mode) || itemStr === mode
      })
      return toStoreValue(out)
    }
    case 'map': {
      const arr = asArray(a)
      const template = asString(b)
      const out = arr.map((item, index) => {
        const itemStr =
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
            ? String(item)
            : JSON.stringify(item)
        if (!template) return item
        const expr = template
          .replace(/\{\{\s*item\s*\}\}/g, itemStr)
          .replace(/\$item/g, itemStr)
          .replace(/\{\{\s*index\s*\}\}/g, String(index))
        if (/^[+\-*/%\d.\s()]+$/.test(expr) || /[+\-*/%]/.test(expr)) {
          const n = evaluateMath(expr.replace(/[a-zA-Z_]+/g, (name) => {
            if (name === 'item') return itemStr
            if (name === 'index') return String(index)
            return name
          }))
          // Prefer template resolve for mixed strings
        }
        const mapped = resolveTemplate(
          template
            .replace(/\{\{\s*item\s*\}\}/g, itemStr)
            .replace(/\{\{\s*index\s*\}\}/g, String(index)),
        )
        // Also support bare `item * 2`
        if (/item|index/.test(template) && /[+\-*/%]/.test(template)) {
          const mathExpr = template
            .replace(/\bitem\b/g, itemStr)
            .replace(/\bindex\b/g, String(index))
          const n = evaluateMath(mathExpr)
          if (Number.isFinite(n)) return n
        }
        return mapped
      })
      return toStoreValue(out)
    }
    case 'find': {
      const arr = asArray(a)
      const needle = asString(b)
      const found = arr.find((item) => {
        const itemStr =
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
            ? String(item)
            : JSON.stringify(item)
        return itemStr === needle || itemStr.includes(needle)
      })
      return toStoreValue(found === undefined ? null : found)
    }
    case 'some':
      return asArray(a).some(Boolean)
    case 'every':
      return asArray(a).length > 0 && asArray(a).every(Boolean)
    case 'range': {
      const start = Math.trunc(asNumber(a) || 0)
      const end = Math.trunc(asNumber(b) || 0)
      const step = Math.trunc(asNumber(c) || 1) || 1
      const out: number[] = []
      if (step > 0) {
        for (let i = start; i < end; i += step) out.push(i)
      } else {
        for (let i = start; i > end; i += step) out.push(i)
      }
      return toStoreValue(out)
    }
    default:
      return toStoreValue(asArray(a))
  }
}

export type ObjectOp =
  | 'parse'
  | 'stringify'
  | 'get'
  | 'set'
  | 'keys'
  | 'values'
  | 'entries'
  | 'has'
  | 'merge'
  | 'omit'
  | 'pick'

function asObject(raw: unknown): Record<string, unknown> {
  const v = parseDataValue(raw)
  if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as Record<string, unknown>) }
  return {}
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return obj
  const root = { ...obj }
  let cur: Record<string, unknown> = root
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    const next = cur[p]
    const child =
      next && typeof next === 'object' && !Array.isArray(next)
        ? { ...(next as Record<string, unknown>) }
        : {}
    cur[p] = child
    cur = child
  }
  cur[parts[parts.length - 1]] = value
  return root
}

export function applyObjectOp(
  op: ObjectOp,
  a?: FormulaValue,
  b?: FormulaValue,
  c?: FormulaValue,
): FormulaValue {
  switch (op) {
    case 'parse': {
      const v = parseDataValue(a)
      return toStoreValue(v && typeof v === 'object' && !Array.isArray(v) ? v : {})
    }
    case 'stringify':
      return JSON.stringify(asObject(a))
    case 'get':
      return toStoreValue(getPath(asObject(a), asString(b)) ?? null)
    case 'set':
      return toStoreValue(setPath(asObject(a), asString(b), parseDataValue(c)))
    case 'keys':
      return toStoreValue(Object.keys(asObject(a)))
    case 'values':
      return toStoreValue(Object.values(asObject(a)))
    case 'entries':
      return toStoreValue(Object.entries(asObject(a)))
    case 'has':
      return Object.prototype.hasOwnProperty.call(asObject(a), asString(b))
    case 'merge':
      return toStoreValue({ ...asObject(a), ...asObject(b) })
    case 'omit': {
      const obj = asObject(a)
      delete obj[asString(b)]
      return toStoreValue(obj)
    }
    case 'pick': {
      const obj = asObject(a)
      const key = asString(b)
      return toStoreValue(key in obj ? { [key]: obj[key] } : {})
    }
    default:
      return toStoreValue(asObject(a))
  }
}

export function isTruthyCondition(raw: unknown): boolean {
  const v = resolveData(raw)
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false
  if (typeof v === 'string') {
    const lower = v.toLowerCase()
    if (lower === 'false' || lower === '0' || lower === 'null' || lower === 'undefined') return false
  }
  if (Array.isArray(v)) return v.length > 0
  return true
}

export { resolveData, toStoreValue, asString }
