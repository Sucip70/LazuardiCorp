export * from './types/props'
export * from './types/catalog'
export {
  COMPONENT_CATALOG,
  COMPONENT_CATALOG_MAP,
  getCatalogEntry,
  getPaletteByCategory,
  getDefaultProps,
  getDefaultStyles,
} from './catalog'
export { registerComponentLibrary, getLibraryPaletteItems, resolveLibraryType } from './register'

// Side-effect: register all library components with the JSON renderer
import './register'
