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
  { label: 'Custom', value: 'custom' },
  { label: 'Handle click (log)', value: 'handleClick' },
] as const

const inputClass = 'rounded-md border border-gray-300 px-3 py-2 text-sm'
const labelClass = 'text-sm font-medium text-gray-700'

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
