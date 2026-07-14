import type { ComponentType as ReactComponentType } from 'react'
import { FormComponent } from '../renderer/builtins'
import { COMPONENT_CATALOG } from './catalog'
import {
  AccordionLib,
  AlertLib,
  BreadcrumbLib,
  ButtonLib,
  CheckboxLib,
  ColumnLib,
  ContainerLib,
  HeadingLib,
  IconLib,
  ImageLib,
  InputLib,
  LinkLib,
  MenuLib,
  ModalLib,
  NavbarLib,
  ParagraphLib,
  RadioLib,
  RowLib,
  SectionLib,
  SelectLib,
  ComboboxLib,
  SpanLib,
  TabsLib,
  TextAreaLib,
  ToastLib,
  VideoLib,
} from './components/libraryComponents'
import { rendererRegistry } from '../renderer/registry'
import type { RenderComponentProps } from '../renderer/types'

type RegistryEntry = {
  component: ReactComponentType<RenderComponentProps>
  acceptsChildren: boolean
}

const LIBRARY_REGISTRY: Record<string, RegistryEntry> = {
  Container: { component: ContainerLib, acceptsChildren: true },
  Row: { component: RowLib, acceptsChildren: true },
  Column: { component: ColumnLib, acceptsChildren: true },
  Section: { component: SectionLib, acceptsChildren: true },
  Heading: { component: HeadingLib, acceptsChildren: false },
  Paragraph: { component: ParagraphLib, acceptsChildren: false },
  Span: { component: SpanLib, acceptsChildren: false },
  Image: { component: ImageLib, acceptsChildren: false },
  Video: { component: VideoLib, acceptsChildren: false },
  Icon: { component: IconLib, acceptsChildren: false },
  Button: { component: ButtonLib, acceptsChildren: false },
  Link: { component: LinkLib, acceptsChildren: true },
  Accordion: { component: AccordionLib, acceptsChildren: false },
  Tabs: { component: TabsLib, acceptsChildren: true },
  Input: { component: InputLib, acceptsChildren: false },
  TextArea: { component: TextAreaLib, acceptsChildren: false },
  Select: { component: SelectLib, acceptsChildren: false },
  Combobox: { component: ComboboxLib, acceptsChildren: false },
  Checkbox: { component: CheckboxLib, acceptsChildren: false },
  Radio: { component: RadioLib, acceptsChildren: false },
  Navbar: { component: NavbarLib, acceptsChildren: true },
  Menu: { component: MenuLib, acceptsChildren: false },
  Breadcrumb: { component: BreadcrumbLib, acceptsChildren: false },
  Alert: { component: AlertLib, acceptsChildren: false },
  Modal: { component: ModalLib, acceptsChildren: true },
  Toast: { component: ToastLib, acceptsChildren: false },
  Form: { component: FormComponent, acceptsChildren: true },
  Text: { component: ParagraphLib, acceptsChildren: false },
}

export function registerComponentLibrary() {
  for (const [type, entry] of Object.entries(LIBRARY_REGISTRY)) {
    rendererRegistry.register(type, entry)
  }
}

registerComponentLibrary()

export function getLibraryPaletteItems() {
  return COMPONENT_CATALOG.map((entry: (typeof COMPONENT_CATALOG)[number]) => ({
    type: entry.type,
    label: entry.label,
    category: entry.category.charAt(0).toUpperCase() + entry.category.slice(1),
    icon: entry.icon,
  }))
}

export function resolveLibraryType(type: string): string {
  return type
}
