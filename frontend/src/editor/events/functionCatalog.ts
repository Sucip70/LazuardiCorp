export type FunctionCategory =
  | 'variables'
  | 'math'
  | 'string'
  | 'regex'
  | 'array'
  | 'object'
  | 'logic'
  | 'navigation'
  | 'dom'
  | 'debug'

export type FunctionCatalogItem = {
  /** Unique id for React keys (action + variant) */
  id: string
  action: string
  label: string
  category: FunctionCategory
  /** Short signature shown in the list */
  hint: string
  /** Inserted into the script editor */
  template: string
  /** Hover “how to use” description */
  howTo: string
}

export const FUNCTION_CATEGORY_LABELS: Record<FunctionCategory, string> = {
  variables: 'Variables',
  math: 'Math & formula',
  string: 'String',
  regex: 'Regex',
  array: 'Array',
  object: 'Object',
  logic: 'Logic & loops',
  navigation: 'Navigation',
  dom: 'DOM & forms',
  debug: 'Debug',
}

export const EVENT_FUNCTION_CATALOG: FunctionCatalogItem[] = [
  // ── Variables ──
  {
    id: 'setVar',
    action: 'setVar',
    label: 'setVar',
    category: 'variables',
    hint: 'setVar("key", value)',
    template: 'setVar("key", 0);',
    howTo:
      'Store a value in a runtime variable.\n• setVar("total", 10)\n• setVar("name", "Ada")\n• setVar("n", $event) — from input change\n• setVar("x", cmp_abc.value) — component path\nOptional 3rd arg scope: "global" | "temporary".',
  },
  {
    id: 'copyVar',
    action: 'copyVar',
    label: 'copyVar',
    category: 'variables',
    hint: 'copyVar("from", "to")',
    template: 'copyVar("source", "dest");',
    howTo: 'Copy one variable into another: copyVar("a", "b") sets b = current value of a.',
  },
  {
    id: 'clearVar',
    action: 'clearVar',
    label: 'clearVar',
    category: 'variables',
    hint: 'clearVar("key")',
    template: 'clearVar("key");',
    howTo: 'Delete a single variable by key.',
  },
  {
    id: 'clearVars',
    action: 'clearVars',
    label: 'clearVars',
    category: 'variables',
    hint: 'clearVars() / clearVars("temporary")',
    template: 'clearVars();',
    howTo: 'Clear variables. clearVars() clears globals; clearVars("temporary") clears page-only vars.',
  },

  // ── Math ──
  {
    id: 'math',
    action: 'math',
    label: 'math',
    category: 'math',
    hint: 'math("key", "expr")',
    template: 'math("total", "cmp_a.value + cmp_b.value");',
    howTo:
      'Evaluate a math expression and store the number.\nExample: math("total", "cmp_a.value + cmp_b.value")\nSupports + - * / % ( ) and {{vars}} / component paths.',
  },
  {
    id: 'formula',
    action: 'formula',
    label: 'formula',
    category: 'math',
    hint: 'formula("key", "expr")',
    template: 'formula("label", "Hello {{name}}");',
    howTo:
      'Math if the expression looks numeric; otherwise string template.\nformula("x", "price * 1.1") or formula("msg", "Hi {{name}}").',
  },

  // ── String ──
  {
    id: 'string-concat',
    action: 'string',
    label: 'string concat',
    category: 'string',
    hint: 'string("key", "concat", a, b)',
    template: 'string("name", "concat", "Hello", " World");',
    howTo: 'Join strings: string("out", "concat", "Hello", " World") → "Hello World".',
  },
  {
    id: 'string-upper',
    action: 'string',
    label: 'string upper',
    category: 'string',
    hint: 'string("key", "upper", text)',
    template: 'string("out", "upper", "hello");',
    howTo: 'Uppercase: string("out", "upper", "hello") → "HELLO".',
  },
  {
    id: 'string-lower',
    action: 'string',
    label: 'string lower',
    category: 'string',
    hint: 'string("key", "lower", text)',
    template: 'string("out", "lower", "HELLO");',
    howTo: 'Lowercase: string("out", "lower", "HELLO") → "hello".',
  },
  {
    id: 'string-trim',
    action: 'string',
    label: 'string trim',
    category: 'string',
    hint: 'string("key", "trim", text)',
    template: 'string("out", "trim", "  hi  ");',
    howTo: 'Trim whitespace from both ends.',
  },
  {
    id: 'string-replace',
    action: 'string',
    label: 'string replace',
    category: 'string',
    hint: 'string("key", "replace", text, find, with)',
    template: 'string("out", "replace", "a-b-c", "-", "/");',
    howTo: 'Replace all occurrences: string("out", "replace", text, find, replacement).',
  },
  {
    id: 'string-slice',
    action: 'string',
    label: 'string slice',
    category: 'string',
    hint: 'string("key", "slice", text, start, end?)',
    template: 'string("out", "slice", "abcdef", 0, 3);',
    howTo: 'Substring by index: string("out", "slice", text, start, end?).',
  },
  {
    id: 'string-length',
    action: 'string',
    label: 'string length',
    category: 'string',
    hint: 'string("key", "length", text)',
    template: 'string("len", "length", "hello");',
    howTo: 'Character length of a string.',
  },

  // ── Regex ──
  {
    id: 'regex-test',
    action: 'regex',
    label: 'regex test',
    category: 'regex',
    hint: 'regex("key", "test", input, pattern, flags?)',
    template: 'regex("ok", "test", email, "^[^@]+@[^@]+\\\\.[^@]+$");',
    howTo:
      'Boolean match: regex("ok", "test", input, pattern, flags?).\nExample: regex("ok", "test", email, "^[^@]+@").',
  },
  {
    id: 'regex-match',
    action: 'regex',
    label: 'regex match',
    category: 'regex',
    hint: 'regex("key", "match", input, pattern, flags?)',
    template: 'regex("parts", "match", "a1b2", "\\\\d+", "g");',
    howTo: 'Return match groups as JSON array. Use flags like "g" for global.',
  },
  {
    id: 'regex-replace',
    action: 'regex',
    label: 'regex replace',
    category: 'regex',
    hint: 'regex("key", "replace", input, pattern, replacement, flags?)',
    template: 'regex("out", "replace", "a-b", "-", "/", "g");',
    howTo: 'Replace with RegExp: regex("out", "replace", input, pattern, replacement, flags?).',
  },
  {
    id: 'regex-split',
    action: 'regex',
    label: 'regex split',
    category: 'regex',
    hint: 'regex("key", "split", input, pattern, flags?)',
    template: 'regex("parts", "split", "a,b;c", "[,;]");',
    howTo: 'Split string by regex into a JSON array stored in key.',
  },

  // ── Array ──
  {
    id: 'array-parse',
    action: 'array',
    label: 'array parse',
    category: 'array',
    hint: 'array("key", "parse", "[1,2]")',
    template: 'array("items", "parse", "[1, 2, 3]");',
    howTo: 'Parse JSON text into an array variable (stored as JSON string).',
  },
  {
    id: 'array-length',
    action: 'array',
    label: 'array length',
    category: 'array',
    hint: 'array("key", "length", source)',
    template: 'array("n", "length", items);',
    howTo: 'Number of items. source can be a var name or JSON array.',
  },
  {
    id: 'array-get',
    action: 'array',
    label: 'array get',
    category: 'array',
    hint: 'array("key", "get", source, index)',
    template: 'array("first", "get", items, 0);',
    howTo: 'Read item at index (0-based).',
  },
  {
    id: 'array-set',
    action: 'array',
    label: 'array set',
    category: 'array',
    hint: 'array("key", "set", source, index, value)',
    template: 'array("items", "set", items, 0, "new");',
    howTo: 'Set item at index; result is the new array.',
  },
  {
    id: 'array-push',
    action: 'array',
    label: 'array push',
    category: 'array',
    hint: 'array("key", "push", source, value)',
    template: 'array("items", "push", items, "x");',
    howTo: 'Append a value; stores the updated array in key.',
  },
  {
    id: 'array-pop',
    action: 'array',
    label: 'array pop',
    category: 'array',
    hint: 'array("key", "pop", source)',
    template: 'array("items", "pop", items);',
    howTo: 'Remove last item; stores remaining array.',
  },
  {
    id: 'array-join',
    action: 'array',
    label: 'array join',
    category: 'array',
    hint: 'array("key", "join", source, sep)',
    template: 'array("csv", "join", items, ",");',
    howTo: 'Join items into a string with separator.',
  },
  {
    id: 'array-slice',
    action: 'array',
    label: 'array slice',
    category: 'array',
    hint: 'array("key", "slice", source, start, end?)',
    template: 'array("part", "slice", items, 0, 2);',
    howTo: 'Copy a range of items [start, end).',
  },
  {
    id: 'array-concat',
    action: 'array',
    label: 'array concat',
    category: 'array',
    hint: 'array("key", "concat", a, b)',
    template: 'array("all", "concat", listA, listB);',
    howTo: 'Concatenate two arrays.',
  },
  {
    id: 'array-includes',
    action: 'array',
    label: 'array includes',
    category: 'array',
    hint: 'array("key", "includes", source, value)',
    template: 'array("has", "includes", items, "x");',
    howTo: 'Boolean: does the array contain value?',
  },
  {
    id: 'array-map',
    action: 'array',
    label: 'array map',
    category: 'array',
    hint: 'array("key", "map", source, template)',
    template: 'array("doubled", "map", items, "item * 2");',
    howTo:
      'Transform each item (loop-style).\n• Template: "Hello {{item}}"\n• Math: "item * 2"\n• Index: "{{index}}"\nResult is a new array in key.',
  },
  {
    id: 'array-filter',
    action: 'array',
    label: 'array filter',
    category: 'array',
    hint: 'array("key", "filter", source, mode)',
    template: 'array("kept", "filter", items, "truthy");',
    howTo:
      'Keep items. mode "truthy" drops empty/0/false.\nOr pass a match string / expr using {{item}}.',
  },
  {
    id: 'array-sum',
    action: 'array',
    label: 'array sum',
    category: 'array',
    hint: 'array("key", "sum", source)',
    template: 'array("total", "sum", items);',
    howTo: 'Sum numeric items in the array.',
  },
  {
    id: 'array-sort',
    action: 'array',
    label: 'array sort',
    category: 'array',
    hint: 'array("key", "sort", source)',
    template: 'array("sorted", "sort", items);',
    howTo: 'Sort items (numeric-aware string sort).',
  },
  {
    id: 'array-unique',
    action: 'array',
    label: 'array unique',
    category: 'array',
    hint: 'array("key", "unique", source)',
    template: 'array("uniq", "unique", items);',
    howTo: 'Remove duplicate values.',
  },
  {
    id: 'array-range',
    action: 'array',
    label: 'array range',
    category: 'array',
    hint: 'array("key", "range", start, end, step?)',
    template: 'array("nums", "range", 0, 5, 1);',
    howTo: 'Build [start, end) with optional step — useful for loops via map.',
  },
  {
    id: 'array-reverse',
    action: 'array',
    label: 'array reverse',
    category: 'array',
    hint: 'array("key", "reverse", source)',
    template: 'array("rev", "reverse", items);',
    howTo: 'Reverse order of items.',
  },
  {
    id: 'array-flatten',
    action: 'array',
    label: 'array flatten',
    category: 'array',
    hint: 'array("key", "flatten", source, depth?)',
    template: 'array("flat", "flatten", nested, 1);',
    howTo: 'Flatten nested arrays by depth (default 1).',
  },

  // ── Object ──
  {
    id: 'object-parse',
    action: 'object',
    label: 'object parse',
    category: 'object',
    hint: 'object("key", "parse", "{}")',
    template: 'object("user", "parse", {"name":"Ada"});',
    howTo: 'Parse JSON object text into a variable.',
  },
  {
    id: 'object-get',
    action: 'object',
    label: 'object get',
    category: 'object',
    hint: 'object("key", "get", source, "path")',
    template: 'object("name", "get", user, "name");',
    howTo: 'Read a property. Path supports dots: "address.city".',
  },
  {
    id: 'object-set',
    action: 'object',
    label: 'object set',
    category: 'object',
    hint: 'object("key", "set", source, "path", value)',
    template: 'object("user", "set", user, "name", "Ada");',
    howTo: 'Set a property (dot path OK); stores updated object.',
  },
  {
    id: 'object-keys',
    action: 'object',
    label: 'object keys',
    category: 'object',
    hint: 'object("key", "keys", source)',
    template: 'object("ks", "keys", user);',
    howTo: 'Array of property names.',
  },
  {
    id: 'object-values',
    action: 'object',
    label: 'object values',
    category: 'object',
    hint: 'object("key", "values", source)',
    template: 'object("vs", "values", user);',
    howTo: 'Array of property values.',
  },
  {
    id: 'object-has',
    action: 'object',
    label: 'object has',
    category: 'object',
    hint: 'object("key", "has", source, "prop")',
    template: 'object("ok", "has", user, "email");',
    howTo: 'Boolean: does the object own this property?',
  },
  {
    id: 'object-merge',
    action: 'object',
    label: 'object merge',
    category: 'object',
    hint: 'object("key", "merge", a, b)',
    template: 'object("all", "merge", defaults, overrides);',
    howTo: 'Shallow merge objects (b overwrites a).',
  },
  {
    id: 'object-omit',
    action: 'object',
    label: 'object omit',
    category: 'object',
    hint: 'object("key", "omit", source, "prop")',
    template: 'object("clean", "omit", user, "password");',
    howTo: 'Return object without the given property.',
  },
  {
    id: 'json-parse',
    action: 'json',
    label: 'json parse',
    category: 'object',
    hint: 'json("key", "parse", text)',
    template: 'json("data", "parse", raw);',
    howTo: 'Parse any JSON (array or object) into key.',
  },
  {
    id: 'json-stringify',
    action: 'json',
    label: 'json stringify',
    category: 'object',
    hint: 'json("key", "stringify", value)',
    template: 'json("raw", "stringify", data);',
    howTo: 'Serialize a value to a JSON string.',
  },

  // ── Logic ──
  {
    id: 'if',
    action: 'if',
    label: 'if',
    category: 'logic',
    hint: 'if("key", condition, thenVal, elseVal)',
    template: 'if("label", showPremium, "Pro", "Free");',
    howTo:
      'Conditional assign: if("out", condition, thenValue, elseValue).\nCondition is truthy if non-empty / non-zero / not false.',
  },
  {
    id: 'each',
    action: 'each',
    label: 'each',
    category: 'logic',
    hint: 'each(source, "item", "index")',
    template: 'each(items, "item", "index");',
    howTo:
      'Loop helper: prepares length and last item/index vars.\nFor transforming every element, prefer array("out", "map", items, "item * 2").\nFor filtering, use array("out", "filter", ...).',
  },

  // ── Navigation ──
  {
    id: 'navigate',
    action: 'navigate',
    label: 'navigate',
    category: 'navigation',
    hint: 'navigate("/path")',
    template: 'navigate("/list");',
    howTo: 'Go to an internal path or #hash. In preview, switches page path.',
  },
  {
    id: 'openUrl',
    action: 'openUrl',
    label: 'openUrl',
    category: 'navigation',
    hint: 'openUrl("url", "_blank")',
    template: 'openUrl("https://example.com", "_blank");',
    howTo: 'Open an external URL. Second arg: "_blank" or "_self".',
  },

  // ── DOM ──
  {
    id: 'scrollTo',
    action: 'scrollTo',
    label: 'scrollTo',
    category: 'dom',
    hint: 'scrollTo("elementId")',
    template: 'scrollTo("section-id");',
    howTo: 'Scroll to an element by HTML id.',
  },
  {
    id: 'submitForm',
    action: 'submitForm',
    label: 'submitForm',
    category: 'dom',
    hint: 'submitForm("formId")',
    template: 'submitForm("form-id");',
    howTo: 'Call requestSubmit() on a <form id="...">.',
  },
  {
    id: 'toggleVisibility',
    action: 'toggleVisibility',
    label: 'toggleVisibility',
    category: 'dom',
    hint: 'toggleVisibility("elementId")',
    template: 'toggleVisibility("element-id");',
    howTo: 'Toggle the Tailwind "hidden" class on an element.',
  },

  // ── Debug ──
  {
    id: 'log',
    action: 'log',
    label: 'log',
    category: 'debug',
    hint: 'log(value)',
    template: 'log("debug step");',
    howTo: 'Print to the browser console: log("msg") or log(myVar).',
  },
  {
    id: 'custom',
    action: 'custom',
    label: 'custom',
    category: 'debug',
    hint: 'custom({ ... })',
    template: 'custom({"note": "todo"});',
    howTo: 'Pass a JSON object to a no-op/custom logger (extend later).',
  },
  {
    id: 'handleClick',
    action: 'handleClick',
    label: 'handleClick',
    category: 'debug',
    hint: 'handleClick()',
    template: 'handleClick();',
    howTo: 'Debug stub that logs a click in the console.',
  },
]
