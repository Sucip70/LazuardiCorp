export type VarKind = 'global' | 'temporary'
/** @deprecated use VarKind — kept for older event payloads */
export type VarScope = 'memory' | 'session' | VarKind

type VarsMap = Record<string, string | number | boolean | null>

const memoryStore = new Map<string, VarsMap>()
const listeners = new Set<() => void>()
let version = 0
let projectId = 'default'
let pageId = 'page_home'

const STORAGE_PREFIX = 'lazuardi:preview-vars:'

function notify() {
  version += 1
  for (const listener of listeners) listener()
}

function globalNs(pid = projectId) {
  return `${pid}:global`
}

function tempNs(pid = projectId, page = pageId) {
  return `${pid}:temp:${page}`
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

function ensureMemory(ns: string, hydrateFromSession = false): VarsMap {
  if (!memoryStore.has(ns)) {
    memoryStore.set(ns, hydrateFromSession ? { ...readSession(ns) } : {})
  }
  return memoryStore.get(ns)!
}

export function setRuntimeContext(next: { projectId?: string; pageId?: string }) {
  if (next.projectId !== undefined) projectId = next.projectId || 'default'
  if (next.pageId !== undefined) pageId = next.pageId || 'page_home'
  ensureMemory(globalNs(), true)
  ensureMemory(tempNs(), false)
  notify()
}

/** @deprecated use setRuntimeContext */
export function setRuntimeNamespace(namespace: string) {
  setRuntimeContext({ projectId: namespace })
}

export function getRuntimeNamespace() {
  return projectId
}

export function getRuntimePageId() {
  return pageId
}

export function getGlobalVars(): VarsMap {
  return { ...ensureMemory(globalNs(), true) }
}

export function getTemporaryVars(): VarsMap {
  return { ...ensureMemory(tempNs(), false) }
}

/** Merged view: temporary overrides global for the same key. */
export function getAllVars(): VarsMap {
  return { ...getGlobalVars(), ...getTemporaryVars() }
}

export function getVar(
  key: string,
  kind?: VarKind,
): string | number | boolean | null | undefined {
  if (kind === 'global') return ensureMemory(globalNs(), true)[key]
  if (kind === 'temporary') return ensureMemory(tempNs(), false)[key]
  const temp = ensureMemory(tempNs(), false)[key]
  if (temp !== undefined) return temp
  return ensureMemory(globalNs(), true)[key]
}

/**
 * Resolve binding keys:
 * - global.foo / g.foo → global
 * - temp.foo / temporary.foo / t.foo → temporary
 * - vars.foo / foo → temporary then global
 */
export function resolveVarKey(path: string): string | number | boolean | null | undefined {
  const cleaned = path.replace(/^vars\./, '')
  if (cleaned.startsWith('global.') || cleaned.startsWith('g.')) {
    const key = cleaned.replace(/^(global|g)\./, '')
    return getVar(key, 'global')
  }
  if (
    cleaned.startsWith('temp.') ||
    cleaned.startsWith('temporary.') ||
    cleaned.startsWith('t.')
  ) {
    const key = cleaned.replace(/^(temp|temporary|t)\./, '')
    return getVar(key, 'temporary')
  }
  return getVar(cleaned)
}

function normalizeKind(scope?: VarScope | string): VarKind {
  if (scope === 'temporary' || scope === 'memory') return 'temporary'
  return 'global'
}

export function setVar(
  key: string,
  value: string | number | boolean | null,
  scope: VarScope = 'global',
) {
  if (!key.trim()) return
  const kind = normalizeKind(scope)
  if (kind === 'global') {
    const vars = ensureMemory(globalNs(), true)
    vars[key] = value
    writeSession(globalNs(), vars)
  } else {
    const vars = ensureMemory(tempNs(), false)
    vars[key] = value
  }
  notify()
}

export function clearVar(key: string, kind: VarKind = 'global') {
  if (kind === 'global') {
    const vars = ensureMemory(globalNs(), true)
    delete vars[key]
    writeSession(globalNs(), vars)
  } else {
    const vars = ensureMemory(tempNs(), false)
    delete vars[key]
  }
  notify()
}

export function clearTemporaryVars() {
  memoryStore.set(tempNs(), {})
  notify()
}

export function clearGlobalVars() {
  memoryStore.set(globalNs(), {})
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + globalNs())
  } catch {
    // ignore
  }
  notify()
}

export function clearAllVars() {
  clearTemporaryVars()
  clearGlobalVars()
}

/** Seed / refresh global runtime values from project definitions (does not wipe other keys). */
export function applyGlobalDefaults(
  defaults: { key: string; defaultValue?: string | number | boolean | null }[],
) {
  const vars = ensureMemory(globalNs(), true)
  for (const item of defaults) {
    const key = item.key?.trim()
    if (!key) continue
    if (vars[key] === undefined) {
      vars[key] = item.defaultValue ?? ''
    }
  }
  writeSession(globalNs(), vars)
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

export function getRuntimeVarsSnapshot() {
  return version
}
