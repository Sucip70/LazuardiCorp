import { EditorDndProvider } from '../dnd/EditorDndProvider'
import { useEditorResponsive } from '../hooks/useEditorResponsive'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUIStore } from '../store/uiStore'
import { useEditorStore } from '../store/editorStore'
import { Canvas } from '../canvas/Canvas'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'

export type EditorShellProps = {
  projectId?: string
  projectName?: string
  backHref?: string
  onSave?: () => void | Promise<void>
  onPreview?: () => void
  onExport?: () => void
  onSaveAsTemplate?: () => void
}

export function EditorShell({
  projectId,
  projectName = 'Untitled Project',
  backHref = '/',
  onSave,
  onPreview,
  onExport,
  onSaveAsTemplate,
}: EditorShellProps) {
  const leftOpen = useUIStore((s) => s.leftSidebarOpen)
  const rightOpen = useUIStore((s) => s.rightSidebarOpen)
  const setLeftOpen = useUIStore((s) => s.setLeftSidebarOpen)
  const setRightOpen = useUIStore((s) => s.setRightSidebarOpen)
  const previewMode = useUIStore((s) => s.previewMode)
  const nodes = useEditorStore((s) => s.nodes)
  const { isCompact, isWide } = useEditorResponsive()

  useKeyboardShortcuts({ onSave, onPreview, onExport })

  const nodeCount = Object.keys(nodes).length

  return (
    <EditorDndProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
        <TopBar
          projectName={projectName}
          backHref={backHref}
          onSave={() => void onSave?.()}
          onPreview={onPreview}
          onExport={onExport}
          onSaveAsTemplate={onSaveAsTemplate}
        />

        <div className="relative flex min-h-0 flex-1">
          {/* Left sidebar — slide-over on compact, docked on wide */}
          {leftOpen && (
            <>
              {isCompact && (
                <button
                  type="button"
                  className="absolute inset-0 z-20 bg-black/30"
                  aria-label="Close sidebar"
                  onClick={() => setLeftOpen(false)}
                />
              )}
              <LeftSidebar
                className={`z-30 w-[260px] shrink-0 ${
                  isCompact
                    ? 'absolute left-0 top-0 h-full shadow-xl'
                    : isWide
                      ? 'relative'
                      : 'absolute left-0 top-0 h-full shadow-lg'
                }`}
              />
            </>
          )}

          {/* Canvas */}
          <main className="relative min-w-0 flex-1">
            <Canvas previewMode={previewMode} />
          </main>

          {/* Right sidebar */}
          {rightOpen && (
            <>
              {isCompact && (
                <button
                  type="button"
                  className="absolute inset-0 z-20 bg-black/30"
                  aria-label="Close properties"
                  onClick={() => setRightOpen(false)}
                />
              )}
              <RightSidebar
                className={`z-30 w-full max-w-[320px] shrink-0 ${
                  isCompact
                    ? 'absolute right-0 top-0 h-full shadow-xl'
                    : isWide
                      ? 'relative'
                      : 'absolute right-0 top-0 h-full shadow-lg'
                }`}
              />
            </>
          )}
        </div>

        <StatusBar nodeCount={nodeCount} projectId={projectId} />
      </div>
    </EditorDndProvider>
  )
}
