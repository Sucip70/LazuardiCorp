import { ModalPortal } from './ModalPortal'

type EditorErrorModalProps = {
  open: boolean
  message: string
  onClose: () => void
}

export function EditorErrorModal({ open, message, onClose }: EditorErrorModalProps) {
  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-red-600">Could not add component</h2>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            OK
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
