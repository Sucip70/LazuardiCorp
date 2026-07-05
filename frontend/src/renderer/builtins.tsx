import type { RenderComponentProps } from './types'

export function ContainerComponent({
  node,
  children,
  className,
  style,
  attributes,
  eventHandlers,
}: RenderComponentProps) {
  const tag = String(node.props.tag ?? 'div')

  if (tag === 'section') {
    return (
      <section className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </section>
    )
  }
  if (tag === 'main') {
    return (
      <main className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </main>
    )
  }
  if (tag === 'header') {
    return (
      <header className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </header>
    )
  }
  if (tag === 'footer') {
    return (
      <footer className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </footer>
    )
  }
  if (tag === 'nav') {
    return (
      <nav className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </nav>
    )
  }
  if (tag === 'article') {
    return (
      <article className={className} style={style} {...attributes} {...eventHandlers}>
        {children}
      </article>
    )
  }

  return (
    <div className={className} style={style} {...attributes} {...eventHandlers}>
      {children}
    </div>
  )
}

export function TextComponent({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const as = String(node.props.as ?? node.props.variant ?? 'p')
  const content = String(node.props.content ?? node.props.text ?? '')

  if (as === 'h1') return <h1 className={className} style={style} {...attributes} {...eventHandlers}>{content}</h1>
  if (as === 'h2') return <h2 className={className} style={style} {...attributes} {...eventHandlers}>{content}</h2>
  if (as === 'h3') return <h3 className={className} style={style} {...attributes} {...eventHandlers}>{content}</h3>
  if (as === 'h4') return <h4 className={className} style={style} {...attributes} {...eventHandlers}>{content}</h4>
  if (as === 'span') return <span className={className} style={style} {...attributes} {...eventHandlers}>{content}</span>
  if (as === 'label') return <label className={className} style={style} {...attributes} {...eventHandlers}>{content}</label>
  return <p className={className} style={style} {...attributes} {...eventHandlers}>{content}</p>
}

export function ButtonComponent({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const label = String(node.props.label ?? node.props.text ?? 'Button')
  const buttonType = String(node.props.type ?? 'button')
  return (
    <button
      type={buttonType === 'submit' ? 'submit' : buttonType === 'reset' ? 'reset' : 'button'}
      className={className}
      style={style}
      {...attributes}
      {...eventHandlers}
    >
      {label}
    </button>
  )
}

export function ImageComponent({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  return (
    <img
      className={className}
      style={style}
      src={String(node.props.src ?? '')}
      alt={String(node.props.alt ?? '')}
      {...attributes}
      {...eventHandlers}
    />
  )
}

export function LinkComponent({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  const label = String(node.props.label ?? node.props.text ?? 'Link')
  return (
    <a
      href={String(node.props.href ?? '#')}
      target={String(node.props.target ?? '_self')}
      className={className}
      style={style}
      {...attributes}
      {...eventHandlers}
    >
      {children ?? label}
    </a>
  )
}

export function FormComponent({ node, children, className, style, attributes, eventHandlers }: RenderComponentProps) {
  return (
    <form
      className={className}
      style={style}
      method={String(node.props.method ?? 'post')}
      action={String(node.props.action ?? '')}
      {...attributes}
      {...eventHandlers}
    >
      {children}
    </form>
  )
}

export function InputComponent({ node, className, style, attributes, eventHandlers }: RenderComponentProps) {
  return (
    <input
      className={className}
      style={style}
      name={String(node.props.name ?? 'field')}
      type={String(node.props.inputType ?? node.props.type ?? 'text')}
      placeholder={String(node.props.placeholder ?? '')}
      defaultValue={String(node.props.defaultValue ?? node.props.value ?? '')}
      {...attributes}
      {...eventHandlers}
    />
  )
}

export function UnknownComponent({ node, children, className, style, attributes }: RenderComponentProps) {
  if (import.meta.env.DEV) {
    console.warn(`[JsonRenderer] Unknown component type: ${node.type}`)
  }
  return (
    <div className={className} style={style} {...attributes} data-unknown-type={node.type}>
      {children}
    </div>
  )
}
