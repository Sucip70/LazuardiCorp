import { setComponentAttr } from './componentState'

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

export function isFieldReadOnly(props: Record<string, unknown>): boolean {
  return isTruthyFlag(props.readOnly)
}

export function isFieldDisabled(props: Record<string, unknown>): boolean {
  return isTruthyFlag(props.disabled)
}

/** Uncontrolled starting text from `defaultValue`. */
export function getEditableDefaultString(props: Record<string, unknown>): string {
  if (props.defaultValue !== undefined && props.defaultValue !== null) {
    return String(props.defaultValue)
  }
  return ''
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
 * Sync field change into component instance `.value`, then call any existing onChange.
 * Does not bind to runtime variables — that model was removed; use events (setVar) instead.
 */
export function wrapComponentValueChange(
  nodeId: string,
  _props: Record<string, unknown>,
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): Record<string, (...args: unknown[]) => void> {
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
