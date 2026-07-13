import type {
  ActionContext,
  ActionHandler,
  JsonEventAction,
  JsonEventDefinition,
} from './types'
import {
  applyMathOp,
  applyStringOp,
  evaluateMath,
  resolveTemplate,
  resolveValue,
  type MathOp,
  type StringOp,
} from './formulas'
import { extractEventValue } from './formBindings'
import { clearAllVars, clearTemporaryVars, clearVar, setVar, type VarScope } from './runtimeVars'

const DOM_EVENT_MAP: Record<string, string> = {
  onClick: 'onClick',
  onChange: 'onChange',
  onSubmit: 'onSubmit',
  onFocus: 'onFocus',
  onBlur: 'onBlur',
  onMouseEnter: 'onMouseEnter',
  onMouseLeave: 'onMouseLeave',
}

/** Normalize legacy single-action events and multi-step `actions` arrays. */
export function getEventActions(
  definition: JsonEventDefinition | string | null | undefined,
): JsonEventAction[] {
  if (!definition) return []
  if (typeof definition === 'string') {
    return definition.trim() ? [{ action: definition, payload: {} }] : []
  }
  if (Array.isArray(definition.actions)) {
    return definition.actions.filter((a) => a && typeof a.action === 'string' && a.action.trim())
  }
  const key = definition.actionId ?? definition.action
  if (!key) return []
  return [{ action: key, payload: definition.payload ?? {} }]
}

export function buildEventHandlers(
  nodeId: string,
  type: string,
  events: Record<string, JsonEventDefinition>,
  props: Record<string, unknown>,
  actionHandlers: Record<string, ActionHandler>,
): Record<string, (...args: unknown[]) => void> {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  const mergedEvents: Record<string, JsonEventDefinition | string> = { ...events }

  for (const [propKey, propValue] of Object.entries(props)) {
    if (propKey.startsWith('on') && typeof propValue === 'string') {
      mergedEvents[propKey] = propValue
    }
  }

  for (const [eventName, definition] of Object.entries(mergedEvents)) {
    const reactEvent = DOM_EVENT_MAP[eventName] ?? eventName
    const steps = getEventActions(definition)
    if (steps.length === 0 && typeof definition !== 'string') {
      // Enabled event with empty actions[] is a no-op handler (still applies preventDefault)
      const config = definition
      const hasEmptyActions = Array.isArray(config.actions)
      if (!hasEmptyActions) continue
    } else if (steps.length === 0) {
      continue
    }

    const config = typeof definition === 'string' ? {} : definition

    handlers[reactEvent] = (nativeEvent: unknown) => {
      const event = nativeEvent as { preventDefault?: () => void; stopPropagation?: () => void }
      const isFieldEditEvent =
        reactEvent === 'onChange' ||
        reactEvent === 'onInput' ||
        reactEvent === 'onFocus' ||
        reactEvent === 'onBlur' ||
        reactEvent === 'onKeyDown' ||
        reactEvent === 'onKeyUp' ||
        reactEvent === 'onKeyPress'
      const shouldPreventDefault = isFieldEditEvent
        ? config.preventDefault === true
        : config.preventDefault !== false
      if (shouldPreventDefault && typeof event?.preventDefault === 'function') {
        event.preventDefault()
      }
      if (config.stopPropagation && typeof event?.stopPropagation === 'function') {
        event.stopPropagation()
      }

      const context: ActionContext = {
        nodeId,
        type,
        event: eventName,
        nativeEvent,
        eventValue: extractEventValue(nativeEvent),
      }

      for (const step of steps) {
        const handler = actionHandlers[step.action]
        if (!handler) {
          console.warn('[runtime] unknown action', step.action)
          continue
        }
        handler(step.payload, context)
      }
    }
  }

  return handlers
}

function scopeFromPayload(payload?: Record<string, unknown>): VarScope {
  const scope = payload?.scope
  if (scope === 'temporary' || scope === 'memory') return 'temporary'
  if (scope === 'global' || scope === 'session') return 'global'
  return 'global'
}

export const defaultActionHandlers: Record<string, ActionHandler> = {
  navigate: (payload) => {
    const href = payload?.href
    if (typeof href === 'string') {
      const resolved = resolveTemplate(href)
      // In-editor preview: hash/path only — avoid full page unload when possible
      if (resolved.startsWith('#')) {
        const el = document.querySelector(resolved)
        el?.scrollIntoView({ behavior: 'smooth' })
        return
      }
      window.location.assign(resolved)
    }
  },
  openUrl: (payload) => {
    const href = payload?.href
    const target = typeof payload?.target === 'string' ? payload.target : '_blank'
    if (typeof href === 'string') window.open(resolveTemplate(href), target)
  },
  scrollTo: (payload) => {
    const elementId = payload?.elementId
    if (typeof elementId !== 'string') return
    document.getElementById(resolveTemplate(elementId))?.scrollIntoView({
      behavior: payload?.behavior === 'smooth' ? 'smooth' : 'auto',
    })
  },
  submitForm: (payload) => {
    const formId = payload?.formId
    if (typeof formId !== 'string') return
    const form = document.getElementById(resolveTemplate(formId)) as HTMLFormElement | null
    form?.requestSubmit()
  },
  toggleVisibility: (payload) => {
    const elementId = payload?.elementId
    if (typeof elementId !== 'string') return
    const el = document.getElementById(resolveTemplate(elementId))
    if (!el) return
    el.classList.toggle('hidden')
  },
  custom: (payload) => {
    console.info('[JsonRenderer] custom action', payload)
  },
  handleClick: () => {
    console.info('[JsonRenderer] handleClick invoked')
  },

  /** Set a runtime variable (session by default, survives page switches in the same tab). */
  setVar: (payload, context) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!key) return
    const raw = payload?.value ?? payload?.expr ?? ''
    const useEvent =
      payload?.fromEvent === true ||
      raw === '$event' ||
      raw === '{{$event}}' ||
      raw === '@$event'
    const value = useEvent
      ? ((context?.eventValue ?? null) as string | number | boolean | null)
      : resolveValue(raw)
    setVar(key, value, scopeFromPayload(payload))
  },

  clearVar: (payload) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!key) return
    const kind = scopeFromPayload(payload)
    clearVar(key, kind === 'temporary' ? 'temporary' : 'global')
  },

  clearVars: (payload) => {
    const kind = scopeFromPayload(payload)
    if (kind === 'temporary') clearTemporaryVars()
    else clearAllVars()
  },

  /**
   * Math: structured op (add/sub/mul/…) or free expression in `expr`.
   * Result stored in `key`.
   */
  math: (payload) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!key) return

    let result: number
    if (typeof payload?.expr === 'string' && payload.expr.trim()) {
      result = evaluateMath(payload.expr)
    } else {
      const op = String(payload?.op ?? 'add') as MathOp
      const a = resolveValue(payload?.a)
      const b = payload?.b !== undefined ? resolveValue(payload.b) : undefined
      const decimals =
        payload?.decimals !== undefined && payload.decimals !== ''
          ? Number(payload.decimals)
          : undefined
      result = applyMathOp(op, a, b, decimals)
    }

    if (!Number.isFinite(result)) {
      console.warn('[runtime] math produced non-finite result', payload)
      return
    }
    setVar(key, result, scopeFromPayload(payload))
  },

  /**
   * String ops: concat, upper, lower, trim, replace, slice, length, template.
   * Result stored in `key`.
   */
  string: (payload) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!key) return
    const op = String(payload?.op ?? 'concat') as StringOp
    const a = resolveValue(payload?.a ?? payload?.value ?? '')
    const b = payload?.b !== undefined ? resolveValue(payload.b) : undefined
    const c = payload?.c !== undefined ? resolveValue(payload.c) : undefined
    const result = applyStringOp(op, a, b, c)
    setVar(key, result, scopeFromPayload(payload))
  },

  /**
   * Generic formula: if expr looks like math, evaluate as number; otherwise template string.
   * Prefer `math` / `string` for clarity; `formula` is a convenience shorthand.
   */
  formula: (payload) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!key) return
    const expr = typeof payload?.expr === 'string' ? payload.expr : ''
    if (!expr.trim()) return

    const mathResult = evaluateMath(expr)
    if (Number.isFinite(mathResult) && /[+\-*/%()]|\d/.test(expr)) {
      setVar(key, mathResult, scopeFromPayload(payload))
      return
    }
    setVar(key, resolveTemplate(expr), scopeFromPayload(payload))
  },
}
