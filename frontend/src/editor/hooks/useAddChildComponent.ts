import type { ComponentType } from '../../types/editor'
import { useEditorStore } from '../store/editorStore'
import { useUIStore } from '../store/uiStore'

export function useAddChildComponent() {
  const addComponent = useEditorStore((s) => s.addComponent)
  const setEditorError = useUIStore((s) => s.setEditorError)

  return (type: ComponentType, parentId: string) => {
    try {
      const parent = useEditorStore.getState().nodes[parentId]
      const result = addComponent(type, parentId, parent?.children.length ?? 0)
      if (!result.ok) {
        setEditorError(result.error)
        return null
      }
      return result.id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error while adding component'
      setEditorError(message)
      return null
    }
  }
}
