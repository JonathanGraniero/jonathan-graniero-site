import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination.ts';
import { toSearch } from './api.ts';
import { formatRange } from './format.ts';
import { extractToc } from './toc.ts';

describe('extractToc', () => {
  it('collects h2/h3 with ids matching rehype-slug, skipping code fences', () => {
    const md = [
      '# Title',
      '## Getting `started`',
      '```md',
      '## not a heading',
      '```',
      '### Deep [link](/x)',
      '## Getting started',
    ].join('\n');
    expect(extractToc(md)).toEqual([
      { id: 'getting-started', text: 'Getting started', depth: 2 },
      { id: 'deep-link', text: 'Deep link', depth: 3 },
      { id: 'getting-started-1', text: 'Getting started', depth: 2 },
    ]);
  });
});

describe('pageWindow', () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [5, 10, [1, '…', 4, 5, 6, '…', 10]],
    [1, 10, [1, 2, '…', 10]],
  ])('page %i of %i', (page, total, expected) => {
    expect(pageWindow(page, total)).toEqual(expected);
  });
});

describe('formatRange', () => {
  it('formats a finished role with duration', () => {
    expect(formatRange('2021-06-01T00:00:00Z', '2024-02-28T00:00:00Z')).toBe(
      'Jun 2021 — Feb 2024 · 2 yrs 9 mos',
    );
  });
  it('formats a current role', () => {
    expect(formatRange('2024-03-01T00:00:00Z', null, new Date('2024-03-15T00:00:00Z'))).toBe(
      'Mar 2024 — Present · 1 mo',
    );
  });
});

describe('toSearch', () => {
  it('drops empty values', () => {
    expect(toSearch({ page: 2, tag: undefined, q: '' })).toBe('?page=2');
    expect(toSearch({})).toBe('');
  });
});
