import { TEMPLATE_CATEGORY_LABELS } from '../../api/templates'

type TemplateCategoryFilterProps = {
  categories: string[]
  active: string | null
  onChange: (category: string | null) => void
}

export function TemplateCategoryFilter({ categories, active, onChange }: TemplateCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          active === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            active === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {TEMPLATE_CATEGORY_LABELS[cat] ?? cat}
        </button>
      ))}
    </div>
  )
}
