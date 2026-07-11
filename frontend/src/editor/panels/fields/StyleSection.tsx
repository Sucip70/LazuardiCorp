import type { Breakpoint } from '../../../types/editor'
import { useEditorStore } from '../../store/editorStore'
import { AccordionSection } from './AccordionSection'
import {
  appendTailwindClasses,
  CSS_FIELDS,
  getBreakpointClassName,
  getBreakpointCss,
  TAILWIND_PRESETS,
} from './styleFieldUtils'

type StyleSectionProps = {
  nodeId: string
  breakpoint: Breakpoint
}

const inputClass = 'rounded-md border border-gray-300 px-3 py-2 text-sm'
const labelClass = 'text-sm font-medium text-gray-700'

type CssFieldDef = {
  key: string
  label: string
  type: 'text' | 'color' | 'select'
  placeholder?: string
  options?: string[]
}

function CssField({
  field,
  value,
  onChange,
}: {
  field: CssFieldDef
  value: string
  onChange: (key: string, val: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{field.label}</span>
      {field.type === 'select' ? (
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-gray-300 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[5px] [&::-moz-color-swatch]:border-none"
            value={value.startsWith('#') ? value : '#000000'}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      ) : (
        <input
          className={inputClass}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
    </label>
  )
}

function CssGroup({
  title,
  fields,
  css,
  onPatch,
}: {
  title: string
  fields: CssFieldDef[]
  css: Record<string, string>
  onPatch: (patch: Record<string, string | undefined>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === 'color' ? 'col-span-2' : undefined}
          >
            <CssField
              field={field}
              value={css[field.key] ?? ''}
              onChange={(key, val) => onPatch({ [key]: val || undefined })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StyleSection({ nodeId, breakpoint }: StyleSectionProps) {
  const node = useEditorStore((s) => s.nodes[nodeId])
  const updateNodeStyleCss = useEditorStore((s) => s.updateNodeStyleCss)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)

  if (!node) return null

  const css = getBreakpointCss(node.styles, breakpoint)
  const className = getBreakpointClassName(node.styles, breakpoint)

  function patchCss(patch: Record<string, string | undefined>) {
    updateNodeStyleCss(nodeId, patch, breakpoint)
  }

  function setClassName(value: string) {
    if (breakpoint === 'desktop') {
      updateNodeStyles(nodeId, { ...node.styles, className: value })
      return
    }
    updateNodeStyles(nodeId, {
      ...node.styles,
      breakpoints: {
        ...node.styles?.breakpoints,
        [breakpoint]: {
          ...node.styles?.breakpoints?.[breakpoint],
          className: value,
        },
      },
    })
  }

  return (
    <AccordionSection title="Visual Style" defaultOpen badge={breakpoint}>
      <CssGroup title="Typography" fields={CSS_FIELDS.typography} css={css} onPatch={patchCss} />
      <CssGroup title="Spacing" fields={CSS_FIELDS.spacing} css={css} onPatch={patchCss} />
      <CssGroup title="Layout" fields={CSS_FIELDS.layout} css={css} onPatch={patchCss} />
      <CssGroup title="Background & Border" fields={CSS_FIELDS.background} css={css} onPatch={patchCss} />
      <CssGroup title="Flex" fields={CSS_FIELDS.flex} css={css} onPatch={patchCss} />

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tailwind classes</p>
        <textarea
          className={`${inputClass} min-h-20 font-mono text-xs`}
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {TAILWIND_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100"
              onClick={() => setClassName(appendTailwindClasses(className, preset.classes))}
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>
    </AccordionSection>
  )
}
