import { create } from 'zustand'
import {
  applyGlobalDefaults,
  clearTemporaryVars,
  clearVar,
  setRuntimeContext,
  setVar,
} from '../../renderer/runtimeVars'
import {
  coerceVariableValue,
  normalizeVariableDataType,
  type VariableDataType,
} from '../variables/variableTypes'

export type GlobalVariableDef = {
  id: string
  key: string
  defaultValue: string
  dataType: VariableDataType
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
        defaultValue: input.defaultValue,
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

    setVar(key, coerceVariableValue(dataType, input.defaultValue), 'global')
  },

  removeGlobalDef: (id) => {
    const def = get().globalDefs.find((d) => d.id === id)
    if (def) clearVar(def.key, 'global')
    set((state) => ({ globalDefs: state.globalDefs.filter((d) => d.id !== id) }))
  },

  loadGlobalDefs: (defs) => {
    const normalized = defs.map((d) => ({
      ...d,
      dataType: normalizeVariableDataType(d.dataType),
    }))
    set({ globalDefs: normalized })
    applyGlobalDefaults(
      normalized.map((d) => ({
        key: d.key,
        defaultValue: coerceVariableValue(d.dataType, d.defaultValue),
      })),
    )
  },

  resetVariables: () => {
    set({ globalDefs: [], activePageId: 'page_home' })
  },
}))

export function serializeGlobalVariables(): GlobalVariableDef[] {
  return useVariablesStore.getState().globalDefs
}
