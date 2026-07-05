import { useEditorStore } from '../store/editorStore'
import { getCatalogEntry } from '../../component-library/catalog'

const TEXT_TAGS = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'label']

export function PropsPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  const node = useEditorStore((s) => (selectedId ? s.nodes[selectedId] : null))
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)
  const updateNodeMeta = useEditorStore((s) => s.updateNodeMeta)
  const deleteNode = useEditorStore((s) => s.deleteNode)

  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Select a component to edit its properties.
      </div>
    )
  }

  const selectedNode = node
  const def = getCatalogEntry(selectedNode.type)
  const className =
    selectedNode.styles?.breakpoints?.[breakpoint]?.className ??
    selectedNode.styles?.className ??
    ''

  function setClassName(value: string) {
    if (breakpoint === 'desktop') {
      updateNodeStyles(selectedNode.id, { ...selectedNode.styles, className: value })
      return
    }
    updateNodeStyles(selectedNode.id, {
      ...selectedNode.styles,
      breakpoints: {
        ...selectedNode.styles?.breakpoints,
        [breakpoint]: {
          ...selectedNode.styles?.breakpoints?.[breakpoint],
          className: value,
        },
      },
    })
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Component</p>
        <p className="text-sm font-medium text-gray-900">
          {selectedNode.meta?.label ?? def?.label ?? selectedNode.type} <span className="text-gray-400">({selectedNode.type})</span>
        </p>
        <p className="mt-1 break-all text-xs text-gray-400">{selectedNode.id}</p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">Display label</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          value={selectedNode.meta?.label ?? ''}
          onChange={(e) => updateNodeMeta(selectedNode.id, { label: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">
          Tailwind classes ({breakpoint})
        </span>
        <textarea
          className="min-h-20 rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
      </label>

      {selectedNode.type === 'Text' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Content</span>
            <textarea
              className="min-h-24 rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.content ?? '')}
              onChange={(e) => updateNodeProps(selectedNode.id, { content: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">HTML tag</span>
            <select
              className="rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.as ?? 'p')}
              onChange={(e) => updateNodeProps(selectedNode.id, { as: e.target.value })}
            >
              {TEXT_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {selectedNode.type === 'Button' && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Label</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={String(selectedNode.props.label ?? '')}
            onChange={(e) => updateNodeProps(selectedNode.id, { label: e.target.value })}
          />
        </label>
      )}

      {selectedNode.type === 'Image' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Image URL</span>
            <input
              className="rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.src ?? '')}
              onChange={(e) => updateNodeProps(selectedNode.id, { src: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Alt text</span>
            <input
              className="rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.alt ?? '')}
              onChange={(e) => updateNodeProps(selectedNode.id, { alt: e.target.value })}
            />
          </label>
        </>
      )}

      {selectedNode.type === 'Link' && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Href</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={String(selectedNode.props.href ?? '')}
            onChange={(e) => updateNodeProps(selectedNode.id, { href: e.target.value })}
          />
        </label>
      )}

      {selectedNode.type === 'Input' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Name</span>
            <input
              className="rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.name ?? '')}
              onChange={(e) => updateNodeProps(selectedNode.id, { name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Placeholder</span>
            <input
              className="rounded-md border border-gray-300 px-3 py-2"
              value={String(selectedNode.props.placeholder ?? '')}
              onChange={(e) => updateNodeProps(selectedNode.id, { placeholder: e.target.value })}
            />
          </label>
        </>
      )}

      {selectedNode.parentId !== null && (
        <button
          type="button"
          onClick={() => deleteNode(selectedNode.id)}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Delete component
        </button>
      )}
    </div>
  )
}
