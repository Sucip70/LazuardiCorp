import type { TemplateSummary } from '../../api/templates'
import { TEMPLATE_CATEGORY_LABELS } from '../../api/templates'

type TemplateCardProps = {
  template: TemplateSummary
  selected?: boolean
  onSelect: (template: TemplateSummary) => void
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const categoryLabel = TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`group flex flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
        selected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {template.preview_image ? (
          <img
            src={template.preview_image}
            alt={`${template.name} preview`}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No preview</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow">
          {categoryLabel}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          v{template.version}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold text-gray-900">{template.name}</h3>
        <p className="line-clamp-2 text-sm text-gray-500">{template.description}</p>
      </div>
    </button>
  )
}
