import { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'

/** Editor chrome breakpoints — separate from canvas device preview widths. */
export type EditorViewport = 'compact' | 'medium' | 'wide'

const COMPACT_MAX = 767
const MEDIUM_MAX = 1023

function resolveViewport(width: number): EditorViewport {
  if (width <= COMPACT_MAX) return 'compact'
  if (width <= MEDIUM_MAX) return 'medium'
  return 'wide'
}

export function useEditorResponsive() {
  const [viewport, setViewport] = useState<EditorViewport>(() =>
    resolveViewport(typeof window !== 'undefined' ? window.innerWidth : 1280),
  )
  const setLeftSidebarOpen = useUIStore((s) => s.setLeftSidebarOpen)
  const setRightSidebarOpen = useUIStore((s) => s.setRightSidebarOpen)

  useEffect(() => {
    function onResize() {
      const next = resolveViewport(window.innerWidth)
      setViewport(next)
      if (next === 'compact') {
        setLeftSidebarOpen(false)
        setRightSidebarOpen(false)
      } else if (next === 'medium') {
        setRightSidebarOpen(false)
        setLeftSidebarOpen(true)
      } else {
        setLeftSidebarOpen(true)
        setRightSidebarOpen(true)
      }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setLeftSidebarOpen, setRightSidebarOpen])

  return {
    viewport,
    isCompact: viewport === 'compact',
    isMedium: viewport === 'medium',
    isWide: viewport === 'wide',
  }
}
