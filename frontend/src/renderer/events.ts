import type { ActionContext, ActionHandler, JsonEventDefinition } from './types'

const DOM_EVENT_MAP: Record<string, string> = {
  onClick: 'onClick',
  onChange: 'onChange',
  onSubmit: 'onSubmit',
  onFocus: 'onFocus',
  onBlur: 'onBlur',
  onMouseEnter: 'onMouseEnter',
  onMouseLeave: 'onMouseLeave',
}

function resolveActionHandler(
  definition: JsonEventDefinition | string,
  actionHandlers: Record<string, ActionHandler>,
): ActionHandler | null {
  if (typeof definition === 'string') {
    return actionHandlers[definition] ?? null
  }

  const key = definition.actionId ?? definition.action
  if (!key) return null
  return actionHandlers[key] ?? null
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
    const handler = resolveActionHandler(definition, actionHandlers)
    if (!handler) continue

    const config = typeof definition === 'string' ? {} : definition

    handlers[reactEvent] = (nativeEvent: unknown) => {
      const event = nativeEvent as { preventDefault?: () => void; stopPropagation?: () => void }
      if (config.preventDefault !== false && typeof event?.preventDefault === 'function') {
        event.preventDefault()
      }
      if (config.stopPropagation && typeof event?.stopPropagation === 'function') {
        event.stopPropagation()
      }

      const context: ActionContext = { nodeId, type, event: eventName }
      handler(config.payload, context)
    }
  }

  return handlers
}

export const defaultActionHandlers: Record<string, ActionHandler> = {
  navigate: (payload) => {
    const href = payload?.href
    if (typeof href === 'string') window.location.assign(href)
  },
  openUrl: (payload) => {
    const href = payload?.href
    const target = typeof payload?.target === 'string' ? payload.target : '_blank'
    if (typeof href === 'string') window.open(href, target)
  },
  scrollTo: (payload) => {
    const elementId = payload?.elementId
    if (typeof elementId !== 'string') return
    document.getElementById(elementId)?.scrollIntoView({
      behavior: payload?.behavior === 'smooth' ? 'smooth' : 'auto',
    })
  },
  handleClick: () => {
    console.info('[JsonRenderer] handleClick invoked')
  },
}
