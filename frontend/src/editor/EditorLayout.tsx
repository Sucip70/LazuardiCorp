import { EditorShell, type EditorShellProps } from './layout/EditorShell'

/** @deprecated Use EditorShell directly — kept for route compatibility. */
export function EditorLayout(props: EditorShellProps) {
  return <EditorShell {...props} />
}

export { EditorShell }
