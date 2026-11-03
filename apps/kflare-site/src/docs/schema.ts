import { stringify } from 'yaml';

/** The parts of a CRD's OpenAPI v3 schema that the reference reads. */
export interface Schema {
  type?: string;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: Schema | boolean;
  enum?: unknown[];
  default?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  maxProperties?: number;
  'x-kubernetes-int-or-string'?: boolean;
  'x-kubernetes-preserve-unknown-fields'?: boolean;
  'x-kubernetes-validations'?: { rule: string; message?: string }[];
}

/** One row of a reference table: a field anywhere under spec or status. */
export interface Field {
  /** From spec or status, with [] for each list: `bindings[].name`. */
  path: string;
  depth: number;
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  values?: string[];
  limits: string[];
  /** The field's validation rules, by their messages. */
  rules: string[];
  immutable: boolean;
}

const IMMUTABLE = /^self\s*==\s*oldSelf$/;

/** Go doc comments wrap at 80 columns; rejoin their lines into paragraphs. */
export function prose(text = ''): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function mapValues(schema: Schema): Schema | undefined {
  return typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined;
}

/** The type as `kubectl explain` would print it, more or less. */
export function typeName(schema: Schema): string {
  if (schema['x-kubernetes-int-or-string']) return 'integer or string';
  if (schema.type === 'array') return `[]${typeName(schema.items ?? {})}`;
  const values = mapValues(schema);
  if (values) return `map[string]${typeName(values)}`;
  if (schema.type === 'object' && !schema.properties) return 'object (any fields)';
  return schema.type ?? 'any';
}

function range(min: number | undefined, max: number | undefined, unit: string): string | null {
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (min !== undefined && max !== undefined) return `${min} to ${plural(max)}`;
  if (min !== undefined) return `at least ${plural(min)}`;
  if (max !== undefined) return `at most ${plural(max)}`;
  return null;
}

/** The schema's limits, in words. */
export function limits(schema: Schema): string[] {
  const out: string[] = [];
  const { minimum: min, maximum: max } = schema;
  if (min !== undefined || max !== undefined) {
    const low = min === undefined ? '' : `${schema.exclusiveMinimum ? 'above' : 'at least'} ${min}`;
    const high = max === undefined ? '' : `${schema.exclusiveMaximum ? 'below' : 'at most'} ${max}`;
    out.push([low, high].filter(Boolean).join(' and '));
  }
  for (const text of [
    range(schema.minLength, schema.maxLength, 'character'),
    range(schema.minItems, schema.maxItems, 'item'),
    range(schema.minProperties, schema.maxProperties, 'entry'),
  ]) {
    if (text) out.push(text);
  }
  if (schema.format && schema.format !== 'int-or-string') out.push(`format \`${schema.format}\``);
  if (schema.pattern) out.push(`matches \`${schema.pattern}\``);
  return out;
}

function validations(schema: Schema) {
  const all = [
    ...(schema['x-kubernetes-validations'] ?? []),
    ...(schema.type === 'array' ? (schema.items?.['x-kubernetes-validations'] ?? []) : []),
  ];
  return {
    immutable: all.some((v) => IMMUTABLE.test(v.rule.trim())),
    rules: all.filter((v) => !IMMUTABLE.test(v.rule.trim())).map((v) => v.message ?? v.rule),
  };
}

/** Every field under an object schema, parents before children, in schema order. */
export function flatten(schema: Schema, prefix = '', depth = 0): Field[] {
  const fields: Field[] = [];
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const path = prefix ? `${prefix}.${name}` : name;
    const element = prop.type === 'array' ? (prop.items ?? {}) : prop;
    const values = (element.enum ?? prop.enum)?.map(String);
    fields.push({
      path,
      depth,
      type: typeName(prop),
      required: (schema.required ?? []).includes(name),
      description: prose(prop.description),
      ...(prop.default !== undefined && { default: prop.default }),
      ...(values && { values }),
      limits: [...limits(prop), ...(prop.type === 'array' ? limits(element) : [])],
      ...validations(prop),
    });
    if (element.properties) {
      fields.push(...flatten(element, prop.type === 'array' ? `${path}[]` : path, depth + 1));
    }
    const entries = mapValues(prop);
    if (entries?.properties) fields.push(...flatten(entries, `${path}.<key>`, depth + 1));
  }
  return fields;
}

/** The rules a schema itself carries, by their messages (the ones on spec, say). */
export function ownRules(schema: Schema): string[] {
  return validations(schema).rules;
}

// ---------- The annotated example ----------

type Obj = Record<string, unknown>;

interface Line {
  indent: number;
  text: string;
  /** The column of the `# ` that comments the line out, if it is. */
  commentAt?: number;
}

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

// YAML 1.1 quotes strings that 1.1 parsers would read otherwise, such as a
// date: compatibilityDate: "2024-09-23".
function scalar(value: unknown): string {
  return stringify(value, { lineWidth: 0, version: '1.1' }).trimEnd();
}

/** A value for a field no sample sets: its default, first allowed value, or a placeholder. */
function placeholder(schema: Schema, name: string): unknown {
  // Kubernetes defaults a reference's name to "", which says nothing.
  if (schema.default !== undefined && schema.default !== '') return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema['x-kubernetes-int-or-string']) return 1;
  switch (schema.type) {
    case 'boolean':
      return true;
    case 'integer':
    case 'number':
      return schema.minimum ?? 1;
    case 'string':
      return schema.format === 'date-time' ? '2026-01-01T00:00:00Z' : `<${name}>`;
    default:
      return {};
  }
}

/** List items merged into one that sets what any of them sets; the first value wins. */
function merge(items: unknown[]): Obj {
  const out: Obj = {};
  for (const item of items.filter(isObj)) {
    for (const [key, value] of Object.entries(item)) {
      const held = out[key];
      if (held === undefined) out[key] = value;
      else if (isObj(held) && isObj(value)) out[key] = merge([held, value]);
    }
  }
  return out;
}

/** Whether the items set, between them, every field of their schema. */
function covers(items: Obj[], schema: Schema): boolean {
  const has = (value: unknown, segments: string[]): boolean => {
    const [segment, ...rest] = segments;
    if (segment === undefined) return value !== undefined;
    if (!isObj(value)) return false;
    if (segment === '<key>') return Object.values(value).some((v) => has(v, rest));
    const list = segment.endsWith('[]');
    const child = value[list ? segment.slice(0, -2) : segment];
    return has(list && Array.isArray(child) ? merge(child) : child, rest);
  };
  const merged = merge(items);
  return flatten(schema).every((f) => has(merged, f.path.split('.')));
}

function line(indent: number, text: string, commentAt?: number): Line {
  return commentAt === undefined ? { indent, text } : { indent, text, commentAt };
}

/** `lead` is what goes before the value: `key: ` or a list's `- `. */
function emitScalar(lead: string, value: unknown, indent: number, commentAt?: number, hint = '') {
  const [first = '', ...rest] = scalar(value).split('\n');
  // An indentation indicator (|1-) is computed for column 0; nested, it is 2.
  const header = first.replace(/^([|>])\d/, '$12');
  return [
    line(indent, `${lead}${header}${hint}`, commentAt),
    // A block scalar's lines (after | or >), which stringify puts at column 0.
    ...rest.map((text) => line(indent + 2, text, commentAt)),
  ];
}

/** A list item: a map's lines, the first one led by `- `. */
function emitItem(lines: Line[], indent: number): Line[] {
  const [first, ...rest] = lines;
  return first ? [{ ...first, indent, text: `- ${first.text}` }, ...rest] : [];
}

function emitList(
  key: string,
  value: unknown,
  element: Schema,
  indent: number,
  commentAt: number | undefined,
  extras: boolean,
): Line[] {
  if (Array.isArray(value) && value.length === 0) return [line(indent, `${key}: []`, commentAt)];
  const lines = [line(indent, `${key}:`, commentAt)];
  if (!element.properties) {
    const items = Array.isArray(value) ? value : [placeholder(element, key)];
    return [...lines, ...items.flatMap((v) => emitScalar('- ', v, indent + 2, commentAt))];
  }
  const items = Array.isArray(value) ? value.filter(isObj) : [];
  if (commentAt !== undefined) {
    // Commented out already: one item with every field.
    const all = emitMap(merge(items), element, indent + 4, commentAt, [], true);
    return [...lines, ...emitItem(all, indent + 2)];
  }
  for (const item of items) {
    lines.push(...emitItem(emitMap(item, element, indent + 4, undefined, [], false), indent + 2));
  }
  // The sample's items stay as written; one more, commented out, shows the rest.
  if (extras && !covers(items, element)) {
    const all = emitMap(merge(items), element, indent + 4, indent + 2, [], true);
    lines.push(...emitItem(all, indent + 2));
  }
  return lines;
}

function emitEntry(
  key: string,
  value: unknown,
  schema: Schema,
  indent: number,
  commentAt: number | undefined,
  alternatives: unknown[],
  extras: boolean,
): Line[] {
  if (schema.properties) {
    const map = isObj(value) ? value : undefined;
    const others = alternatives.filter(isObj);
    return [
      line(indent, `${key}:`, commentAt),
      ...emitMap(map, schema, indent + 2, commentAt, others, extras),
    ];
  }
  if (schema.type === 'array') {
    return emitList(key, value, schema.items ?? {}, indent, commentAt, extras);
  }
  const entries = mapValues(schema);
  if (entries) {
    const map = isObj(value) && Object.keys(value).length ? value : { '<key>': undefined };
    return [
      line(indent, `${key}:`, commentAt),
      ...Object.entries(map).flatMap(([k, v]) =>
        emitEntry(k, v, entries, indent + 2, commentAt, [], extras),
      ),
    ];
  }
  if (isObj(value) || (value === undefined && schema.type === 'object')) {
    // Free-form: whatever the sample holds, as YAML.
    if (!isObj(value) || Object.keys(value).length === 0) {
      return [line(indent, `${key}: {}`, commentAt)];
    }
    return [
      line(indent, `${key}:`, commentAt),
      ...scalar(value)
        .split('\n')
        .map((text) => line(indent + 2, text, commentAt)),
    ];
  }
  const shown = value ?? placeholder(schema, key);
  const choices = schema.enum ?? [];
  const hint =
    commentAt !== undefined && choices.length > 1 && choices.length <= 12
      ? `  # one of: ${choices.join(', ')}`
      : '';
  return emitScalar(`${key}: `, shown, indent, commentAt, hint);
}

/**
 * A map's entries: the sample's, as they are, then (with extras) every field
 * it leaves out, commented out and filled in from another sample or a
 * placeholder.
 */
function emitMap(
  value: Obj | undefined,
  schema: Schema,
  indent: number,
  commentAt: number | undefined,
  alternatives: Obj[],
  extras: boolean,
): Line[] {
  const props = schema.properties ?? {};
  const set = Object.keys(value ?? {}).filter((k) => value?.[k] !== undefined);
  const unset = extras ? Object.keys(props).filter((k) => !set.includes(k)) : [];
  return [...set, ...unset].flatMap((key) => {
    const others = alternatives.map((a) => a[key]).filter((v) => v !== undefined);
    const prop = props[key] ?? {};
    return set.includes(key)
      ? emitEntry(key, value?.[key], prop, indent, commentAt, others, extras)
      : emitEntry(key, others[0], prop, indent, commentAt ?? indent, others, true);
  });
}

function render(l: Line): string {
  if (l.commentAt === undefined) return ' '.repeat(l.indent) + l.text;
  return `${' '.repeat(l.commentAt)}# ${' '.repeat(l.indent - l.commentAt)}${l.text}`;
}

/**
 * A manifest that shows every field: the sample's are live, so it applies as
 * it is, and the rest are commented out, ready to uncomment. Their values come
 * from the kind's other samples where one sets them.
 */
export function annotatedExample(sample: Obj, others: Obj[], spec: Schema): string {
  const { spec: sampleSpec, ...head } = sample;
  const alternatives = others.map((o) => o.spec).filter(isObj);
  const lines = emitMap(
    isObj(sampleSpec) ? sampleSpec : undefined,
    spec,
    2,
    undefined,
    alternatives,
    true,
  );
  return `${scalar(head)}\nspec:\n${lines.map(render).join('\n')}`;
}
