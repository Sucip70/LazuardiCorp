import type { SupportedEvent } from '../../../component-library/types/catalog'
import type { JsonEventDefinition } from '../../../renderer/types'
import { useEditorStore } from '../../store/editorStore'
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

type EventsSectionProps = {
  nodeId: string
  supportedEvents: SupportedEvent[]
}

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
              placeholder="hello / 42 / {{vars.other}} / @other"
            />
          </label>
        )}
        {fromEvent && (
          <span className={hintClass}>
            On change/click, stores the input&apos;s current value into the variable.
            Tip: prefer &quot;Bind to variable&quot; on the Input props for calculators.
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
            placeholder="{{price}} * {{qty}} + 10"
          />
          <span className={hintClass}>If set, overrides op / a / b below.</span>
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
            placeholder="10 or {{vars.price}} or @price"
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
            placeholder="{{price}} * 1.1  or  Hello {{name}}"
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

export function EventsSection({ nodeId, supportedEvents }: EventsSectionProps) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)

  if (!node || supportedEvents.length === 0) return null

  function setEvent(eventName: string, def: JsonEventDefinition | null) {
    const next = { ...node!.events }
    if (def === null) delete next[eventName]
    else next[eventName] = def
    updateNodeEvents(nodeId, next)
  }

  function updateEvent(eventName: string, patch: Partial<JsonEventDefinition>) {
    const current = getEventDef(node.events, eventName) ?? {}
    setEvent(eventName, { ...current, ...patch })
  }

  return (
    <AccordionSection title="Events" defaultOpen={false}>
      <p className="text-[11px] text-gray-500">
        In preview, bind text with {'{{vars.name}}'}, {'{{global.name}}'}, or {'{{temp.name}}'}.
        Form inputs can use Behavior → &quot;Bind to variable&quot;, or Value (bound) like {'{{result}}'}.
        Manage definitions in the Variables left panel.
      </p>
      {supportedEvents.map((evt) => {
        const def = getEventDef(node.events, evt.name)
        const enabled = def !== null
        const action = def?.action ?? evt.defaultAction ?? 'handleClick'
        const payload = def?.payload ?? {}

        return (
          <div key={evt.name} className="rounded-md border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{evt.name}</p>
                <p className="text-xs text-gray-500">{evt.description}</p>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEvent(evt.name, {
                        action: evt.defaultAction ?? 'handleClick',
                        payload: {},
                        preventDefault: true,
                        stopPropagation: false,
                      })
                    } else {
                      setEvent(evt.name, null)
                    }
                  }}
                />
                On
              </label>
            </div>

            {enabled && (
              <div className="mt-3 flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Action</span>
                  <select
                    className={inputClass}
                    value={action}
                    onChange={(e) => updateEvent(evt.name, { action: e.target.value, payload: {} })}
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
                  onChange={(next) => updateEvent(evt.name, { payload: next })}
                />

                <div className="flex gap-4 text-xs text-gray-600">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={def?.preventDefault !== false}
                      onChange={(e) => updateEvent(evt.name, { preventDefault: e.target.checked })}
                    />
                    preventDefault
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(def?.stopPropagation)}
                      onChange={(e) => updateEvent(evt.name, { stopPropagation: e.target.checked })}
                    />
                    stopPropagation
                  </label>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </AccordionSection>
  )
}
