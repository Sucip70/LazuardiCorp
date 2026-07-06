import { getCatalogEntry } from '../../component-library/catalog'
import type { EditorField } from '../../component-library/types/catalog'
import { useEditorStore } from '../store/editorStore'
import { AccordionSection } from './fields/AccordionSection'
import { CatalogFieldRenderer } from './fields/CatalogFieldRenderer'
import { EventsSection } from './fields/EventsSection'
import { StyleSection } from './fields/StyleSection'

const GROUP_ORDER = ['content', 'layout', 'style', 'behavior', 'accessibility'] as const
const GROUP_LABELS: Record<(typeof GROUP_ORDER)[number], string> = {
  content: 'Content',
  layout: 'Layout',
  style: 'Style',
  behavior: 'Behavior',
  accessibility: 'Accessibility',
}

const TEXT_FALLBACK_FIELDS: EditorField[] = [
  {
    key: 'content',
    label: 'Content',
    type: 'textarea',
    group: 'content',
    required: true,
  },
  {
    key: 'as',
    label: 'HTML tag',
    type: 'select',
    group: 'content',
    options: [
      { label: 'Paragraph', value: 'p' },
      { label: 'Span', value: 'span' },
      { label: 'H1', value: 'h1' },
      { label: 'H2', value: 'h2' },
      { label: 'H3', value: 'h3' },
      { label: 'H4', value: 'h4' },
      { label: 'Label', value: 'label' },
    ],
  },
]

const DEFAULT_OPEN_GROUPS = new Set(['content'])

function groupFields(fields: EditorField[]): Map<(typeof GROUP_ORDER)[number], EditorField[]> {
  const map = new Map<(typeof GROUP_ORDER)[number], EditorField[]>()
  for (const field of fields) {
    if (field.type === 'className') continue
    const group = field.group ?? 'content'
    if (!GROUP_ORDER.includes(group as (typeof GROUP_ORDER)[number])) continue
    const list = map.get(group as (typeof GROUP_ORDER)[number]) ?? []
    list.push(field)
    map.set(group as (typeof GROUP_ORDER)[number], list)
  }
  return map
}

export function PropsPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  const node = useEditorStore((s) => (selectedId ? s.nodes[selectedId] : null))
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const updateNodeMeta = useEditorStore((s) => s.updateNodeMeta)
  const deleteNode = useEditorStore((s) => s.deleteNode)

  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Select a component to edit its properties.
      </div>
    )
  }

  const catalog = getCatalogEntry(node.type)
  const fields = catalog?.editableFields ?? (node.type === 'Text' ? TEXT_FALLBACK_FIELDS : [])
  const grouped = groupFields(fields)

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Component</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">
            {node.meta?.label ?? catalog?.label ?? node.type}
          </p>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            {node.type}
          </span>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            {breakpoint}
          </span>
        </div>
        {catalog?.description && (
          <p className="mt-1 text-xs text-gray-500">{catalog.description}</p>
        )}
        <p className="mt-1 break-all text-[10px] text-gray-400">{node.id}</p>
      </div>

      <AccordionSection title="Meta" defaultOpen>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Display label</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={node.meta?.label ?? ''}
            onChange={(e) => updateNodeMeta(node.id, { label: e.target.value })}
          />
        </label>
      </AccordionSection>

      {GROUP_ORDER.map((group) => {
        const groupFields = grouped.get(group)
        if (!groupFields?.length) return null
        return (
          <AccordionSection
            key={group}
            title={GROUP_LABELS[group]}
            defaultOpen={DEFAULT_OPEN_GROUPS.has(group)}
          >
            {groupFields.map((field) => (
              <CatalogFieldRenderer
                key={field.key}
                node={node}
                field={field}
                breakpoint={breakpoint}
              />
            ))}
            {group === 'accessibility' && catalog?.a11yNotes?.length ? (
              <ul className="list-inside list-disc text-xs text-gray-500">
                {catalog.a11yNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </AccordionSection>
        )
      })}

      {fields.length === 0 && !catalog && (
        <div className="px-4 py-3 text-sm text-gray-500">
          No editable fields defined for &quot;{node.type}&quot;.
        </div>
      )}

      <StyleSection nodeId={node.id} breakpoint={breakpoint} />

      {catalog?.supportedEvents?.length ? (
        <EventsSection nodeId={node.id} supportedEvents={catalog.supportedEvents} />
      ) : null}

      {node.parentId !== null && (
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={() => deleteNode(node.id)}
            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete component
          </button>
        </div>
      )}
    </div>
  )
}
