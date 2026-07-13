export { JsonRenderer, default } from './JsonRenderer'
export { JsonNodeView } from './JsonNodeView'
export { normalizeJsonInput, getDocumentNodeCount } from './normalize'
export { buildEventHandlers, defaultActionHandlers, getEventActions } from './events'
export {
  setComponentAttr,
  getComponentAttr,
  resetComponentRuntime,
  setRuntimeDocument,
} from './componentState'
export {
  rendererRegistry,
  registerBuiltInComponents,
  registerCustomComponent,
  resolveRenderer,
} from './registry'
export { heroSectionExample, heroSectionWithEventsExample } from './examples'
export type {
  JsonTreeNode,
  NormalizedNode,
  NormalizedDocument,
  JsonRendererInput,
  JsonRendererProps,
  JsonEventDefinition,
  JsonEventAction,
  ActionHandler,
  ActionContext,
  RenderComponentProps,
  RegisteredComponent,
} from './types'
