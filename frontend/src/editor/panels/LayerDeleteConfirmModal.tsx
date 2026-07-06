import { ModalPortal } from './ModalPortal'

type LayerDeleteConfirmModalProps = {
  open: boolean
  nodeLabel: string
  childCount: number
  onClose: () => void
  onConfirm: () => void
}

export function LayerDeleteConfirmModal({
  open,
  nodeLabel,
  childCount,
  onClose,
  onConfirm,
}: LayerDeleteConfirmModalProps) {
  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Delete component?</h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{nodeLabel}</span> will be removed
          {childCount > 0
            ? ` along with ${childCount} nested child component${childCount === 1 ? '' : 's'}`
            : ''}
          . This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
