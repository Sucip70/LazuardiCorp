import type { JsonEventAction } from '../../renderer/types'
import { EVENT_FUNCTION_CATALOG } from './functionCatalog'

export type { FunctionCatalogItem, FunctionCategory } from './functionCatalog'
export {
  EVENT_FUNCTION_CATALOG,
  FUNCTION_CATEGORY_LABELS,
} from './functionCatalog'

export type ParseScriptResult =
  | { ok: true; actions: JsonEventAction[] }
  | { ok: false; error: string; line?: number }

function formatArg(value: unknown): string {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  if (s === '$event') return '$event'
  // Bare expressions / paths / templates — leave unquoted when safe
  if (/^[a-zA-Z_$][\w.$]*$/.test(s) || s.includes('{{') || s.includes('.')) {
    if (/^[\w.$]+$/.test(s) || s.includes('{{')) return s.includes(' ') || s.includes('{{') ? JSON.stringify(s) : s
  }
  return JSON.stringify(s)
}

function formatStringish(value: unknown): string {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(String(value))
}

/** Serialize actions to editable script text. */
export function actionsToScript(actions: JsonEventAction[]): string {
  return actions
    .map((step) => {
      const p = step.payload ?? {}
      switch (step.action) {
        case 'setVar': {
          const key = formatStringish(p.key ?? '')
          const value =
            p.fromEvent === true || p.value === '$event'
              ? '$event'
              : formatArg(p.value ?? p.expr ?? '')
          const scope =
            p.scope === 'temporary' || p.scope === 'memory'
              ? `, ${formatStringish('temporary')}`
              : ''
          return `setVar(${key}, ${value}${scope});`
        }
        case 'clearVar':
          return `clearVar(${formatStringish(p.key ?? '')});`
        case 'clearVars': {
          if (p.scope === 'temporary' || p.scope === 'memory') {
            return `clearVars(${formatStringish('temporary')});`
          }
          return 'clearVars();'
        }
        case 'math': {
          if (typeof p.expr === 'string' && p.expr.trim()) {
            return `math(${formatStringish(p.key ?? '')}, ${formatStringish(p.expr)});`
          }
          // Fallback structured → expr-ish comment via op form as custom-ish math call with expr empty
          const a = formatArg(p.a ?? 0)
          const b = p.b !== undefined ? `, ${formatArg(p.b)}` : ''
          return `math(${formatStringish(p.key ?? '')}, ${formatStringish(`${p.op ?? 'add'} ${a}${b}`)});`
        }
        case 'formula':
          return `formula(${formatStringish(p.key ?? '')}, ${formatStringish(p.expr ?? '')});`
        case 'string': {
          const args = [
            formatStringish(p.key ?? ''),
            formatStringish(p.op ?? 'concat'),
            formatArg(p.a ?? ''),
          ]
          if (p.b !== undefined) args.push(formatArg(p.b))
          if (p.c !== undefined) args.push(formatArg(p.c))
          return `string(${args.join(', ')});`
        }
        case 'regex':
        case 'array':
        case 'object':
        case 'json': {
          const args = [
            formatStringish(p.key ?? ''),
            formatStringish(p.op ?? ''),
          ]
          if (p.a !== undefined) args.push(formatArg(p.a))
          if (p.b !== undefined) args.push(formatArg(p.b))
          if (p.c !== undefined) args.push(formatArg(p.c))
          if (p.d !== undefined) args.push(formatArg(p.d))
          return `${step.action}(${args.join(', ')});`
        }
        case 'if': {
          const args = [
            formatStringish(p.key ?? ''),
            formatArg(p.a ?? p.condition ?? ''),
            formatArg(p.b ?? p.then ?? ''),
            formatArg(p.c ?? p.else ?? ''),
          ]
          return `if(${args.join(', ')});`
        }
        case 'copyVar':
          return `copyVar(${formatStringish(p.a ?? p.from ?? '')}, ${formatStringish(p.b ?? p.to ?? p.key ?? '')});`
        case 'each':
          return `each(${formatArg(p.a ?? p.source ?? '')}, ${formatStringish(p.b ?? 'item')}, ${formatStringish(p.c ?? 'index')});`
        case 'log':
          return `log(${formatArg(p.a ?? p.message ?? p.value ?? '')});`
        case 'navigate':
          return `navigate(${formatStringish(p.href ?? '/')});`
        case 'openUrl': {
          const target = p.target != null ? `, ${formatStringish(p.target)}` : ''
          return `openUrl(${formatStringish(p.href ?? p.url ?? '')}${target});`
        }
        case 'scrollTo':
          return `scrollTo(${formatStringish(p.elementId ?? p.selector ?? '')});`
        case 'submitForm':
          return `submitForm(${formatStringish(p.formId ?? '')});`
        case 'toggleVisibility':
          return `toggleVisibility(${formatStringish(p.elementId ?? p.selector ?? '')});`
        case 'custom':
          return `custom(${JSON.stringify(p)});`
        case 'handleClick':
          return 'handleClick();'
        default:
          return `${step.action}(${JSON.stringify(p)});`
      }
    })
    .join('\n')
}

/** Split top-level function arguments respecting quotes, braces, and parens. */
function splitArgs(raw: string): string[] {
  const args: string[] = []
  let cur = ''
  let depthParen = 0
  let depthBrace = 0
  let depthBracket = 0
  let inSingle = false
  let inDouble = false
  let escape = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) {
      cur += ch
      escape = false
      continue
    }
    if ((inSingle || inDouble) && ch === '\\') {
      cur += ch
      escape = true
      continue
    }
    if (!inDouble && ch === "'" && !inSingle) {
      inSingle = true
      cur += ch
      continue
    }
    if (inSingle && ch === "'") {
      inSingle = false
      cur += ch
      continue
    }
    if (!inSingle && ch === '"' && !inDouble) {
      inDouble = true
      cur += ch
      continue
    }
    if (inDouble && ch === '"') {
      inDouble = false
      cur += ch
      continue
    }
    if (inSingle || inDouble) {
      cur += ch
      continue
    }
    if (ch === '(') depthParen++
    if (ch === ')') depthParen--
    if (ch === '{') depthBrace++
    if (ch === '}') depthBrace--
    if (ch === '[') depthBracket++
    if (ch === ']') depthBracket--
    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) args.push(cur.trim())
  return args
}

function parseLiteral(token: string): unknown {
  const t = token.trim()
  if (!t) return ''
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (t === '$event') return '$event'
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    try {
      return JSON.parse(t.startsWith("'") ? `"${t.slice(1, -1).replace(/"/g, '\\"')}"` : t)
    } catch {
      return t.slice(1, -1)
    }
  }
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.parse(t) as unknown
    } catch {
      throw new Error(`Invalid JSON: ${t}`)
    }
  }
  // Bare identifier / expression → string for resolveValue
  return t
}

function callToAction(name: string, args: string[], line: number): JsonEventAction {
  switch (name) {
    case 'setVar': {
      if (args.length < 2) throw Object.assign(new Error('setVar requires key and value'), { line })
      const key = String(parseLiteral(args[0]))
      const value = parseLiteral(args[1])
      const payload: Record<string, unknown> = { key }
      if (value === '$event') {
        payload.fromEvent = true
        payload.value = '$event'
      } else {
        payload.value = value
      }
      if (args[2]) payload.scope = String(parseLiteral(args[2]))
      return { action: 'setVar', payload }
    }
    case 'clearVar': {
      if (args.length < 1) throw Object.assign(new Error('clearVar requires key'), { line })
      return { action: 'clearVar', payload: { key: String(parseLiteral(args[0])) } }
    }
    case 'clearVars': {
      const payload: Record<string, unknown> = {}
      if (args[0]) payload.scope = String(parseLiteral(args[0]))
      return { action: 'clearVars', payload }
    }
    case 'math': {
      if (args.length < 2) throw Object.assign(new Error('math requires key and expr'), { line })
      return {
        action: 'math',
        payload: {
          key: String(parseLiteral(args[0])),
          expr: String(parseLiteral(args[1])),
        },
      }
    }
    case 'formula': {
      if (args.length < 2) throw Object.assign(new Error('formula requires key and expr'), { line })
      return {
        action: 'formula',
        payload: {
          key: String(parseLiteral(args[0])),
          expr: String(parseLiteral(args[1])),
        },
      }
    }
    case 'string': {
      if (args.length < 3) {
        throw Object.assign(new Error('string requires key, op, and a'), { line })
      }
      const payload: Record<string, unknown> = {
        key: String(parseLiteral(args[0])),
        op: String(parseLiteral(args[1])),
        a: parseLiteral(args[2]),
      }
      if (args[3] !== undefined) payload.b = parseLiteral(args[3])
      if (args[4] !== undefined) payload.c = parseLiteral(args[4])
      return { action: 'string', payload }
    }
    case 'regex':
    case 'array':
    case 'object':
    case 'json': {
      if (args.length < 2) {
        throw Object.assign(new Error(`${name} requires key and op`), { line })
      }
      const payload: Record<string, unknown> = {
        key: String(parseLiteral(args[0])),
        op: String(parseLiteral(args[1])),
      }
      if (args[2] !== undefined) payload.a = parseLiteral(args[2])
      if (args[3] !== undefined) payload.b = parseLiteral(args[3])
      if (args[4] !== undefined) payload.c = parseLiteral(args[4])
      if (args[5] !== undefined) payload.d = parseLiteral(args[5])
      return { action: name, payload }
    }
    case 'if': {
      if (args.length < 4) {
        throw Object.assign(new Error('if requires key, condition, then, else'), { line })
      }
      return {
        action: 'if',
        payload: {
          key: String(parseLiteral(args[0])),
          a: parseLiteral(args[1]),
          b: parseLiteral(args[2]),
          c: parseLiteral(args[3]),
        },
      }
    }
    case 'copyVar': {
      if (args.length < 2) throw Object.assign(new Error('copyVar requires from and to'), { line })
      return {
        action: 'copyVar',
        payload: { a: String(parseLiteral(args[0])), b: String(parseLiteral(args[1])) },
      }
    }
    case 'each': {
      if (args.length < 1) throw Object.assign(new Error('each requires source'), { line })
      return {
        action: 'each',
        payload: {
          a: parseLiteral(args[0]),
          b: args[1] !== undefined ? String(parseLiteral(args[1])) : 'item',
          c: args[2] !== undefined ? String(parseLiteral(args[2])) : 'index',
        },
      }
    }
    case 'log': {
      return {
        action: 'log',
        payload: { a: args[0] !== undefined ? parseLiteral(args[0]) : '' },
      }
    }
    case 'navigate': {
      if (args.length < 1) throw Object.assign(new Error('navigate requires href'), { line })
      return { action: 'navigate', payload: { href: String(parseLiteral(args[0])) } }
    }
    case 'openUrl': {
      if (args.length < 1) throw Object.assign(new Error('openUrl requires href'), { line })
      const payload: Record<string, unknown> = { href: String(parseLiteral(args[0])) }
      if (args[1]) payload.target = String(parseLiteral(args[1]))
      return { action: 'openUrl', payload }
    }
    case 'scrollTo': {
      if (args.length < 1) throw Object.assign(new Error('scrollTo requires elementId'), { line })
      return { action: 'scrollTo', payload: { elementId: String(parseLiteral(args[0])) } }
    }
    case 'submitForm': {
      if (args.length < 1) throw Object.assign(new Error('submitForm requires formId'), { line })
      return { action: 'submitForm', payload: { formId: String(parseLiteral(args[0])) } }
    }
    case 'toggleVisibility': {
      if (args.length < 1) {
        throw Object.assign(new Error('toggleVisibility requires elementId'), { line })
      }
      return {
        action: 'toggleVisibility',
        payload: { elementId: String(parseLiteral(args[0])) },
      }
    }
    case 'custom': {
      const obj = args[0] ? parseLiteral(args[0]) : {}
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        throw Object.assign(new Error('custom requires a JSON object'), { line })
      }
      return { action: 'custom', payload: obj as Record<string, unknown> }
    }
    case 'handleClick':
      return { action: 'handleClick', payload: {} }
    default:
      throw Object.assign(new Error(`Unknown function "${name}"`), { line })
  }
}

/**
 * Parse event script into actions.
 * Line-oriented; `;` optional; `#` comments; blank lines ignored.
 */
export function parseScript(text: string): ParseScriptResult {
  const actions: JsonEventAction[] = []
  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    let line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    // Strip trailing semicolon
    if (line.endsWith(';')) line = line.slice(0, -1).trim()

    const match = /^([a-zA-Z_][\w]*)\s*\((.*)\)\s*$/s.exec(line)
    if (!match) {
      return {
        ok: false,
        error: `Expected function call, e.g. setVar("a", 1);`,
        line: lineNo,
      }
    }

    const name = match[1]
    const argsRaw = match[2].trim()
    let args: string[]
    try {
      args = argsRaw ? splitArgs(argsRaw) : []
      actions.push(callToAction(name, args, lineNo))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse error'
      const line = err && typeof err === 'object' && 'line' in err ? Number((err as { line: number }).line) : lineNo
      return { ok: false, error: message, line }
    }
  }

  return { ok: true, actions }
}

/** Seed script for a newly enabled event. */
export function seedScriptForAction(defaultAction: string): string {
  const item = EVENT_FUNCTION_CATALOG.find((f) => f.action === defaultAction)
  return item?.template ?? `${defaultAction}();`
}
