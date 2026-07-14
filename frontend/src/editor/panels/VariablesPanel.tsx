import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  clearTemporaryVars,
  clearVar,
  getGlobalVars,
  getRuntimeVarsSnapshot,
  getTemporaryVars,
  setVar,
  subscribeRuntimeVars,
} from '../../renderer/runtimeVars'
import { useVariablesStore, type GlobalVariableDef } from '../store/variablesStore'
import {
  coerceVariableValue,
  getVariableTypeOption,
  normalizeVariableDataType,
  validateVariableValue,
  VARIABLE_TYPE_GROUP_LABELS,
  VARIABLE_TYPE_OPTIONS,
  variableTypeLabel,
  type VariableDataType,
  type VariableTypeGroup,
} from '../variables/variableTypes'
import { ModalPortal } from './ModalPortal'

const inputClass = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm'
const labelClass = 'text-xs font-medium text-gray-600'

function isValidKey(key: string) {
  return /^[a-zA-Z_][\w]*$/.test(key)
}

function formatLiveValue(raw: unknown): string {
  if (raw === undefined) return '—'
  if (raw === null) return 'null'
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw)
    } catch {
      return String(raw)
    }
  }
  return String(raw)
}

function InfoTip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
      title={text}
      aria-label={text}
    >
      i
    </span>
  )
}

type GlobalFormPayload = {
  key: string
  dataType: VariableDataType
}

type TemporaryFormPayload = {
  key: string
  value: string
  dataType: VariableDataType
}

function groupedTypeOptions() {
  const groups = new Map<VariableTypeGroup, typeof VARIABLE_TYPE_OPTIONS>()
  for (const opt of VARIABLE_TYPE_OPTIONS) {
    const list = groups.get(opt.group) ?? []
    list.push(opt)
    groups.set(opt.group, list)
  }
  return groups
}

function ValueField({
  dataType,
  value,
  onChange,
}: {
  dataType: VariableDataType
  value: string
  onChange: (next: string) => void
}) {
  const opt = getVariableTypeOption(dataType)

  if (dataType === 'boolean') {
    const checked = value === 'true' || value === '1'
    return (
      <label className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        />
        <span className="text-sm text-gray-700">Value (boolean)</span>
      </label>
    )
  }

  if (dataType === 'null') {
    return (
      <p className="mt-3 text-xs text-gray-500">
        Null type has no value — runtime stores <code className="font-mono">null</code>.
      </p>
    )
  }

  if (dataType === 'color') {
    const hex = /^#([0-9a-fA-F]{6})$/.test(value) ? value : '#000000'
    return (
      <label className="mt-3 block">
        <span className={labelClass}>Value</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className={`${inputClass} font-mono text-xs`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
          />
        </div>
      </label>
    )
  }

  if (
    dataType === 'array' ||
    dataType === 'object' ||
    dataType === 'json' ||
    dataType === 'markdown' ||
    dataType === 'richtext' ||
    dataType === 'gradient'
  ) {
    return (
      <label className="mt-3 block">
        <span className={labelClass}>Value</span>
        <textarea
          className={`${inputClass} mt-1 min-h-24 font-mono text-xs`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opt.hint}
        />
        <span className="mt-1 block text-[10px] text-gray-400">{opt.hint}</span>
      </label>
    )
  }

  const htmlType =
    dataType === 'integer' || dataType === 'number' || dataType === 'percentage'
      ? 'number'
      : dataType === 'email'
        ? 'email'
        : dataType === 'url' ||
            dataType === 'image' ||
            dataType === 'video' ||
            dataType === 'audio' ||
            dataType === 'file'
          ? 'url'
          : dataType === 'date'
            ? 'date'
            : dataType === 'time'
              ? 'time'
              : dataType === 'datetime'
                ? 'datetime-local'
                : dataType === 'password'
                  ? 'password'
                  : dataType === 'phone'
                    ? 'tel'
                    : 'text'

  const step =
    dataType === 'integer' ? 1 : dataType === 'number' || dataType === 'percentage' ? 'any' : undefined

  return (
    <label className="mt-3 block">
      <span className={labelClass}>Value</span>
      <input
        type={htmlType}
        step={step}
        className={`${inputClass} mt-1 ${dataType === 'integer' || dataType === 'number' || dataType === 'cssLength' || dataType === 'font' ? 'font-mono text-xs' : ''}`}
        placeholder={opt.emptyDefault || opt.hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="mt-1 block text-[10px] text-gray-400">{opt.hint}</span>
    </label>
  )
}

type GlobalFormModalProps = {
  open: boolean
  mode: 'add' | 'edit'
  initial?: GlobalFormPayload
  /** Read-only live runtime value shown when editing. */
  currentValue?: unknown
  existingKeys: string[]
  onClose: () => void
  onSubmit: (payload: GlobalFormPayload) => void
}

function GlobalFormModal({
  open,
  mode,
  initial,
  currentValue,
  existingKeys,
  onClose,
  onSubmit,
}: GlobalFormModalProps) {
  const [key, setKey] = useState(initial?.key ?? '')
  const [dataType, setDataType] = useState<VariableDataType>(
    normalizeVariableDataType(initial?.dataType),
  )
  const [error, setError] = useState<string | null>(null)
  const typeGroups = groupedTypeOptions()

  useEffect(() => {
    if (!open) return
    setKey(initial?.key ?? '')
    setDataType(normalizeVariableDataType(initial?.dataType))
    setError(null)
  }, [open, initial])

  function resetAndClose() {
    setError(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!isValidKey(trimmed)) {
      setError('Key must start with a letter or _ (e.g. cartTotal)')
      return
    }
    const takenByOther = existingKeys.includes(trimmed) && trimmed !== initial?.key
    if (takenByOther) {
      setError('A variable with this key already exists')
      return
    }
    onSubmit({ key: trimmed, dataType })
    resetAndClose()
  }

  return (
    <ModalPortal open={open} onClose={resetAndClose}>
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {mode === 'edit' ? 'Edit global variable' : 'Add global variable'}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Set the starting value with <code className="font-mono">setVar</code> on the page (e.g.
          root <code className="font-mono">onStart</code>).
        </p>

        <label className="mt-4 block">
          <span className={labelClass}>Key</span>
          <input
            autoFocus
            className={`${inputClass} mt-1 font-mono text-xs`}
            placeholder="cartTotal"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>

        <label className="mt-3 block">
          <span className={labelClass}>Data type</span>
          <select
            className={`${inputClass} mt-1`}
            value={dataType}
            onChange={(e) => setDataType(e.target.value as VariableDataType)}
          >
            {[...typeGroups.entries()].map(([group, opts]) => (
              <optgroup key={group} label={VARIABLE_TYPE_GROUP_LABELS[group]}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {mode === 'edit' && (
          <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
            <p className={labelClass}>Current value</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {formatLiveValue(currentValue)}
            </p>
            <p className="mt-1 text-[10px] text-gray-400">Read-only · updated by page events / binds</p>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {mode === 'edit' ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}

type TemporaryFormModalProps = {
  open: boolean
  mode: 'add' | 'edit'
  initial?: TemporaryFormPayload
  existingKeys: string[]
  onClose: () => void
  onSubmit: (payload: TemporaryFormPayload) => void
}

function TemporaryFormModal({
  open,
  mode,
  initial,
  existingKeys,
  onClose,
  onSubmit,
}: TemporaryFormModalProps) {
  const [key, setKey] = useState(initial?.key ?? '')
  const [value, setValue] = useState(initial?.value ?? '')
  const [dataType, setDataType] = useState<VariableDataType>(
    normalizeVariableDataType(initial?.dataType),
  )
  const [error, setError] = useState<string | null>(null)
  const typeGroups = groupedTypeOptions()

  useEffect(() => {
    if (!open) return
    setKey(initial?.key ?? '')
    setValue(initial?.value ?? '')
    setDataType(normalizeVariableDataType(initial?.dataType))
    setError(null)
  }, [open, initial])

  function resetAndClose() {
    setError(null)
    onClose()
  }

  function handleTypeChange(next: VariableDataType) {
    setDataType(next)
    if (mode === 'add' || value === '') {
      setValue(getVariableTypeOption(next).emptyDefault)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!isValidKey(trimmed)) {
      setError('Key must start with a letter or _ (e.g. cartTotal)')
      return
    }
    const takenByOther = existingKeys.includes(trimmed) && trimmed !== initial?.key
    if (takenByOther) {
      setError('A variable with this key already exists')
      return
    }
    const valueError = validateVariableValue(dataType, value)
    if (valueError) {
      setError(valueError)
      return
    }
    onSubmit({
      key: trimmed,
      value: dataType === 'null' ? '' : value,
      dataType,
    })
    resetAndClose()
  }

  return (
    <ModalPortal open={open} onClose={resetAndClose}>
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {mode === 'edit' ? 'Edit temporary variable' : 'Add temporary variable'}
        </h2>

        <label className="mt-4 block">
          <span className={labelClass}>Key</span>
          <input
            autoFocus
            className={`${inputClass} mt-1 font-mono text-xs`}
            placeholder="draftTotal"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>

        <label className="mt-3 block">
          <span className={labelClass}>Data type</span>
          <select
            className={`${inputClass} mt-1`}
            value={dataType}
            onChange={(e) => handleTypeChange(e.target.value as VariableDataType)}
          >
            {[...typeGroups.entries()].map(([group, opts]) => (
              <optgroup key={group} label={VARIABLE_TYPE_GROUP_LABELS[group]}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <ValueField dataType={dataType} value={value} onChange={setValue} />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {mode === 'edit' ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}

function SectionHeader({
  title,
  tip,
  onAdd,
  trailing,
}: {
  title: string
  tip: string
  onAdd: () => void
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <InfoTip text={tip} />
      {trailing}
      <button
        type="button"
        onClick={onAdd}
        className="ml-auto flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        title={`Add ${title.toLowerCase().replace(/s$/, '')}`}
        aria-label={`Add ${title}`}
      >
        +
      </button>
    </div>
  )
}

function GlobalSection() {
  const defs = useVariablesStore((s) => s.globalDefs)
  const upsert = useVariablesStore((s) => s.upsertGlobalDef)
  const remove = useVariablesStore((s) => s.removeGlobalDef)
  useSyncExternalStore(subscribeRuntimeVars, getRuntimeVarsSnapshot, getRuntimeVarsSnapshot)
  const live = getGlobalVars()

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; def?: GlobalVariableDef } | null>(
    null,
  )

  return (
    <section className="border-b border-gray-100 pb-2">
      <SectionHeader
        title="Global"
        tip="Schema only (key + type). Set starting values with setVar on the page (e.g. onStart). Bind with {{name}}."
        onAdd={() => setModal({ mode: 'add' })}
      />

      <ul className="px-2">
        {defs.length === 0 && (
          <li className="px-2 py-3 text-center text-[11px] text-gray-400">No global variables</li>
        )}
        {defs.map((def) => {
          const hasLive = Object.prototype.hasOwnProperty.call(live, def.key)
          return (
            <li
              key={def.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setModal({ mode: 'edit', def })}
                title={`Edit · ${variableTypeLabel(def.dataType)}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-xs font-medium text-gray-900">
                    {def.key}
                  </span>
                  <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500">
                    {variableTypeLabel(def.dataType)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-gray-400">
                  Current:{' '}
                  <span className="font-mono text-gray-600">
                    {hasLive ? formatLiveValue(live[def.key]) : '— (not set yet)'}
                  </span>
                </span>
              </button>
              {hasLive ? (
                <button
                  type="button"
                  onClick={() => clearVar(def.key, 'global')}
                  className="hidden rounded px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-50 group-hover:inline"
                  title="Clear live value"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => remove(def.id)}
                className="rounded px-1.5 py-0.5 text-[10px] text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100"
                title="Remove"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>

      <GlobalFormModal
        open={modal !== null}
        mode={modal?.mode ?? 'add'}
        initial={
          modal?.def
            ? { key: modal.def.key, dataType: modal.def.dataType }
            : modal?.mode === 'add'
              ? { key: '', dataType: 'string' }
              : undefined
        }
        currentValue={modal?.def ? live[modal.def.key] : undefined}
        existingKeys={defs.map((d) => d.key)}
        onClose={() => setModal(null)}
        onSubmit={({ key, dataType }) => {
          if (modal?.mode === 'edit' && modal.def) {
            upsert({ id: modal.def.id, key, dataType })
          } else {
            upsert({ key, dataType })
          }
        }}
      />
    </section>
  )
}

function TemporarySection() {
  useSyncExternalStore(subscribeRuntimeVars, getRuntimeVarsSnapshot, getRuntimeVarsSnapshot)
  const activePageId = useVariablesStore((s) => s.activePageId)
  const live = getTemporaryVars()
  const entries = Object.entries(live)
  const [modal, setModal] = useState<{
    mode: 'add' | 'edit'
    key?: string
    value?: string
    dataType?: VariableDataType
  } | null>(null)

  return (
    <section className="pb-2">
      <SectionHeader
        title="Temporary"
        tip={`Only for the current page (${activePageId}). Cleared when the page changes. Bind with {{temp.name}}.`}
        onAdd={() => setModal({ mode: 'add', dataType: 'string' })}
        trailing={
          entries.length > 0 ? (
            <button
              type="button"
              onClick={() => clearTemporaryVars()}
              className="text-[10px] text-amber-700 hover:underline"
            >
              Clear
            </button>
          ) : null
        }
      />

      <ul className="px-2">
        {entries.length === 0 && (
          <li className="px-2 py-3 text-center text-[11px] text-gray-400">No temporary variables</li>
        )}
        {entries.map(([key, value]) => (
          <li
            key={key}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-amber-50/60"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() =>
                setModal({
                  mode: 'edit',
                  key,
                  value: value === null ? '' : String(value),
                  dataType:
                    typeof value === 'boolean'
                      ? 'boolean'
                      : typeof value === 'number'
                        ? 'number'
                        : 'string',
                })
              }
              title="Edit variable"
            >
              <span className="block truncate font-mono text-xs font-medium text-gray-900">
                {key}
              </span>
              <span className="block truncate text-[10px] text-gray-400">
                {formatLiveValue(value)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => clearVar(key, 'temporary')}
              className="rounded px-1.5 py-0.5 text-[10px] text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100"
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <TemporaryFormModal
        open={modal !== null}
        mode={modal?.mode ?? 'add'}
        initial={
          modal?.mode === 'edit' && modal.key !== undefined
            ? {
                key: modal.key,
                value: modal.value ?? '',
                dataType: modal.dataType ?? 'string',
              }
            : modal?.mode === 'add'
              ? { key: '', value: '', dataType: 'string' }
              : undefined
        }
        existingKeys={entries.map(([k]) => k)}
        onClose={() => setModal(null)}
        onSubmit={({ key, value, dataType }) => {
          if (modal?.mode === 'edit' && modal.key && modal.key !== key) {
            clearVar(modal.key, 'temporary')
          }
          setVar(key, coerceVariableValue(dataType, value), 'temporary')
        }}
      />
    </section>
  )
}

export function VariablesPanel() {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <GlobalSection />
      <TemporarySection />
    </div>
  )
}
