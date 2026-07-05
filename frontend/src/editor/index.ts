/**
 * No-code builder UI architecture
 *
 * Layout regions:
 * ├── TopBar       — logo, project name, save, preview, export, collaboration
 * ├── LeftSidebar  — tabs: Components | Pages | Layers
 * ├── Canvas       — device preview with grid overlay + DnD
 * ├── RightSidebar — Properties | JSON
 * └── StatusBar    — selection info, undo/redo, breakpoints, grid, zoom
 *
 * State management:
 * - editorStore (Zustand + Immer) — document graph, selection, history, zoom, breakpoint
 * - uiStore (Zustand) — panel tabs, sidebar visibility, grid, preview mode, save status
 * - collaborationStore — presence stub for future WebSocket/Yjs integration
 *
 * Responsive editor chrome:
 * - wide (≥1024px): both sidebars docked
 * - medium (768–1023px): left docked, right overlay
 * - compact (≤767px): both sidebars slide-over with backdrop
 *
 * @see EditorShell for the root layout component
 */
export { EditorShell } from './layout/EditorShell'
export { useEditorStore } from './store/editorStore'
export { useUIStore } from './store/uiStore'
export { useCollaborationStore } from './store/collaborationStore'
