type CanvasGridProps = {
  visible: boolean
  cellSize?: number
}

export function CanvasGrid({ visible, cellSize = 8 }: CanvasGridProps) {
  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-xl opacity-40"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(203 213 225 / 0.6) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(203 213 225 / 0.6) 1px, transparent 1px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
      }}
    />
  )
}
