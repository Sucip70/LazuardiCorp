import type { RenderComponentProps } from '../types'

export function PricingCard({
  node,
  children,
  className,
  style,
  attributes,
  eventHandlers,
}: RenderComponentProps) {
  const title = String(node.props.title ?? 'Plan')
  const price = String(node.props.price ?? '$0')
  const description = String(node.props.description ?? '')

  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`.trim()}
      style={style}
      {...attributes}
      {...eventHandlers}
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-blue-600">{price}</p>
      {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
      {children}
    </article>
  )
}
