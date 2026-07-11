export type VarScope = 'memory' | 'session'

type VarsMap = Record<string, string | number | boolean | null>

const memoryStore = new Map<string, VarsMap>()
const listeners = new Set<() => void>()
let version = 0
let activeNamespace = 'default'

const STORAGE_PREFIX = 'lazuardi:preview-vars:'

function notify() {
  version += 1
  for (const listener of listeners) listener()
}

function readSession(ns: string): VarsMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + ns)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as VarsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSession(ns: string, vars: VarsMap) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + ns, JSON.stringify(vars))
  } catch {
    // quota / private mode
  }
}

function ensureMemory(ns: string): VarsMap {
  if (!memoryStore.has(ns)) {
    memoryStore.set(ns, { ...readSession(ns) })
  }
  return memoryStore.get(ns)!
}

export function setRuntimeNamespace(namespace: string) {
  activeNamespace = namespace || 'default'
  ensureMemory(activeNamespace)
  notify()
}

export function getRuntimeNamespace() {
  return activeNamespace
}

export function getAllVars(namespace = activeNamespace): VarsMap {
  return { ...ensureMemory(namespace) }
}

export function getVar(key: string, namespace = activeNamespace): string | number | boolean | null | undefined {
  return ensureMemory(namespace)[key]
}

export function setVar(
  key: string,
  value: string | number | boolean | null,
  scope: VarScope = 'session',
  namespace = activeNamespace,
) {
  if (!key.trim()) return
  const vars = ensureMemory(namespace)
  vars[key] = value
  if (scope === 'session') writeSession(namespace, vars)
  notify()
}

export function clearVar(key: string, namespace = activeNamespace) {
  const vars = ensureMemory(namespace)
  delete vars[key]
  writeSession(namespace, vars)
  notify()
}

export function clearAllVars(namespace = activeNamespace) {
  memoryStore.set(namespace, {})
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + namespace)
  } catch {
    // ignore
  }
  notify()
}

export function subscribeRuntimeVars(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getRuntimeVarsVersion() {
  return version
}

/** Snapshot for React useSyncExternalStore */
export function getRuntimeVarsSnapshot() {
  return version
}
