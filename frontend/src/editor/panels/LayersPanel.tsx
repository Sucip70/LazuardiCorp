import { useEffect, useRef, useState } from 'react'
import type { ComponentNode } from '../../types/editor'
import { canAcceptChildren } from '../utils/canvasUtils'
import { useEditorStore } from '../store/editorStore'
import { LayerAddChildModal } from './LayerAddChildModal'
import { LayerDeleteConfirmModal } from './LayerDeleteConfirmModal'

function countDescendants(node: ComponentNode, nodes: Record<string, ComponentNode>): number {
  let count = 0
  for (const childId of node.children) {
    const child = nodes[childId]
    if (!child) continue
    count += 1 + countDescendants(child, nodes)
  }
  return count
}

type LayerRowProps = {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  depth: number
  openMenuId: string | null
  renamingId: string | null
  onOpenMenu: (id: string | null) => void
  onStartRename: (id: string) => void
  onStopRename: () => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

function LayerRow({
  node,
  nodes,
  depth,
  openMenuId,
  renamingId,
  onOpenMenu,
  onStartRename,
  onStopRename,
  onAddChild,
  onDelete,
}: LayerRowProps) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const updateNodeMeta = useEditorStore((s) => s.updateNodeMeta)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSelected = selectedId === node.id
  const isRoot = node.parentId === null
  const isRenaming = renamingId === node.id
  const isMenuOpen = openMenuId === node.id
  const acceptsChildren = canAcceptChildren(node.type)
  const displayLabel = node.meta?.label ?? node.type

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus()
  }, [isRenaming])

  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen, onOpenMenu])

  function commitRename(value: string) {
    const trimmed = value.trim()
    if (trimmed && trimmed !== displayLabel) {
      updateNodeMeta(node.id, { ...node.meta, label: trimmed })
    }
    onStopRename()
  }

  return (
    <>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => selectNode(node.id)}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left text-sm ${
            isSelected ? 'text-blue-700' : 'text-gray-700'
          }`}
        >
          <span className="shrink-0 font-mono text-xs text-gray-400">{node.type}</span>
          {isRenaming ? (
            <input
              ref={inputRef}
              defaultValue={displayLabel}
              className="min-w-0 flex-1 rounded border border-blue-300 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') commitRename(e.currentTarget.value)
                if (e.key === 'Escape') onStopRename()
              }}
              onBlur={(e) => commitRename(e.currentTarget.value)}
            />
          ) : (
            <span className="truncate">{displayLabel}</span>
          )}
          {node.meta?.locked && <span className="shrink-0 text-xs">🔒</span>}
        </button>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={`Actions for ${displayLabel}`}
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.stopPropagation()
              onOpenMenu(isMenuOpen ? null : node.id)
            }}
            className={`rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 ${
              isMenuOpen || isSelected
                ? 'bg-gray-200 text-gray-700 opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {acceptsChildren && (
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onOpenMenu(null)
                    onAddChild(node.id)
                  }}
                >
                  Create new
                </button>
              )}
              {!isRoot && (
                <>
                  <button
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      onOpenMenu(null)
                      onStartRename(node.id)
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      onOpenMenu(null)
                      onDelete(node.id)
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {node.children.map((childId) => {
        const child = nodes[childId]
        if (!child) return null
        return (
          <LayerRow
            key={childId}
            node={child}
            nodes={nodes}
            depth={depth + 1}
            openMenuId={openMenuId}
            renamingId={renamingId}
            onOpenMenu={onOpenMenu}
            onStartRename={onStartRename}
            onStopRename={onStopRename}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        )
      })}
    </>
  )
}

export function LayersPanel() {
  const rootIds = useEditorStore((s) => s.rootIds)
  const nodes = useEditorStore((s) => s.nodes)
  const addComponent = useEditorStore((s) => s.addComponent)
  const deleteNode = useEditorStore((s) => s.deleteNode)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const addChildParent = addChildParentId ? nodes[addChildParentId] : null
  const deleteTarget = deleteTargetId ? nodes[deleteTargetId] : null

  return (
    <>
      <div className="flex h-full flex-col overflow-auto p-2">
        <p className="mb-2 px-2 text-xs text-gray-500">Document tree — click to select</p>
        {rootIds.map((rootId) => {
          const node = nodes[rootId]
          if (!node) return null
          return (
            <LayerRow
              key={rootId}
              node={node}
              nodes={nodes}
              depth={0}
              openMenuId={openMenuId}
              renamingId={renamingId}
              onOpenMenu={setOpenMenuId}
              onStartRename={setRenamingId}
              onStopRename={() => setRenamingId(null)}
              onAddChild={setAddChildParentId}
              onDelete={setDeleteTargetId}
            />
          )
        })}
      </div>

      <LayerAddChildModal
        open={addChildParentId !== null}
        parentId={addChildParentId}
        parentLabel={addChildParent?.meta?.label ?? addChildParent?.type ?? 'component'}
        onClose={() => setAddChildParentId(null)}
        onSelect={(type, parentId) => {
          const parent = useEditorStore.getState().nodes[parentId]
          if (!parent) return
          addComponent(type, parentId, parent.children.length)
        }}
      />

      <LayerDeleteConfirmModal
        open={deleteTargetId !== null}
        nodeLabel={deleteTarget?.meta?.label ?? deleteTarget?.type ?? 'component'}
        childCount={deleteTarget ? countDescendants(deleteTarget, nodes) : 0}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) deleteNode(deleteTargetId)
        }}
      />
    </>
  )
}
