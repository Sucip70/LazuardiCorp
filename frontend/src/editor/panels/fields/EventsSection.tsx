import type { SupportedEvent } from '../../../component-library/types/catalog'
import type { JsonEventDefinition } from '../../../renderer/types'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'
import { AccordionSection } from './AccordionSection'

const EVENT_ACTIONS = [
  { label: 'Navigate', value: 'navigate' },
  { label: 'Open URL', value: 'openUrl' },
  { label: 'Scroll to element', value: 'scrollTo' },
  { label: 'Submit form', value: 'submitForm' },
  { label: 'Toggle visibility', value: 'toggleVisibility' },
  { label: 'Set variable', value: 'setVar' },
  { label: 'Math', value: 'math' },
  { label: 'String', value: 'string' },
  { label: 'Formula', value: 'formula' },
  { label: 'Clear variable', value: 'clearVar' },
  { label: 'Clear all variables', value: 'clearVars' },
  { label: 'Custom', value: 'custom' },
  { label: 'Handle click (log)', value: 'handleClick' },
] as const

const MATH_OPS = [
  { label: 'Add (a + b)', value: 'add' },
  { label: 'Subtract (a − b)', value: 'sub' },
  { label: 'Multiply (a × b)', value: 'mul' },
  { label: 'Divide (a ÷ b)', value: 'div' },
  { label: 'Modulo (a % b)', value: 'mod' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
  { label: 'Absolute (a)', value: 'abs' },
  { label: 'Round (a)', value: 'round' },
  { label: 'Floor (a)', value: 'floor' },
  { label: 'Ceil (a)', value: 'ceil' },
  { label: 'Percent (a × b%)', value: 'percent' },
] as const

const STRING_OPS = [
  { label: 'Concat (a + b)', value: 'concat' },
  { label: 'Uppercase', value: 'upper' },
  { label: 'Lowercase', value: 'lower' },
  { label: 'Trim', value: 'trim' },
  { label: 'Replace (a, find b, with c)', value: 'replace' },
  { label: 'Slice (a, start b, end c)', value: 'slice' },
  { label: 'Length', value: 'length' },
  { label: 'Template (resolve {{vars}})', value: 'template' },
] as const

const inputClass = 'rounded-md border border-gray-300 px-3 py-2 text-sm'
const labelClass = 'text-sm font-medium text-gray-700'
const hintClass = 'text-[11px] text-gray-400'

function getEventDef(
  events: Record<string, unknown> | undefined,
  eventName: string,
): JsonEventDefinition | null {
  const raw = events?.[eventName]
  if (!raw || typeof raw !== 'object') return null
  return raw as JsonEventDefinition
}

function ScopeField({
  payload,
  onChange,
}: {
  payload: Record<string, unknown>
  onChange: (payload: Record<string, unknown>) => void
}) {
  const raw = String(payload.scope ?? 'global')
  const value =
    raw === 'session' ? 'global' : raw === 'memory' ? 'temporary' : raw

  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>Scope</span>
      <select
        className={inputClass}
        value={value === 'temporary' ? 'temporary' : 'global'}
        onChange={(e) => onChange({ ...payload, scope: e.target.value })}
      >
        <option value="global">Global (all pages)</option>
        <option value="temporary">Temporary (this page only)</option>
      </select>
    </label>
  )
}

function KeyField({
  payload,
  onChange,
  hint,
}: {
  payload: Record<string, unknown>
  onChange: (payload: Record<string, unknown>) => void
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>Variable key</span>
      <input
        className={inputClass}
        value={String(payload.key ?? '')}
        placeholder="total"
        onChange={(e) => onChange({ ...payload, key: e.target.value })}
      />
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  )
}

function PayloadFields({
  action,
  payload,
  onChange,
}: {
  action: string
  payload: Record<string, unknown>
  onChange: (payload: Record<string, unknown>) => void
}) {
  function setField(key: string, value: string) {
    onChange({ ...payload, [key]: value || undefined })
  }

  if (action === 'navigate' || action === 'openUrl') {
    return (
      <>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Href</span>
          <input
            className={inputClass}
            value={String(payload.href ?? '')}
            onChange={(e) => setField('href', e.target.value)}
            placeholder="#section or /path — supports {{vars.x}}"
          />
        </label>
        {action === 'openUrl' && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Target</span>
            <select
              className={inputClass}
              value={String(payload.target ?? '_blank')}
              onChange={(e) => setField('target', e.target.value)}
            >
              <option value="_blank">New tab</option>
              <option value="_self">Same tab</option>
            </select>
          </label>
        )}
      </>
    )
  }

  if (action === 'scrollTo' || action === 'toggleVisibility') {
    return (
      <>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Element ID</span>
          <input
            className={inputClass}
            value={String(payload.elementId ?? '')}
            onChange={(e) => setField('elementId', e.target.value)}
          />
        </label>
        {action === 'scrollTo' && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Behavior</span>
            <select
              className={inputClass}
              value={String(payload.behavior ?? 'smooth')}
              onChange={(e) => setField('behavior', e.target.value)}
            >
              <option value="smooth">Smooth</option>
              <option value="auto">Auto</option>
            </select>
          </label>
        )}
      </>
    )
  }

  if (action === 'submitForm') {
    return (
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Form ID</span>
        <input
          className={inputClass}
          value={String(payload.formId ?? '')}
          onChange={(e) => setField('formId', e.target.value)}
        />
      </label>
    )
  }

  if (action === 'setVar') {
    const fromEvent = payload.fromEvent === true || payload.value === '$event'
    return (
      <>
        <KeyField
          payload={payload}
          onChange={onChange}
          hint="Use in text as {{vars.total}} or {{total}}"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={fromEvent}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ ...payload, fromEvent: true, value: '$event' })
              } else {
                const next = { ...payload }
                delete next.fromEvent
                if (next.value === '$event') next.value = ''
                onChange(next)
              }
            }}
          />
          Use field value ($event)
        </label>
        {!fromEvent && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Value</span>
            <input
              className={inputClass}
              value={String(payload.value ?? '')}
              onChange={(e) => setField('value', e.target.value)}
              placeholder="hello / 42 / {{vars.other}} / @other / cmp_xxx.value"
            />
          </label>
        )}
        {fromEvent && (
          <span className={hintClass}>
            On change/click, stores the input&apos;s current value into the variable.
            For calculators, prefer Math with component paths like cmp_input.value + cmp_other.value.
          </span>
        )}
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'clearVar') {
    return (
      <>
        <KeyField payload={payload} onChange={onChange} />
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'clearVars') {
    return (
      <>
        <p className={hintClass}>Choose which variables to clear.</p>
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'math') {
    return (
      <>
        <KeyField payload={payload} onChange={onChange} hint="Result is stored in this variable" />
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Expression (optional)</span>
          <input
            className={`${inputClass} font-mono text-xs`}
            value={String(payload.expr ?? '')}
            onChange={(e) => setField('expr', e.target.value)}
            placeholder="cmp_input_a.value + cmp_input_b.value"
          />
          <span className={hintClass}>
            If set, overrides op / a / b below. Use componentId.value for inputs, or {'{{vars.x}}'} for named vars.
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Operation</span>
          <select
            className={inputClass}
            value={String(payload.op ?? 'add')}
            onChange={(e) => setField('op', e.target.value)}
          >
            {MATH_OPS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>A</span>
          <input
            className={inputClass}
            value={String(payload.a ?? '')}
            onChange={(e) => setField('a', e.target.value)}
            placeholder="10 or {{vars.price}} or cmp_xxx.value"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>B</span>
          <input
            className={inputClass}
            value={String(payload.b ?? '')}
            onChange={(e) => setField('b', e.target.value)}
            placeholder="2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Decimals (optional)</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={String(payload.decimals ?? '')}
            onChange={(e) => setField('decimals', e.target.value)}
          />
        </label>
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'string') {
    return (
      <>
        <KeyField payload={payload} onChange={onChange} />
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Operation</span>
          <select
            className={inputClass}
            value={String(payload.op ?? 'concat')}
            onChange={(e) => setField('op', e.target.value)}
          >
            {STRING_OPS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>A</span>
          <input
            className={inputClass}
            value={String(payload.a ?? '')}
            onChange={(e) => setField('a', e.target.value)}
            placeholder="Hello"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>B</span>
          <input
            className={inputClass}
            value={String(payload.b ?? '')}
            onChange={(e) => setField('b', e.target.value)}
            placeholder=" World"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>C (replace with / slice end)</span>
          <input
            className={inputClass}
            value={String(payload.c ?? '')}
            onChange={(e) => setField('c', e.target.value)}
          />
        </label>
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'formula') {
    return (
      <>
        <KeyField payload={payload} onChange={onChange} />
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Expression</span>
          <input
            className={`${inputClass} font-mono text-xs`}
            value={String(payload.expr ?? '')}
            onChange={(e) => setField('expr', e.target.value)}
            placeholder="cmp_a.value * 1.1  or  Hello {{name}}"
          />
          <span className={hintClass}>Math if expression has operators; otherwise string template.</span>
        </label>
        <ScopeField payload={payload} onChange={onChange} />
      </>
    )
  }

  if (action === 'custom') {
    return (
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Payload (JSON)</span>
        <textarea
          className={`${inputClass} min-h-20 font-mono text-xs`}
          value={JSON.stringify(payload, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value) as Record<string, unknown>)
            } catch {
              // keep typing
            }
          }}
        />
      </label>
    )
  }

  return null
}

export type EventEditorFormProps = {
  nodeId: string
  eventName: string
  description?: string
  defaultAction?: string
}

/** Full event editor shown in a center workspace tab. */
export function EventEditorForm({
  nodeId,
  eventName,
  description,
  defaultAction = 'handleClick',
}: EventEditorFormProps) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const closeCenterTab = useUIStore((s) => s.closeCenterTab)

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-gray-500">
        <p>This component is no longer on the page.</p>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          onClick={() => closeCenterTab(`event:${nodeId}:${eventName}`)}
        >
          Close tab
        </button>
      </div>
    )
  }

  const def = getEventDef(node.events, eventName)
  const enabled = def !== null
  const action = def?.action ?? defaultAction
  const payload = def?.payload ?? {}

  function setEvent(next: JsonEventDefinition | null) {
    const events = { ...node!.events }
    if (next === null) delete events[eventName]
    else events[eventName] = next
    updateNodeEvents(nodeId, events)
  }

  function updateEvent(patch: Partial<JsonEventDefinition>) {
    const current = getEventDef(node!.events, eventName) ?? {
      action: defaultAction,
      payload: {},
    }
    setEvent({ ...current, ...patch })
  }

  function ensureEnabled() {
    if (enabled) return
    const isChangeEvent = eventName === 'onChange' || eventName === 'onInput'
    setEvent({
      action: defaultAction,
      payload: {},
      preventDefault: !isChangeEvent,
      stopPropagation: false,
    })
  }

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Event</p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900">{eventName}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        <p className="mt-2 break-all text-[11px] text-gray-400">
          {node.meta?.label ?? node.type} · {nodeId}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-800">Enabled</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={enabled}
            onChange={(e) => {
              if (e.target.checked) ensureEnabled()
              else setEvent(null)
            }}
          />
        </label>

        {enabled && (
          <>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Action</span>
              <select
                className={inputClass}
                value={action}
                onChange={(e) => updateEvent({ action: e.target.value, payload: {} })}
              >
                {EVENT_ACTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <PayloadFields
              action={action}
              payload={payload}
              onChange={(next) => updateEvent({ payload: next })}
            />

            <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs text-gray-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={
                    eventName === 'onChange' || eventName === 'onInput'
                      ? def?.preventDefault === true
                      : def?.preventDefault !== false
                  }
                  onChange={(e) => updateEvent({ preventDefault: e.target.checked })}
                />
                preventDefault
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(def?.stopPropagation)}
                  onChange={(e) => updateEvent({ stopPropagation: e.target.checked })}
                />
                stopPropagation
              </label>
            </div>
          </>
        )}

        {!enabled && (
          <p className="text-sm text-gray-500">
            Turn on this event to choose an action and payload. Changes save to the component immediately.
          </p>
        )}
      </div>
    </div>
  )
}

type EventsSectionProps = {
  nodeId: string
  supportedEvents: SupportedEvent[]
}

/** Compact event list in the props panel — opens a center tab to edit. */
export function EventsSection({ nodeId, supportedEvents }: EventsSectionProps) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const selectNode = useEditorStore((s) => s.selectNode)
  const openEventTab = useUIStore((s) => s.openEventTab)
  const activeCenterTabId = useUIStore((s) => s.activeCenterTabId)

  if (!node || supportedEvents.length === 0) return null

  const componentLabel = String(node.meta?.label ?? node.type)

  function setEnabled(evt: SupportedEvent, on: boolean) {
    const next = { ...node!.events }
    if (on) {
      const isChangeEvent = evt.name === 'onChange' || evt.name === 'onInput'
      next[evt.name] = {
        action: evt.defaultAction ?? 'handleClick',
        payload: {},
        preventDefault: !isChangeEvent,
        stopPropagation: false,
      }
    } else {
      delete next[evt.name]
    }
    updateNodeEvents(nodeId, next)
  }

  return (
    <AccordionSection title="Events" defaultOpen={false}>
      <p className="mb-2 text-[11px] text-gray-500">
        Click an event to edit it in a center tab (beside Canvas).
      </p>
      <ul className="flex flex-col gap-1.5">
        {supportedEvents.map((evt) => {
          const def = getEventDef(node.events, evt.name)
          const enabled = def !== null
          const tabId = `event:${nodeId}:${evt.name}`
          const isOpen = activeCenterTabId === tabId

          return (
            <li key={evt.name}>
              <div
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                  isOpen
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    selectNode(nodeId)
                    openEventTab({
                      nodeId,
                      eventName: evt.name,
                      label: componentLabel,
                    })
                  }}
                >
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {evt.name}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {enabled ? def?.action ?? 'configured' : 'Off'} · {evt.description}
                  </span>
                </button>
                <label
                  className="flex shrink-0 items-center gap-1 text-[11px] text-gray-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(evt, e.target.checked)}
                  />
                  On
                </label>
              </div>
            </li>
          )
        })}
      </ul>
    </AccordionSection>
  )
}
