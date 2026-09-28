import { readingTimeMinutes, slugify } from './text.ts';

describe('slugify', () => {
  it.each([
    ['Hello, World!', 'hello-world'],
    ['  Type-safe APIs with NestJS  ', 'type-safe-apis-with-nestjs'],
    ['C# & .NET', 'c-and-net'],
    ['Crème brûlée', 'creme-brulee'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('readingTimeMinutes', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

  it('never returns less than one minute', () => {
    expect(readingTimeMinutes('')).toBe(1);
    expect(readingTimeMinutes('short')).toBe(1);
  });

  it('scales with prose length at ~225 wpm', () => {
    expect(readingTimeMinutes(words(225 * 4))).toBe(4);
  });

  it('counts fenced code at half weight', () => {
    const code = '```ts\n' + words(225 * 4) + '\n```';
    expect(readingTimeMinutes(code)).toBe(2);
  });

  it('ignores markdown punctuation tokens', () => {
    expect(readingTimeMinutes(`# Title\n\n- - -\n\n${words(450)}`)).toBe(2);
  });
});
