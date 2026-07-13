import { useEffect, useRef, useState } from 'react'
import type { SupportedEvent } from '../../../component-library/types/catalog'
import { getEventActions } from '../../../renderer/events'
import type { JsonEventDefinition } from '../../../renderer/types'
import {
  actionsToScript,
  EVENT_FUNCTION_CATALOG,
  parseScript,
  seedScriptForAction,
} from '../../events/eventScript'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'
import { AccordionSection } from './AccordionSection'

function getEventDef(
  events: Record<string, unknown> | undefined,
  eventName: string,
): JsonEventDefinition | null {
  const raw = events?.[eventName]
  if (!raw || typeof raw !== 'object') return null
  return raw as JsonEventDefinition
}

export type EventEditorFormProps = {
  nodeId: string
  eventName: string
  description?: string
  defaultAction?: string
}

/** Full event script editor shown in a center workspace tab. */
export function EventEditorForm({
  nodeId,
  eventName,
  description,
  defaultAction = 'handleClick',
}: EventEditorFormProps) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const closeCenterTab = useUIStore((s) => s.closeCenterTab)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const def = node ? getEventDef(node.events, eventName) : null
  const enabled = def !== null

  const [script, setScript] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const syncedFromRef = useRef<string>('')

  // Sync script from document when event definition changes externally
  useEffect(() => {
    if (!node) return
    const current = getEventDef(node.events, eventName)
    const fingerprint = JSON.stringify(current ?? null)
    if (fingerprint === syncedFromRef.current) return
    syncedFromRef.current = fingerprint
    if (!current) {
      setScript('')
      setParseError(null)
      return
    }
    const actions = getEventActions(current)
    setScript(actionsToScript(actions))
    setParseError(null)
  }, [node, nodeId, eventName, node?.events])

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

  function setEvent(next: JsonEventDefinition | null) {
    const events = { ...node!.events }
    if (next === null) delete events[eventName]
    else events[eventName] = next
    updateNodeEvents(nodeId, events)
  }

  function persistScript(text: string, flags?: Partial<JsonEventDefinition>) {
    const parsed = parseScript(text)
    if (!parsed.ok) {
      setParseError(
        parsed.line ? `Line ${parsed.line}: ${parsed.error}` : parsed.error,
      )
      return
    }
    setParseError(null)
    const base = getEventDef(node!.events, eventName) ?? {
      preventDefault: !(eventName === 'onChange' || eventName === 'onInput'),
      stopPropagation: false,
    }
    const next: JsonEventDefinition = {
      preventDefault: base.preventDefault,
      stopPropagation: base.stopPropagation,
      ...flags,
      actions: parsed.actions,
    }
    // Drop legacy single-action fields so actions[] is the source of truth
    delete next.action
    delete next.payload
    delete next.actionId
    syncedFromRef.current = JSON.stringify(next)
    setEvent(next)
  }

  function onScriptChange(text: string) {
    setScript(text)
    if (!enabled) return
    const parsed = parseScript(text)
    if (!parsed.ok) {
      setParseError(
        parsed.line ? `Line ${parsed.line}: ${parsed.error}` : parsed.error,
      )
      return
    }
    setParseError(null)
    persistScript(text)
  }

  function insertTemplate(template: string) {
    const el = textareaRef.current
    const chunk = template.endsWith('\n') ? template : `${template}\n`
    if (!el) {
      const next = script ? `${script.replace(/\s*$/, '')}\n${chunk}` : chunk
      setScript(next)
      if (enabled) persistScript(next)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = script.slice(0, start)
    const after = script.slice(end)
    const needsNewline = before.length > 0 && !before.endsWith('\n')
    const insertion = `${needsNewline ? '\n' : ''}${chunk}`
    const next = before + insertion + after
    setScript(next)
    if (enabled) persistScript(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = before.length + insertion.length
      el.setSelectionRange(pos, pos)
    })
  }

  function enableEvent() {
    const isChangeEvent = eventName === 'onChange' || eventName === 'onInput'
    const seed = seedScriptForAction(defaultAction)
    const parsed = parseScript(seed)
    const next: JsonEventDefinition = {
      actions: parsed.ok ? parsed.actions : [],
      preventDefault: !isChangeEvent,
      stopPropagation: false,
    }
    syncedFromRef.current = JSON.stringify(next)
    setEvent(next)
    setScript(seed)
    setParseError(null)
  }

  const isChangeEvent = eventName === 'onChange' || eventName === 'onInput'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Event</p>
          <h2 className="text-base font-semibold text-gray-900">{eventName}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          <p className="mt-1 break-all text-[11px] text-gray-400">
            {node.meta?.label ?? node.type} · {nodeId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={enabled}
              onChange={(e) => {
                if (e.target.checked) enableEvent()
                else {
                  syncedFromRef.current = 'null'
                  setEvent(null)
                  setScript('')
                  setParseError(null)
                }
              }}
            />
            Enabled
          </label>
          {enabled && (
            <>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={
                    isChangeEvent
                      ? def?.preventDefault === true
                      : def?.preventDefault !== false
                  }
                  onChange={(e) => {
                    const base = getEventDef(node.events, eventName)
                    if (!base) return
                    const next = { ...base, preventDefault: e.target.checked }
                    syncedFromRef.current = JSON.stringify(next)
                    setEvent(next)
                  }}
                />
                preventDefault
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(def?.stopPropagation)}
                  onChange={(e) => {
                    const base = getEventDef(node.events, eventName)
                    if (!base) return
                    const next = { ...base, stopPropagation: e.target.checked }
                    syncedFromRef.current = JSON.stringify(next)
                    setEvent(next)
                  }}
                />
                stopPropagation
              </label>
            </>
          )}
        </div>
      </header>

      {!enabled ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
          Turn on this event to write a multi-step script.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col border-r border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-1.5">
              <span className="text-xs font-medium text-gray-600">Script</span>
              <span className="text-[10px] text-gray-400">
                One call per line · # comments
              </span>
            </div>
            <textarea
              ref={textareaRef}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-gray-950 px-4 py-3 font-mono text-sm leading-6 text-emerald-100 outline-none placeholder:text-gray-600"
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder={'setVar("a", 1);\nnavigate("/list");'}
            />
            {parseError ? (
              <p className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {parseError}
              </p>
            ) : (
              <p className="shrink-0 border-t border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-400">
                {getEventActions(def).length} step
                {getEventActions(def).length === 1 ? '' : 's'} · saved when script is valid
              </p>
            )}
          </div>

          <aside className="flex w-72 shrink-0 flex-col bg-white">
            <div className="border-b border-gray-200 px-3 py-1.5">
              <span className="text-xs font-medium text-gray-600">Functions</span>
              <p className="text-[10px] text-gray-400">Click to insert at cursor</p>
            </div>
            <ul className="min-h-0 flex-1 overflow-auto p-2">
              {EVENT_FUNCTION_CATALOG.map((fn) => (
                <li key={fn.action}>
                  <button
                    type="button"
                    className="mb-1 w-full rounded-md border border-transparent px-2 py-1.5 text-left hover:border-gray-200 hover:bg-gray-50"
                    onClick={() => insertTemplate(fn.template)}
                  >
                    <span className="block font-mono text-xs font-semibold text-blue-700">
                      {fn.label}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-gray-500">
                      {fn.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
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
      const seed = seedScriptForAction(evt.defaultAction ?? 'handleClick')
      const parsed = parseScript(seed)
      next[evt.name] = {
        actions: parsed.ok ? parsed.actions : [],
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
        Click an event to edit its script in a center tab (beside Canvas).
      </p>
      <ul className="flex flex-col gap-1.5">
        {supportedEvents.map((evt) => {
          const def = getEventDef(node.events, evt.name)
          const enabled = def !== null
          const steps = enabled ? getEventActions(def).length : 0
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
                    {enabled
                      ? `${steps} step${steps === 1 ? '' : 's'}`
                      : 'Off'}{' '}
                    · {evt.description}
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
