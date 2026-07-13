import { useEffect, useMemo } from 'react'
import type { Breakpoint, ComponentNode } from '../types/editor'
import { resetComponentRuntime } from './componentState'
import { defaultActionHandlers } from './events'
import { JsonNodeView } from './JsonNodeView'
import { normalizeJsonInput } from './normalize'
import type { JsonRendererProps } from './types'

export function JsonRenderer({
  input,
  breakpoint = 'desktop',
  actionHandlers,
  className,
  revision = 0,
}: JsonRendererProps) {
  const document = useMemo(() => {
    void revision
    return normalizeJsonInput(input)
  }, [input, revision])

  useEffect(() => {
    resetComponentRuntime(document.nodes as Record<string, ComponentNode>)
  }, [document])

  const handlers = useMemo(
    () => ({ ...defaultActionHandlers, ...actionHandlers }),
    [actionHandlers],
  )

  if (document.rootIds.length === 0) {
    return null
  }

  return (
    <div className={className} data-json-renderer-root>
      {document.rootIds.map((rootId) => (
        <JsonNodeView
          key={rootId}
          nodeId={rootId}
          nodes={document.nodes}
          breakpoint={breakpoint as Breakpoint}
          actionHandlers={handlers}
        />
      ))}
    </div>
  )
}

export default JsonRenderer
