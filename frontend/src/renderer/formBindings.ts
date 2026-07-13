import { getVar, setVar, type VarScope } from './runtimeVars'

/** Extract typed value from a DOM change/input event (or checkbox checked). */
export function extractEventValue(nativeEvent: unknown): string | boolean | number | null {
  const e = nativeEvent as {
    target?: { value?: string; checked?: boolean; type?: string }
    currentTarget?: { value?: string; checked?: boolean; type?: string }
  } | null
  const target = e?.target ?? e?.currentTarget
  if (!target) return null
  if (target.type === 'checkbox') return Boolean(target.checked)
  if (target.type === 'number' && target.value !== '' && target.value != null) {
    const n = Number(target.value)
    return Number.isFinite(n) ? n : target.value
  }
  return target.value ?? null
}

export function scopeFromProp(raw: unknown): VarScope {
  if (raw === 'temporary' || raw === 'memory') return 'temporary'
  return 'global'
}

function isTruthyFlag(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === 'true' || raw === '1'
}

/**
 * Resolve controlled display value for form fields.
 * - `bindToVar` → live runtime var (two-way with wrapBindToVarChange)
 * - Explicit non-empty `value` (after {{binding}} resolve) → one-way display (output)
 * - Empty `value: ""` is ignored (legacy default) so fields stay editable
 * - Unresolved `{{...}}` in edit mode → undefined (uncontrolled)
 */
export function resolveControlledFieldValue(
  props: Record<string, unknown>,
): string | undefined {
  const bindKey = String(props.bindToVar ?? '').trim()
  const rawValue = props.value

  if (typeof rawValue === 'string' && /\{\{/.test(rawValue)) {
    return undefined
  }

  if (bindKey) {
    const live = getVar(bindKey)
    if (live !== undefined && live !== null) return String(live)
    return String(props.defaultValue ?? '')
  }

  // One-way display only when value is actually set (not legacy empty string)
  if (Object.prototype.hasOwnProperty.call(props, 'value') && rawValue !== undefined && rawValue !== null) {
    if (rawValue === '') return undefined
    return String(rawValue)
  }

  return undefined
}

/** True when the field is one-way bound (shows a value but typing should not edit it). */
export function isOneWayBoundField(props: Record<string, unknown>): boolean {
  const bindKey = String(props.bindToVar ?? '').trim()
  if (bindKey) return false
  const rawValue = props.value
  if (typeof rawValue === 'string' && /\{\{/.test(rawValue)) return true
  return (
    Object.prototype.hasOwnProperty.call(props, 'value') &&
    rawValue !== undefined &&
    rawValue !== null &&
    rawValue !== ''
  )
}

export function isFieldReadOnly(props: Record<string, unknown>): boolean {
  return isTruthyFlag(props.readOnly) || isOneWayBoundField(props)
}

export function isFieldDisabled(props: Record<string, unknown>): boolean {
  return isTruthyFlag(props.disabled)
}

/** Sync field change into bindToVar, then call any existing onChange handler. */
export function wrapBindToVarChange(
  props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  const bindKey = String(props.bindToVar ?? '').trim()
  if (!bindKey) return eventHandlers

  const scope = scopeFromProp(props.bindScope)
  const prev = eventHandlers.onChange

  return {
    ...eventHandlers,
    onChange: (nativeEvent: unknown) => {
      const value = extractEventValue(nativeEvent)
      setVar(bindKey, value as string | number | boolean | null, scope)
      // Run designer onChange after syncing the var. Skip preventDefault side-effects
      // that would block further input handling — var sync already captured the value.
      prev?.(nativeEvent)
    },
  }
}
