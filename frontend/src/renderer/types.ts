import type { CSSProperties, ComponentType as ReactComponentType, ReactNode } from 'react'
import type { Breakpoint, StyleSet } from '../types/editor'

/** Nested JSON tree node (authoring / API friendly format). */
export type JsonTreeNode = {
  id?: string
  type: string
  props?: Record<string, unknown>
  attributes?: Record<string, string | number | boolean>
  styles?: StyleSet
  events?: Record<string, JsonEventDefinition>
  children?: JsonTreeNode[]
  meta?: Record<string, unknown>
}

/** Flat normalized node (runtime / large-page format). */
export type NormalizedNode = {
  id: string
  type: string
  parentId: string | null
  children: string[]
  props: Record<string, unknown>
  attributes: Record<string, string | number | boolean>
  styles: StyleSet
  events: Record<string, JsonEventDefinition>
}

export type NormalizedDocument = {
  rootIds: string[]
  nodes: Record<string, NormalizedNode>
}

export type JsonEventDefinition = {
  action?: string
  payload?: Record<string, unknown>
  actionId?: string
  preventDefault?: boolean
  stopPropagation?: boolean
}

/** Action handler registry keyed by action name or actionId. */
export type ActionHandler = (payload?: Record<string, unknown>, context?: ActionContext) => void

export type ActionContext = {
  nodeId: string
  type: string
  event: string
}

export type JsonRendererInput =
  | JsonTreeNode
  | JsonTreeNode[]
  | NormalizedDocument
  | {
      rootIds: string[]
      nodes: Record<string, Omit<NormalizedNode, 'parentId' | 'children'> & {
        parentId?: string | null
        children?: string[] | JsonTreeNode[]
      }>
    }

export type JsonRendererProps = {
  input: JsonRendererInput
  breakpoint?: Breakpoint
  actionHandlers?: Record<string, ActionHandler>
  className?: string
  /** Bump to force re-normalization when mutating input in place. */
  revision?: number
}

export type RenderComponentProps = {
  node: NormalizedNode
  children: ReactNode
  className: string
  style: CSSProperties
  attributes: Record<string, string | number | boolean>
  eventHandlers: Record<string, (...args: unknown[]) => void>
}

export type RegisteredComponent = {
  component: ReactComponentType<RenderComponentProps>
  acceptsChildren?: boolean
}
