import { create } from 'zustand'
import {
  clearTemporaryVars,
  clearVar,
  setRuntimeContext,
} from '../../renderer/runtimeVars'
import {
  normalizeVariableDataType,
  type VariableDataType,
} from '../variables/variableTypes'

/** Project-defined global variable schema (no starting value — set via page setVar). */
export type GlobalVariableDef = {
  id: string
  key: string
  dataType: VariableDataType
  /** @deprecated Unused in UI — kept empty for older project JSON round-trips. */
  defaultValue?: string
}

type VariablesState = {
  globalDefs: GlobalVariableDef[]
  activePageId: string
}

type VariablesActions = {
  setActivePageId: (pageId: string) => void
  upsertGlobalDef: (def: Omit<GlobalVariableDef, 'id'> & { id?: string }) => void
  removeGlobalDef: (id: string) => void
  loadGlobalDefs: (defs: GlobalVariableDef[]) => void
  resetVariables: () => void
}

function newVarId() {
  return `var_${crypto.randomUUID().slice(0, 8)}`
}

export const useVariablesStore = create<VariablesState & VariablesActions>((set, get) => ({
  globalDefs: [],
  activePageId: 'page_home',

  setActivePageId: (pageId) => {
    const prev = get().activePageId
    if (prev === pageId) return
    clearTemporaryVars()
    setRuntimeContext({ pageId })
    set({ activePageId: pageId })
  },

  upsertGlobalDef: (input) => {
    const key = input.key.trim()
    if (!key) return
    const dataType = normalizeVariableDataType(input.dataType)

    set((state) => {
      const existingIdx = input.id
        ? state.globalDefs.findIndex((d) => d.id === input.id)
        : state.globalDefs.findIndex((d) => d.key === key)

      const next: GlobalVariableDef = {
        id: input.id ?? (existingIdx >= 0 ? state.globalDefs[existingIdx].id : newVarId()),
        key,
        dataType,
      }

      const list = [...state.globalDefs]
      if (existingIdx >= 0) {
        const oldKey = list[existingIdx].key
        list[existingIdx] = next
        if (oldKey !== key) clearVar(oldKey, 'global')
      } else {
        list.push(next)
      }
      return { globalDefs: list }
    })
    // Do not setVar here — starting values come from page events (setVar / onStart).
  },

  removeGlobalDef: (id) => {
    const def = get().globalDefs.find((d) => d.id === id)
    if (def) clearVar(def.key, 'global')
    set((state) => ({ globalDefs: state.globalDefs.filter((d) => d.id !== id) }))
  },

  loadGlobalDefs: (defs) => {
    const normalized = defs.map((d) => ({
      id: d.id,
      key: d.key,
      dataType: normalizeVariableDataType(d.dataType),
    }))
    set({ globalDefs: normalized })
    // Live globals are populated by page scripts (setVar), not project defaults.
  },

  resetVariables: () => {
    set({ globalDefs: [], activePageId: 'page_home' })
  },
}))

export function serializeGlobalVariables(): GlobalVariableDef[] {
  return useVariablesStore.getState().globalDefs.map(({ id, key, dataType }) => ({
    id,
    key,
    dataType,
  }))
}
