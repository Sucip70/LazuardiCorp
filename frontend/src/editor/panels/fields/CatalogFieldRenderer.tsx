import { useState } from 'react'
import type { EditorField } from '../../../component-library/types/catalog'
import type { Breakpoint, ComponentNode } from '../../../types/editor'
import { useEditorStore } from '../../store/editorStore'
import { getPropValue } from './styleFieldUtils'

type CatalogFieldRendererProps = {
  node: ComponentNode
  field: EditorField
  breakpoint: Breakpoint
}

const inputClass = 'rounded-md border border-gray-300 px-3 py-2 text-sm'
const labelClass = 'text-sm font-medium text-gray-700'

export function CatalogFieldRenderer({ node, field, breakpoint }: CatalogFieldRendererProps) {
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const propKey = field.key === 'content' && node.type === 'Text' ? 'content' : field.key
  const rawValue = getPropValue(node, propKey)

  function setProp(value: unknown) {
    if (propKey === 'content' && node.type === 'Text') {
      updateNodeProps(node.id, { content: value })
      return
    }
    updateNodeProps(node.id, { [field.key]: value })
  }

  function setClassName(value: string) {
    if (field.responsive && breakpoint !== 'desktop') {
      updateNodeStyles(node.id, {
        ...node.styles,
        breakpoints: {
          ...node.styles?.breakpoints,
          [breakpoint]: {
            ...node.styles?.breakpoints?.[breakpoint],
            className: value,
          },
        },
      })
      return
    }
    updateNodeStyles(node.id, { ...node.styles, className: value })
  }

  const classNameValue =
    field.type === 'className'
      ? field.responsive && breakpoint !== 'desktop'
        ? (node.styles?.breakpoints?.[breakpoint]?.className ?? '')
        : (node.styles?.className ?? '')
      : ''

  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
        {field.responsive && (
          <span className="ml-1 text-xs font-normal text-gray-400">({breakpoint})</span>
        )}
      </span>

      {field.type === 'text' && (
        <input
          className={inputClass}
          value={String(rawValue ?? '')}
          onChange={(e) => setProp(e.target.value)}
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          className={`${inputClass} min-h-20`}
          value={String(rawValue ?? '')}
          onChange={(e) => setProp(e.target.value)}
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          className={inputClass}
          value={rawValue === undefined || rawValue === null ? '' : Number(rawValue)}
          onChange={(e) => setProp(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      )}

      {field.type === 'boolean' && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(rawValue)}
            onChange={(e) => setProp(e.target.checked)}
          />
          Enabled
        </label>
      )}

      {field.type === 'select' && (
        <select
          className={inputClass}
          value={String(rawValue ?? '')}
          onChange={(e) => setProp(e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'color' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-gray-300 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[5px] [&::-moz-color-swatch]:border-none"
            value={String(rawValue ?? '#000000').startsWith('#') ? String(rawValue) : '#000000'}
            onChange={(e) => setProp(e.target.value)}
          />
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={String(rawValue ?? '')}
            onChange={(e) => setProp(e.target.value)}
          />
        </div>
      )}

      {field.type === 'className' && (
        <textarea
          className={`${inputClass} min-h-16 font-mono text-xs`}
          value={classNameValue}
          onChange={(e) => setClassName(e.target.value)}
        />
      )}

      {field.type === 'json' && (
        <>
          <textarea
            className={`${inputClass} min-h-24 font-mono text-xs`}
            value={JSON.stringify(rawValue ?? [], null, 2)}
            onChange={(e) => {
              try {
                setProp(JSON.parse(e.target.value))
                setJsonError(null)
              } catch {
                setJsonError('Invalid JSON')
              }
            }}
          />
          {jsonError && <span className="text-xs text-red-600">{jsonError}</span>}
        </>
      )}

      {field.helpText && <span className="text-xs text-gray-500">{field.helpText}</span>}
    </label>
  )
}
