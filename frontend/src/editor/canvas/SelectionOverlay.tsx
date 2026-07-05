import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

type SelectionOverlayProps = {
  nodeId: string
}

export function SelectionOverlay({ nodeId }: SelectionOverlayProps) {
  const resizeNode = useEditorStore((s) => s.resizeNode)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const handle = (event.target as HTMLElement).dataset.resize
      if (!handle) return
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  function startResize(handle: string) {
    return (event: React.MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()

      const host = overlayRef.current?.parentElement
      if (!host) return

      const startX = event.clientX
      const startY = event.clientY
      const rect = host.getBoundingClientRect()
      const startWidth = rect.width
      const startHeight = rect.height

      function onMove(moveEvent: MouseEvent) {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        const width = handle.includes('e') ? startWidth + dx : startWidth - dx
        const height = handle.includes('s') ? startHeight + dy : startHeight - dy
        resizeNode(nodeId, Math.max(48, width), Math.max(32, height))
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0">
      {(['se', 'e', 's'] as const).map((handle) => (
        <button
          key={handle}
          type="button"
          data-resize={handle}
          onMouseDown={startResize(handle)}
          className="pointer-events-auto absolute h-3 w-3 rounded-sm border border-blue-600 bg-white"
          style={{
            right: handle.includes('e') ? -6 : undefined,
            bottom: handle.includes('s') ? -6 : undefined,
            top: handle === 'e' ? '50%' : undefined,
            left: handle === 's' ? '50%' : undefined,
            transform:
              handle === 'e'
                ? 'translateY(-50%)'
                : handle === 's'
                  ? 'translateX(-50%)'
                  : undefined,
            cursor:
              handle === 'se'
                ? 'nwse-resize'
                : handle === 'e'
                  ? 'ew-resize'
                  : 'ns-resize',
          }}
        />
      ))}
    </div>
  )
}
