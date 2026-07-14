import { setComponentAttr } from './componentState'
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
  // Keep raw string so intermediate values like "1." / "" are not snapped away
  return target.value ?? null
}

function isTruthyFlag(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === 'true' || raw === '1'
}

export function scopeFromProp(raw: unknown): VarScope {
  if (raw === 'temporary' || raw === 'memory') return 'temporary'
  return 'global'
}

/**
 * One-way display value (bound `value` / resolved `{{var}}`).
 * Returns undefined when the field should stay editable (uncontrolled).
 */
export function resolveOneWayDisplayValue(props: Record<string, unknown>): string | undefined {
  const rawValue = props.value

  if (typeof rawValue === 'string' && /\{\{/.test(rawValue)) {
    // Unresolved template in editor — treat as one-way placeholder, not editable text
    return undefined
  }

  if (
    Object.prototype.hasOwnProperty.call(props, 'value') &&
    rawValue !== undefined &&
    rawValue !== null &&
    rawValue !== ''
  ) {
    return String(rawValue)
  }

  return undefined
}

/** @deprecated Prefer resolveOneWayDisplayValue + uncontrolled defaults */
export function resolveControlledFieldValue(
  props: Record<string, unknown>,
  liveValue?: string | number | boolean | null,
): string | undefined {
  const oneWay = resolveOneWayDisplayValue(props)
  if (oneWay !== undefined) return oneWay

  const bindKey = String(props.bindToVar ?? '').trim()
  if (bindKey) {
    const fromVar = getVar(bindKey)
    if (fromVar !== undefined && fromVar !== null) return String(fromVar)
  }

  if (liveValue !== undefined && liveValue !== null) return String(liveValue)
  return undefined
}

/**
 * True when the field displays a bound value and should not accept typing.
 * `bindToVar` alone is two-way (editable). One-way = non-empty `value` prop.
 */
export function isOneWayBoundField(props: Record<string, unknown>): boolean {
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

/** Initial string for uncontrolled text-like fields. */
export function getEditableDefaultString(props: Record<string, unknown>): string {
  const bindKey = String(props.bindToVar ?? '').trim()
  if (bindKey) {
    const fromVar = getVar(bindKey)
    if (fromVar !== undefined && fromVar !== null) return String(fromVar)
  }
  return String(props.defaultValue ?? '')
}

/** Strip keys that must be owned by the component (not HTML attributes). */
export function sanitizeFieldAttributes(
  attributes: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> {
  if (!attributes) return {}
  const {
    value: _v,
    checked: _c,
    defaultValue: _dv,
    defaultChecked: _dc,
    readOnly: _ro,
    disabled: _d,
    onChange: _oc,
    onInput: _oi,
    ...rest
  } = attributes as Record<string, string | number | boolean> & {
    onChange?: unknown
    onInput?: unknown
  }
  return rest
}

/**
 * Sync field change into component instance `.value` and optional `bindToVar`,
 * then call any existing onChange handler.
 */
export function wrapComponentValueChange(
  nodeId: string,
  props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  if (isOneWayBoundField(props)) return eventHandlers

  const bindKey = String(props.bindToVar ?? '').trim()
  const prev = eventHandlers.onChange
  return {
    ...eventHandlers,
    onChange: (nativeEvent: unknown) => {
      const value = extractEventValue(nativeEvent)
      setComponentAttr(nodeId, 'value', value as string | number | boolean | null)
      if (bindKey) {
        setVar(bindKey, value as string | number | boolean | null, scopeFromProp(props.bindScope))
      }
      prev?.(nativeEvent)
    },
  }
}

/** @deprecated Use wrapComponentValueChange */
export function wrapBindToVarChange(
  _props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
  return eventHandlers
}
