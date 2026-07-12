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

type VariableFormPayload = { key: string; value: string; description: string }

type VariableFormModalProps = {
  open: boolean
  kind: 'global' | 'temporary'
  mode: 'add' | 'edit'
  initial?: VariableFormPayload
  existingKeys: string[]
  onClose: () => void
  onSubmit: (payload: VariableFormPayload) => void
}

function VariableFormModal({
  open,
  kind,
  mode,
  initial,
  existingKeys,
  onClose,
  onSubmit,
}: VariableFormModalProps) {
  const [key, setKey] = useState(initial?.key ?? '')
  const [value, setValue] = useState(initial?.value ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKey(initial?.key ?? '')
    setValue(initial?.value ?? '')
    setDescription(initial?.description ?? '')
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
    onSubmit({ key: trimmed, value, description })
    resetAndClose()
  }

  const title =
    mode === 'edit'
      ? kind === 'global'
        ? 'Edit global variable'
        : 'Edit temporary variable'
      : kind === 'global'
        ? 'Add global variable'
        : 'Add temporary variable'

  return (
    <ModalPortal open={open} onClose={resetAndClose}>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

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
        tip="Shared across all pages. Bind with {{global.name}} or {{name}}. Defaults save with the project."
        onAdd={() => setModal({ mode: 'add' })}
      />

      <ul className="px-2">
        {defs.length === 0 && (
          <li className="px-2 py-3 text-center text-[11px] text-gray-400">No global variables</li>
        )}
        {defs.map((def) => (
          <li
            key={def.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setModal({ mode: 'edit', def })}
              title={def.description || 'Edit variable'}
            >
              <span className="block truncate font-mono text-xs font-medium text-gray-900">
                {def.key}
              </span>
              <span className="block truncate text-[10px] text-gray-400">
                {String(live[def.key] ?? (def.defaultValue || '—'))}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVar(def.key, def.defaultValue, 'global')}
              className="hidden rounded px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50 group-hover:inline"
              title="Reset live value to default"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => remove(def.id)}
              className="rounded px-1.5 py-0.5 text-[10px] text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100"
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <VariableFormModal
        open={modal !== null}
        kind="global"
        mode={modal?.mode ?? 'add'}
        initial={
          modal?.def
            ? {
                key: modal.def.key,
                value: modal.def.defaultValue,
                description: modal.def.description,
              }
            : undefined
        }
        existingKeys={defs.map((d) => d.key)}
        onClose={() => setModal(null)}
        onSubmit={({ key, value, description }) => {
          if (modal?.mode === 'edit' && modal.def) {
            upsert({
              id: modal.def.id,
              key,
              defaultValue: value,
              description,
            })
          } else {
            upsert({ key, defaultValue: value, description })
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
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; key?: string; value?: string } | null>(
    null,
  )

  return (
    <section className="pb-2">
      <SectionHeader
        title="Temporary"
        tip={`Only for the current page (${activePageId}). Cleared when the page changes. Bind with {{temp.name}}.`}
        onAdd={() => setModal({ mode: 'add' })}
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
              onClick={() => setModal({ mode: 'edit', key, value: String(value ?? '') })}
              title="Edit variable"
            >
              <span className="block truncate font-mono text-xs font-medium text-gray-900">
                {key}
              </span>
              <span className="block truncate text-[10px] text-gray-400">
                {String(value ?? '—')}
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

      <VariableFormModal
        open={modal !== null}
        kind="temporary"
        mode={modal?.mode ?? 'add'}
        initial={
          modal?.key !== undefined
            ? { key: modal.key, value: modal.value ?? '', description: '' }
            : undefined
        }
        existingKeys={entries.map(([key]) => key)}
        onClose={() => setModal(null)}
        onSubmit={({ key, value }) => {
          if (modal?.mode === 'edit' && modal.key && modal.key !== key) {
            clearVar(modal.key, 'temporary')
          }
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
