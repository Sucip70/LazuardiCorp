import { useState, type ReactNode } from 'react'

type AccordionSectionProps = {
  title: string
  defaultOpen?: boolean
  badge?: string
  children: ReactNode
}

export function AccordionSection({ title, defaultOpen = true, badge, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
        <span className="flex-1">{title}</span>
        {badge && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium normal-case text-gray-600">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </section>
  )
}
