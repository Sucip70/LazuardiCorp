/** Variable data types for project global (and form) variables. */

export type VariableDataType =
  // Primitives
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'null'
  // Structured
  | 'array'
  | 'object'
  | 'json'
  // Text / contact
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  // Temporal
  | 'date'
  | 'time'
  | 'datetime'
  // Media & design
  | 'color'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'icon'
  | 'font'
  | 'gradient'
  // Layout / CSS-ish
  | 'cssLength'
  | 'percentage'
  | 'markdown'
  | 'richtext'

export type VariableTypeGroup = 'primitive' | 'structured' | 'text' | 'temporal' | 'media' | 'design'

export type VariableTypeOption = {
  value: VariableDataType
  label: string
  group: VariableTypeGroup
  hint: string
  /** Empty / starter default for new variables of this type */
  emptyDefault: string
}

export const VARIABLE_TYPE_OPTIONS: VariableTypeOption[] = [
  { value: 'string', label: 'String', group: 'primitive', hint: 'Plain text', emptyDefault: '' },
  { value: 'integer', label: 'Integer', group: 'primitive', hint: 'Whole number', emptyDefault: '0' },
  {
    value: 'number',
    label: 'Number',
    group: 'primitive',
    hint: 'Decimal number',
    emptyDefault: '0',
  },
  {
    value: 'boolean',
    label: 'Boolean',
    group: 'primitive',
    hint: 'true / false',
    emptyDefault: 'false',
  },
  {
    value: 'null',
    label: 'Null',
    group: 'primitive',
    hint: 'Empty / null value',
    emptyDefault: '',
  },
  {
    value: 'array',
    label: 'Array',
    group: 'structured',
    hint: 'JSON array, e.g. [1, 2]',
    emptyDefault: '[]',
  },
  {
    value: 'object',
    label: 'Object',
    group: 'structured',
    hint: 'JSON object, e.g. {"a":1}',
    emptyDefault: '{}',
  },
  {
    value: 'json',
    label: 'JSON',
    group: 'structured',
    hint: 'Any valid JSON',
    emptyDefault: 'null',
  },
  { value: 'email', label: 'Email', group: 'text', hint: 'Email address', emptyDefault: '' },
  { value: 'phone', label: 'Phone', group: 'text', hint: 'Phone number', emptyDefault: '' },
  { value: 'url', label: 'URL', group: 'text', hint: 'Web address', emptyDefault: '' },
  {
    value: 'password',
    label: 'Password',
    group: 'text',
    hint: 'Sensitive string (stored in project)',
    emptyDefault: '',
  },
  { value: 'date', label: 'Date', group: 'temporal', hint: 'YYYY-MM-DD', emptyDefault: '' },
  { value: 'time', label: 'Time', group: 'temporal', hint: 'HH:MM', emptyDefault: '' },
  {
    value: 'datetime',
    label: 'Date & time',
    group: 'temporal',
    hint: 'Local datetime',
    emptyDefault: '',
  },
  { value: 'color', label: 'Color', group: 'design', hint: 'Hex color', emptyDefault: '#000000' },
  {
    value: 'gradient',
    label: 'Gradient',
    group: 'design',
    hint: 'CSS gradient',
    emptyDefault: 'linear-gradient(90deg, #000, #fff)',
  },
  {
    value: 'font',
    label: 'Font',
    group: 'design',
    hint: 'Font family name',
    emptyDefault: 'Inter',
  },
  {
    value: 'icon',
    label: 'Icon',
    group: 'design',
    hint: 'Icon name or URL',
    emptyDefault: '',
  },
  {
    value: 'cssLength',
    label: 'CSS length',
    group: 'design',
    hint: 'e.g. 16px, 1.5rem',
    emptyDefault: '0px',
  },
  {
    value: 'percentage',
    label: 'Percentage',
    group: 'design',
    hint: '0–100 or 50%',
    emptyDefault: '0',
  },
  { value: 'image', label: 'Image', group: 'media', hint: 'Image URL', emptyDefault: '' },
  { value: 'video', label: 'Video', group: 'media', hint: 'Video URL', emptyDefault: '' },
  { value: 'audio', label: 'Audio', group: 'media', hint: 'Audio URL', emptyDefault: '' },
  { value: 'file', label: 'File', group: 'media', hint: 'File URL', emptyDefault: '' },
  {
    value: 'markdown',
    label: 'Markdown',
    group: 'text',
    hint: 'Markdown text',
    emptyDefault: '',
  },
  {
    value: 'richtext',
    label: 'Rich text',
    group: 'text',
    hint: 'Long / HTML-ish text',
    emptyDefault: '',
  },
]

const TYPE_SET = new Set(VARIABLE_TYPE_OPTIONS.map((o) => o.value))

export function isVariableDataType(raw: unknown): raw is VariableDataType {
  return typeof raw === 'string' && TYPE_SET.has(raw as VariableDataType)
}

export function normalizeVariableDataType(raw: unknown): VariableDataType {
  return isVariableDataType(raw) ? raw : 'string'
}

export function getVariableTypeOption(type: VariableDataType): VariableTypeOption {
  return VARIABLE_TYPE_OPTIONS.find((o) => o.value === type) ?? VARIABLE_TYPE_OPTIONS[0]
}

export function variableTypeLabel(type: VariableDataType): string {
  return getVariableTypeOption(type).label
}

/** Coerce stored string default into a runtime var value. */
export function coerceVariableValue(
  dataType: VariableDataType,
  raw: string,
): string | number | boolean | null {
  const text = raw ?? ''
  switch (dataType) {
    case 'null':
      return null
    case 'boolean': {
      const lower = text.trim().toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes') return true
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') return false
      return Boolean(text)
    }
    case 'integer': {
      if (text.trim() === '') return 0
      const n = Number.parseInt(text, 10)
      return Number.isFinite(n) ? n : 0
    }
    case 'number':
    case 'percentage': {
      if (text.trim() === '') return 0
      const cleaned = text.trim().replace(/%$/, '')
      const n = Number(cleaned)
      return Number.isFinite(n) ? n : 0
    }
    case 'array':
    case 'object':
    case 'json':
      // Keep as normalized JSON string for templates / setVar string store
      try {
        return JSON.stringify(JSON.parse(text || (dataType === 'array' ? '[]' : dataType === 'object' ? '{}' : 'null')))
      } catch {
        return text
      }
    default:
      return text
  }
}

/** Soft validation for the editor form. Empty is allowed unless type forbids it. */
export function validateVariableValue(
  dataType: VariableDataType,
  raw: string,
): string | null {
  const text = raw ?? ''
  switch (dataType) {
    case 'null':
      return null
    case 'integer': {
      if (text.trim() === '') return null
      if (!/^-?\d+$/.test(text.trim())) return 'Enter a whole number'
      return null
    }
    case 'number': {
      if (text.trim() === '') return null
      if (!Number.isFinite(Number(text.trim()))) return 'Enter a valid number'
      return null
    }
    case 'boolean': {
      const lower = text.trim().toLowerCase()
      if (
        lower === '' ||
        lower === 'true' ||
        lower === 'false' ||
        lower === '0' ||
        lower === '1'
      ) {
        return null
      }
      return 'Use true or false'
    }
    case 'array':
    case 'object':
    case 'json': {
      if (text.trim() === '') return null
      try {
        const parsed = JSON.parse(text)
        if (dataType === 'array' && !Array.isArray(parsed)) return 'Must be a JSON array'
        if (dataType === 'object' && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))) {
          return 'Must be a JSON object'
        }
        return null
      } catch {
        return 'Invalid JSON'
      }
    }
    case 'email': {
      if (text.trim() === '') return null
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) return 'Enter a valid email'
      return null
    }
    case 'url':
    case 'image':
    case 'video':
    case 'audio':
    case 'file': {
      if (text.trim() === '') return null
      try {
        // Allow relative paths
        if (text.startsWith('/') || text.startsWith('./') || text.startsWith('data:')) return null
        void new URL(text)
        return null
      } catch {
        return 'Enter a valid URL or path'
      }
    }
    case 'color': {
      if (text.trim() === '') return null
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(text.trim()) && !/^rgba?\(/.test(text.trim()) && !/^hsla?\(/.test(text.trim())) {
        return 'Use #hex or rgb()/hsl()'
      }
      return null
    }
    case 'percentage': {
      if (text.trim() === '') return null
      const cleaned = text.trim().replace(/%$/, '')
      if (!Number.isFinite(Number(cleaned))) return 'Enter a number or percent'
      return null
    }
    case 'cssLength': {
      if (text.trim() === '') return null
      if (!/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch|ex)?$/i.test(text.trim()) && text.trim() !== '0') {
        return 'e.g. 16px, 1.5rem, 50%'
      }
      return null
    }
    case 'date': {
      if (text.trim() === '') return null
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return 'Use YYYY-MM-DD'
      return null
    }
    case 'time': {
      if (text.trim() === '') return null
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text.trim())) return 'Use HH:MM'
      return null
    }
    default:
      return null
  }
}

export const VARIABLE_TYPE_GROUP_LABELS: Record<VariableTypeGroup, string> = {
  primitive: 'Primitives',
  structured: 'Structured',
  text: 'Text & contact',
  temporal: 'Date & time',
  media: 'Media',
  design: 'Design',
}
