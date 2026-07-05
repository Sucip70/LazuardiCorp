const gapMap = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
} as const

const paddingMap = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
} as const

export function layoutClasses(props: Record<string, unknown>, direction: 'row' | 'col'): string {
  const gap = gapMap[(props.gap as keyof typeof gapMap) ?? 'md']
  const padding = paddingMap[(props.padding as keyof typeof paddingMap) ?? 'md']
  const align = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }[(props.align as string) ?? 'stretch']
  const justify = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  }[(props.justify as string) ?? 'start']

  return [
    'flex',
    direction === 'row' ? 'flex-row' : 'flex-col',
    gap,
    padding,
    align,
    justify,
    props.wrap ? 'flex-wrap' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function mergeAria(
  attributes: Record<string, string | number | boolean>,
  props: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const next = { ...attributes }
  if (props.ariaLabel && !next['aria-label']) {
    next['aria-label'] = String(props.ariaLabel)
  }
  return next
}

export function iconGlyph(name: string): string {
  const icons: Record<string, string> = {
    home: '⌂',
    user: '👤',
    settings: '⚙',
    search: '🔍',
    check: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
    success: '✓',
  }
  return icons[name] ?? '●'
}

export function alertVariantClasses(variant: string): string {
  switch (variant) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-900'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-900'
  }
}

export function buttonVariantClasses(variant: string): string {
  switch (variant) {
    case 'secondary':
      return 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
    case 'ghost':
      return 'bg-transparent text-gray-700 hover:bg-gray-100'
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700'
    default:
      return 'bg-blue-600 text-white hover:bg-blue-700'
  }
}

export function buttonSizeClasses(size: string): string {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm'
    case 'lg':
      return 'px-5 py-3 text-base'
    default:
      return 'px-4 py-2 text-sm'
  }
}
