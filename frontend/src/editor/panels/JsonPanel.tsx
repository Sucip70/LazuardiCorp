import ReactJson from 'react-json-view'
import { useEditorStore } from '../store/editorStore'

export function JsonPanel() {
  const document = useEditorStore((s) => s.getDocument())
  const selectedId = useEditorStore((s) => s.selectedId)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const zoom = useEditorStore((s) => s.zoom)

  const payload = {
    viewport: { breakpoint, zoom },
    selectedId,
    ...document,
  }

  return (
    <div className="h-full overflow-auto p-3">
      <ReactJson
        src={payload}
        name="page"
        collapsed={2}
        displayDataTypes={false}
        enableClipboard
        theme="rjv-default"
        style={{ fontSize: '12px', background: 'transparent' }}
      />
    </div>
  )
}
