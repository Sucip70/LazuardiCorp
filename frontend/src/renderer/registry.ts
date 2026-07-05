import {
  ButtonComponent,
  ContainerComponent,
  FormComponent,
  ImageComponent,
  InputComponent,
  LinkComponent,
  TextComponent,
  UnknownComponent,
} from './builtins'
import type { RegisteredComponent } from './types'

const registry = new Map<string, RegisteredComponent>()

export const rendererRegistry = {
  register(type: string, entry: RegisteredComponent) {
    registry.set(type, entry)
  },

  unregister(type: string) {
    registry.delete(type)
  },

  get(type: string): RegisteredComponent | undefined {
    return registry.get(type)
  },

  has(type: string): boolean {
    return registry.has(type)
  },

  list(): string[] {
    return [...registry.keys()]
  },
}

export function registerBuiltInComponents() {
  rendererRegistry.register('Container', { component: ContainerComponent, acceptsChildren: true })
  rendererRegistry.register('Text', { component: TextComponent, acceptsChildren: false })
  rendererRegistry.register('Button', { component: ButtonComponent, acceptsChildren: false })
  rendererRegistry.register('Image', { component: ImageComponent, acceptsChildren: false })
  rendererRegistry.register('Link', { component: LinkComponent, acceptsChildren: true })
  rendererRegistry.register('Form', { component: FormComponent, acceptsChildren: true })
  rendererRegistry.register('Input', { component: InputComponent, acceptsChildren: false })
}

export function resolveRenderer(type: string): RegisteredComponent {
  return rendererRegistry.get(type) ?? { component: UnknownComponent, acceptsChildren: true }
}

export function registerCustomComponent(
  type: string,
  component: RegisteredComponent['component'],
  options?: { acceptsChildren?: boolean },
) {
  rendererRegistry.register(type, {
    component,
    acceptsChildren: options?.acceptsChildren ?? false,
  })
}
