import { useState, useSyncExternalStore } from 'react'
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
import { ModalPortal } from './ModalPortal'

const inputClass = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm'
const labelClass = 'text-xs font-medium text-gray-600'

function isValidKey(key: string) {
  return /^[a-zA-Z_][\w]*$/.test(key)
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

type AddVariableModalProps = {
  open: boolean
  kind: 'global' | 'temporary'
  existingKeys: string[]
  onClose: () => void
  onSubmit: (payload: { key: string; value: string; description: string }) => void
}

function AddVariableModal({ open, kind, existingKeys, onClose, onSubmit }: AddVariableModalProps) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  function resetAndClose() {
    setKey('')
    setValue('')
    setDescription('')
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
    if (existingKeys.includes(trimmed)) {
      setError('A variable with this key already exists')
      return
    }
    onSubmit({ key: trimmed, value, description })
    resetAndClose()
  }

  return (
    <ModalPortal open={open} onClose={resetAndClose}>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {kind === 'global' ? 'Add global variable' : 'Add temporary variable'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {kind === 'global'
            ? 'Available on every page. Defaults are saved with the project.'
            : 'Only for the current page. Cleared when you switch pages.'}
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
          <span className={labelClass}>{kind === 'global' ? 'Default value' : 'Value'}</span>
          <input
            className={`${inputClass} mt-1`}
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {kind === 'global' && (
          <label className="mt-3 block">
            <span className={labelClass}>Description</span>
            <input
              className={`${inputClass} mt-1`}
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
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
            Add
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
}: {
  title: string
  tip: string
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <InfoTip text={tip} />
      <button
        type="button"
        onClick={onAdd}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-base font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
  const [addOpen, setAddOpen] = useState(false)

  function updateDef(def: GlobalVariableDef, patch: Partial<GlobalVariableDef>) {
    upsert({
      id: def.id,
      key: patch.key ?? def.key,
      defaultValue: patch.defaultValue ?? def.defaultValue,
      description: patch.description ?? def.description,
    })
  }

  return (
    <section className="border-b border-gray-100 pb-4">
      <SectionHeader
        title="Global variables"
        tip="Shared across all pages. Bind with {{global.name}} or {{name}}. Defaults save with the project."
        onAdd={() => setAddOpen(true)}
      />

      <ul className="mt-3 space-y-2 px-3">
        {defs.length === 0 && (
          <li className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
            No global variables yet
          </li>
        )}
        {defs.map((def) => (
          <li key={def.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <label className="min-w-0 flex-1">
                <span className={labelClass}>Key</span>
                <input
                  className={`${inputClass} mt-0.5 font-mono text-xs`}
                  value={def.key}
                  onChange={(e) => updateDef(def, { key: e.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() => remove(def.id)}
                className="mt-5 shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
            <label className="mt-2 block">
              <span className={labelClass}>Default value</span>
              <input
                className={`${inputClass} mt-0.5`}
                value={def.defaultValue}
                onChange={(e) => updateDef(def, { defaultValue: e.target.value })}
              />
            </label>
            <label className="mt-2 block">
              <span className={labelClass}>Description</span>
              <input
                className={`${inputClass} mt-0.5`}
                value={def.description}
                onChange={(e) => updateDef(def, { description: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <p className="mt-2 truncate text-[11px] text-gray-400">
              Live: <span className="font-mono text-gray-600">{String(live[def.key] ?? '—')}</span>
            </p>
            <button
              type="button"
              className="mt-1 text-[11px] text-blue-600 hover:underline"
              onClick={() => setVar(def.key, def.defaultValue, 'global')}
            >
              Reset live to default
            </button>
          </li>
        ))}
      </ul>

      <AddVariableModal
        open={addOpen}
        kind="global"
        existingKeys={defs.map((d) => d.key)}
        onClose={() => setAddOpen(false)}
        onSubmit={({ key, value, description }) => {
          upsert({ key, defaultValue: value, description })
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
  const [addOpen, setAddOpen] = useState(false)

  return (
    <section className="pb-4">
      <SectionHeader
        title="Temporary variables"
        tip={`Only for the current page (${activePageId}). Cleared when the page changes. Bind with {{temp.name}}.`}
        onAdd={() => setAddOpen(true)}
      />

      <div className="mt-1 flex justify-end px-3">
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => clearTemporaryVars()}
            className="text-[11px] text-amber-800 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <ul className="mt-2 space-y-2 px-3">
        {entries.length === 0 && (
          <li className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
            No temporary variables on this page
          </li>
        )}
        {entries.map(([key, value]) => (
          <li key={key} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium text-gray-800">{key}</span>
              <button
                type="button"
                onClick={() => clearVar(key, 'temporary')}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              className={`${inputClass} mt-2`}
              value={String(value ?? '')}
              onChange={(e) => setVar(key, e.target.value, 'temporary')}
            />
          </li>
        ))}
      </ul>

      <AddVariableModal
        open={addOpen}
        kind="temporary"
        existingKeys={entries.map(([key]) => key)}
        onClose={() => setAddOpen(false)}
        onSubmit={({ key, value }) => {
          setVar(key, value, 'temporary')
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
