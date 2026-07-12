import { useEffect, useRef, useState } from 'react'
import type { ComponentNode } from '../../types/editor'
import { canAcceptChildren } from '../utils/canvasUtils'
import { useEditorStore } from '../store/editorStore'
import { useAddChildComponent } from '../hooks/useAddChildComponent'
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

function getSiblingIds(
  node: ComponentNode,
  nodes: Record<string, ComponentNode>,
  rootIds: string[],
): string[] {
  if (node.parentId === null) return rootIds
  return nodes[node.parentId]?.children ?? []
}

type LayerRowProps = {
  node: ComponentNode
  nodes: Record<string, ComponentNode>
  rootIds: string[]
  depth: number
  openMenuId: string | null
  renamingId: string | null
  collapsedIds: Set<string>
  onToggleCollapse: (id: string) => void
  onOpenMenu: (id: string | null) => void
  onStartRename: (id: string) => void
  onStopRename: () => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

function LayerRow({
  node,
  nodes,
  rootIds,
  depth,
  openMenuId,
  renamingId,
  collapsedIds,
  onToggleCollapse,
  onOpenMenu,
  onStartRename,
  onStopRename,
  onAddChild,
  onDelete,
}: LayerRowProps) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const updateNodeMeta = useEditorStore((s) => s.updateNodeMeta)
  const reorderNode = useEditorStore((s) => s.reorderNode)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSelected = selectedId === node.id
  const isRoot = node.parentId === null
  const isRenaming = renamingId === node.id
  const isMenuOpen = openMenuId === node.id
  const acceptsChildren = canAcceptChildren(node.type)
  const displayLabel = node.meta?.label ?? node.type
  const locked = Boolean(node.meta?.locked)
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedIds.has(node.id)

  const siblings = getSiblingIds(node, nodes, rootIds)
  const index = siblings.indexOf(node.id)
  const canMoveUp = !locked && index > 0
  const canMoveDown = !locked && index >= 0 && index < siblings.length - 1
  const canReorder = canMoveUp || canMoveDown

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
        className={`group flex items-center gap-0.5 rounded-md pr-1 ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            title={isCollapsed ? 'Expand' : 'Collapse'}
            aria-label={isCollapsed ? `Expand ${displayLabel}` : `Collapse ${displayLabel}`}
            aria-expanded={!isCollapsed}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(node.id)
            }}
            className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="inline-block h-6 w-5 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => selectNode(node.id)}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm ${
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
          {locked && <span className="shrink-0 text-xs">🔒</span>}
          {hasChildren && isCollapsed && (
            <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] text-gray-400">
              {node.children.length}
            </span>
          )}
        </button>

        {canReorder && (
          <div className="flex shrink-0 flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              title="Move up"
              aria-label={`Move ${displayLabel} up`}
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation()
                reorderNode(node.id, 'up')
              }}
              className="rounded px-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              title="Move down"
              aria-label={`Move ${displayLabel} down`}
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation()
                reorderNode(node.id, 'down')
              }}
              className="rounded px-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

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
              {hasChildren && (
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onOpenMenu(null)
                    onToggleCollapse(node.id)
                  }}
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </button>
              )}
              {canMoveUp && (
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onOpenMenu(null)
                    reorderNode(node.id, 'up')
                  }}
                >
                  Move up
                </button>
              )}
              {canMoveDown && (
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onOpenMenu(null)
                    reorderNode(node.id, 'down')
                  }}
                >
                  Move down
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

      {!isCollapsed &&
        node.children.map((childId) => {
          const child = nodes[childId]
          if (!child) return null
          return (
            <LayerRow
              key={childId}
              node={child}
              nodes={nodes}
              rootIds={rootIds}
              depth={depth + 1}
              openMenuId={openMenuId}
              renamingId={renamingId}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
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
  const addChildComponent = useAddChildComponent()
  const deleteNode = useEditorStore((s) => s.deleteNode)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())

  const addChildParent = addChildParentId ? nodes[addChildParentId] : null
  const deleteTarget = deleteTargetId ? nodes[deleteTargetId] : null

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-auto p-2">
        <p className="mb-2 px-2 text-xs text-gray-500">
          Document tree — chevron to collapse, arrows to reorder
        </p>
        {rootIds.map((rootId) => {
          const node = nodes[rootId]
          if (!node) return null
          return (
            <LayerRow
              key={rootId}
              node={node}
              nodes={nodes}
              rootIds={rootIds}
              depth={0}
              openMenuId={openMenuId}
              renamingId={renamingId}
              collapsedIds={collapsedIds}
              onToggleCollapse={toggleCollapse}
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
          addChildComponent(type, parentId)
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
