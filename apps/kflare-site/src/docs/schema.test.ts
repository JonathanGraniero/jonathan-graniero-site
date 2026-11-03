import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { annotatedExample, flatten, ownRules, type Schema } from './schema.ts';

const spec: Schema = {
  type: 'object',
  required: ['zoneRef', 'type'],
  'x-kubernetes-validations': [
    { rule: 'has(self.content) != has(self.data)', message: 'set exactly one of content and data' },
  ],
  properties: {
    zoneRef: {
      type: 'object',
      description: 'The Zone the record\nbelongs to.\n\nImmutable.',
      required: ['name'],
      properties: { name: { type: 'string', default: '' } },
      'x-kubernetes-validations': [{ rule: 'self == oldSelf', message: 'zoneRef is immutable' }],
    },
    type: { type: 'string', enum: ['A', 'CNAME'] },
    mode: { type: 'string', enum: ['fast', 'slow', 'off'] },
    ttl: { type: 'integer', minimum: 30, maximum: 86400 },
    content: { type: 'string', maxLength: 255, pattern: '^\\S+$' },
    data: { type: 'object', 'x-kubernetes-preserve-unknown-fields': true },
    port: { 'x-kubernetes-int-or-string': true },
    released: { type: 'string' },
    script: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    labels: { type: 'object', additionalProperties: { type: 'string' } },
    bindings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          plainText: { type: 'string' },
          // Kubernetes defaults a reference's name to "".
          secretRef: {
            type: 'object',
            properties: { name: { type: 'string', default: '' }, key: { type: 'string' } },
          },
        },
      },
    },
  },
};

const sample = {
  apiVersion: 'kflare.dev/v1alpha1',
  kind: 'DNSRecord',
  metadata: { name: 'www' },
  spec: {
    zoneRef: { name: 'my-zone' },
    type: 'A',
    content: '192.0.2.1',
    released: '2024-09-23',
    script: 'export default {\n  fetch() {},\n};\n',
    bindings: [{ name: 'GREETING', plainText: 'Hello' }],
  },
};
const other = { kind: 'DNSRecord', spec: { data: { weight: 1, port: 443 } } };

/** Every path under an object, as flatten writes them. */
function paths(value: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => paths(v, `${prefix}[]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      if (k !== 'data') paths(v, path, out);
    }
  }
  return out;
}

const uncomment = (yaml: string) => yaml.replace(/^(\s*)# /gm, '$1');

describe('flatten', () => {
  const fields = flatten(spec);
  const field = (path: string) => fields.find((f) => f.path === path);

  it('lists every field, parents first, with list items and nested objects', () => {
    expect(fields.map((f) => f.path)).toEqual([
      'zoneRef',
      'zoneRef.name',
      'type',
      'mode',
      'ttl',
      'content',
      'data',
      'port',
      'released',
      'script',
      'tags',
      'labels',
      'bindings',
      'bindings[].name',
      'bindings[].plainText',
      'bindings[].secretRef',
      'bindings[].secretRef.name',
      'bindings[].secretRef.key',
    ]);
    expect(field('bindings[].secretRef.key')?.depth).toBe(2);
  });

  it('names types the way kubectl explain does', () => {
    expect(field('zoneRef')?.type).toBe('object');
    expect(field('data')?.type).toBe('object (any fields)');
    expect(field('port')?.type).toBe('integer or string');
    expect(field('tags')?.type).toBe('[]string');
    expect(field('bindings')?.type).toBe('[]object');
    expect(field('labels')?.type).toBe('map[string]string');
  });

  it('reads required, defaults, allowed values, limits and rules', () => {
    expect(field('zoneRef')).toMatchObject({ required: true, immutable: true, rules: [] });
    expect(field('zoneRef.name')).toMatchObject({ required: true, default: '' });
    expect(field('bindings[].name')?.required).toBe(true);
    expect(field('content')?.required).toBe(false);
    expect(field('type')?.values).toEqual(['A', 'CNAME']);
    expect(field('ttl')?.limits).toEqual(['at least 30 and at most 86400']);
    expect(field('content')?.limits).toEqual(['at most 255 characters', 'matches `^\\S+$`']);
    expect(field('tags')?.limits).toEqual(['at most 10 items']);
    expect(ownRules(spec)).toEqual(['set exactly one of content and data']);
  });

  it('rejoins wrapped description lines, keeping paragraphs', () => {
    expect(field('zoneRef')?.description).toBe('The Zone the record belongs to.\n\nImmutable.');
  });
});

describe('annotatedExample', () => {
  const example = annotatedExample(sample, [other], spec);

  it('applies as the sample: the live lines are exactly its fields', () => {
    expect(parse(example)).toEqual(sample);
  });

  it('shows every field once uncommented', () => {
    const shown = paths(parse(uncomment(example)).spec);
    for (const f of flatten(spec)) expect(shown, f.path).toContain(f.path);
  });

  it("fills a field the sample leaves out from another sample's value", () => {
    expect(example).toContain('  # data:\n  #   weight: 1\n  #   port: 443');
  });

  it("keeps the sample's list items as written, and adds one commented item with the rest", () => {
    expect(example).toContain(
      [
        '  bindings:',
        '    - name: GREETING',
        '      plainText: Hello',
        '    # - name: GREETING',
        '    #   plainText: Hello',
        '    #   secretRef:',
        '    #     name: <name>',
        '    #     key: <key>',
      ].join('\n'),
    );
  });

  it('lists the allowed values of a commented-out field', () => {
    expect(example).toContain('  # mode: fast  # one of: fast, slow, off');
  });

  it('quotes what a YAML 1.1 parser would misread, and keeps code in a block', () => {
    expect(example).toContain('  released: "2024-09-23"');
    expect(example).toContain('  script: |\n    export default {\n      fetch() {},\n    };');
  });
});
