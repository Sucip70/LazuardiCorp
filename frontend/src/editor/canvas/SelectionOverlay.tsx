import { useCallback, useLayoutEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

type SelectionOverlayProps = {
  nodeId: string
}

type Box = { top: number; left: number; width: number; height: number }

/** Find the painted component box (skip display:contents wrappers). */
function findMeasureTarget(parent: HTMLElement, nodeId: string): HTMLElement | null {
  const marker = parent.querySelector(`[data-component-id="${nodeId}"]`) as HTMLElement | null
  if (!marker) return null

  const style = window.getComputedStyle(marker)
  if (style.display !== 'contents' && marker.getClientRects().length > 0) {
    return marker
  }

  const child = marker.firstElementChild as HTMLElement | null
  if (child) return child

  // display:contents promotes children into parent — measure first element child of parent that isn't the overlay
  for (const el of Array.from(parent.children) as HTMLElement[]) {
    if (el.dataset.selectionOverlay === 'true') continue
    if (el === marker) continue
    if (window.getComputedStyle(el).display === 'contents') continue
    return el
  }
  return null
}

function measureRelativeBox(parent: HTMLElement, target: HTMLElement): Box {
  const parentRect = parent.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const scaleX = parent.offsetWidth ? parentRect.width / parent.offsetWidth : 1
  const scaleY = parent.offsetHeight ? parentRect.height / parent.offsetHeight : 1

  return {
    top: (targetRect.top - parentRect.top) / (scaleY || 1),
    left: (targetRect.left - parentRect.left) / (scaleX || 1),
    width: targetRect.width / (scaleX || 1),
    height: targetRect.height / (scaleY || 1),
  }
}

export function SelectionOverlay({ nodeId }: SelectionOverlayProps) {
  const resizeNode = useEditorStore((s) => s.resizeNode)
  const nodeStyles = useEditorStore((s) => s.nodes[nodeId]?.styles)
  const overlayRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLElement | null>(null)

  const syncOverlayToTarget = useCallback(() => {
    const overlay = overlayRef.current
    const parent = overlay?.parentElement
    if (!overlay || !parent) return

    const target = findMeasureTarget(parent, nodeId)
    targetRef.current = target
    if (!target) {
      overlay.style.top = '0'
      overlay.style.left = '0'
      overlay.style.width = '100%'
      overlay.style.height = '100%'
      return
    }

    const box = measureRelativeBox(parent, target)
    overlay.style.top = `${box.top}px`
    overlay.style.left = `${box.left}px`
    overlay.style.width = `${Math.max(box.width, 1)}px`
    overlay.style.height = `${Math.max(box.height, 1)}px`
  }, [nodeId])

  useLayoutEffect(() => {
    syncOverlayToTarget()

    const parent = overlayRef.current?.parentElement
    if (!parent) return

    const ro = new ResizeObserver(() => syncOverlayToTarget())
    ro.observe(parent)
    const target = findMeasureTarget(parent, nodeId)
    if (target) ro.observe(target)

    window.addEventListener('resize', syncOverlayToTarget)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncOverlayToTarget)
    }
  }, [nodeId, nodeStyles, syncOverlayToTarget])

  function startResize(handle: string) {
    return (event: React.MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()

      const parent = overlayRef.current?.parentElement
      const target = targetRef.current ?? (parent ? findMeasureTarget(parent, nodeId) : null)
      if (!parent || !target) return

      const startX = event.clientX
      const startY = event.clientY
      const startBox = measureRelativeBox(parent, target)
      const startWidth = startBox.width
      const startHeight = startBox.height

      // Zoom compensation: mouse delta is in screen px; width/height styles are layout px
      const parentRect = parent.getBoundingClientRect()
      const scaleX = parent.offsetWidth ? parentRect.width / parent.offsetWidth : 1
      const scaleY = parent.offsetHeight ? parentRect.height / parent.offsetHeight : 1

      function onMove(moveEvent: MouseEvent) {
        const dx = (moveEvent.clientX - startX) / (scaleX || 1)
        const dy = (moveEvent.clientY - startY) / (scaleY || 1)
        const width = handle.includes('e') ? startWidth + dx : startWidth
        const height = handle.includes('s') ? startHeight + dy : startHeight
        resizeNode(nodeId, Math.max(48, width), Math.max(32, height))
        // Sync on next frame after store paints new size
        requestAnimationFrame(syncOverlayToTarget)
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        syncOverlayToTarget()
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  return (
    <div
      ref={overlayRef}
      data-selection-overlay="true"
      className="pointer-events-none absolute z-20"
      style={{ top: 0, left: 0, width: '100%', height: '100%' }}
    >
      {(['se', 'e', 's'] as const).map((handle) => (
        <button
          key={handle}
          type="button"
          data-resize={handle}
          onMouseDown={startResize(handle)}
          className="pointer-events-auto absolute h-3 w-3 rounded-sm border border-blue-600 bg-white shadow-sm"
          style={{
            right: handle.includes('e') ? -5 : undefined,
            bottom: handle.includes('s') ? -5 : undefined,
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
