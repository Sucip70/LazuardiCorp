import { setComponentAttr } from './componentState'
import { getVar } from './runtimeVars'

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

function isTruthyFlag(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === 'true' || raw === '1'
}

/**
 * Resolve controlled display value for form fields.
 * - `bindToVar` → one-way display from a named runtime var (output fields)
 * - Explicit non-empty `value` (after {{binding}} resolve) → one-way display
 * - Otherwise → live `componentState[nodeId].value` when provided via `liveValue`
 * - Unresolved `{{...}}` in edit mode → undefined (uncontrolled)
 */
export function resolveControlledFieldValue(
  props: Record<string, unknown>,
  liveValue?: string | number | boolean | null,
): string | undefined {
  const bindKey = String(props.bindToVar ?? '').trim()
  const rawValue = props.value

  if (typeof rawValue === 'string' && /\{\{/.test(rawValue)) {
    return undefined
  }

  // Output-only: mirror a named variable
  if (bindKey) {
    const live = getVar(bindKey)
    if (live !== undefined && live !== null) return String(live)
    return String(props.defaultValue ?? '')
  }

  // One-way display prop (e.g. value="{{total}}" already resolved)
  if (Object.prototype.hasOwnProperty.call(props, 'value') && rawValue !== undefined && rawValue !== null) {
    if (rawValue === '') return undefined
    return String(rawValue)
  }

  // Editable input: controlled from component instance state once set
  if (liveValue !== undefined && liveValue !== null) {
    return String(liveValue)
  }

  return undefined
}

/** True when the field displays a bound value and should not accept typing. */
export function isOneWayBoundField(props: Record<string, unknown>): boolean {
  const bindKey = String(props.bindToVar ?? '').trim()
  if (bindKey) return true
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

/**
 * Sync field change into component instance `.value` (addressable as `nodeId.value`),
 * then call any existing onChange handler.
 */
export function wrapComponentValueChange(
  nodeId: string,
  props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  // Output fields (bindToVar) do not write instance value
  if (String(props.bindToVar ?? '').trim()) return eventHandlers

  const prev = eventHandlers.onChange
  return {
    ...eventHandlers,
    onChange: (nativeEvent: unknown) => {
      const value = extractEventValue(nativeEvent)
      setComponentAttr(nodeId, 'value', value as string | number | boolean | null)
      prev?.(nativeEvent)
    },
  }
}

/** @deprecated Use wrapComponentValueChange — bindToVar is output-only now. */
export function wrapBindToVarChange(
  _props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  return eventHandlers
}
