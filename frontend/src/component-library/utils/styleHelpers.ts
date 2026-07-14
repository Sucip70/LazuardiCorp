/** Flex direction + wrap + overflow only. Gap/padding/align/justify → Visual Style. */
export function layoutClasses(props: Record<string, unknown>, direction: 'row' | 'col'): string {
  return [
    'flex',
    direction === 'row' ? 'flex-row' : 'flex-col',
    props.wrap ? 'flex-wrap' : '',
    overflowClass(props.overflow),
  ]
    .filter(Boolean)
    .join(' ')
}

/** Map layout overflow prop → Tailwind overflow classes. */
export function overflowClass(raw: unknown): string {
  switch (String(raw ?? 'visible')) {
    case 'vertical':
      return 'overflow-y-auto overflow-x-hidden'
    case 'horizontal':
      return 'overflow-x-auto overflow-y-hidden'
    case 'both':
      return 'overflow-auto'
    case 'hidden':
      return 'overflow-hidden'
    default:
      return ''
  }
}

/** Optional size clamps so overflow scrolling can activate. */
export function scrollSizeStyle(props: Record<string, unknown>): Record<string, string> {
  const style: Record<string, string> = {}
  const maxHeight = typeof props.maxHeight === 'string' ? props.maxHeight.trim() : ''
  const maxWidth = typeof props.scrollMaxWidth === 'string' ? props.scrollMaxWidth.trim() : ''
  if (maxHeight) style.maxHeight = maxHeight
  if (maxWidth) style.maxWidth = maxWidth
  const overflow = String(props.overflow ?? 'visible')
  // min-h-0 helps flex children actually shrink and scroll
  if (overflow === 'vertical' || overflow === 'both') {
    style.minHeight = style.minHeight ?? '0'
  }
  if (overflow === 'horizontal' || overflow === 'both') {
    style.minWidth = style.minWidth ?? '0'
  }
  return style
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
