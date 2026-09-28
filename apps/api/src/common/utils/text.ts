import slugifyLib from 'slugify';

const WORDS_PER_MINUTE = 225;

/** URL-safe, lowercase slug. */
export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true });
}

/**
 * Estimated reading time for markdown content. Fenced code blocks are counted
 * at half weight since readers skim them.
 */
export function readingTimeMinutes(markdown: string): number {
  const codeBlocks = markdown.match(/```[\s\S]*?```/g) ?? [];
  const prose = markdown.replace(/```[\s\S]*?```/g, ' ');
  const count = (s: string) => s.split(/\s+/).filter((w) => /\w/.test(w)).length;
  const words = count(prose) + codeBlocks.reduce((n, block) => n + count(block) / 2, 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
