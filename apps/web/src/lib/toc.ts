import GithubSlugger from 'github-slugger';

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * Extracts h2/h3 headings from markdown. Uses the same slugger as rehype-slug
 * so ids match the rendered anchors exactly.
 */
export function extractToc(markdown: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const entries: TocEntry[] = [];
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1]!.length;
    const text = match[2]!.replace(/[*_`~]|\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
    // Slug every heading (as rehype-slug does) so duplicate counters line up.
    const id = slugger.slug(text);
    if (depth === 2 || depth === 3) entries.push({ id, text, depth });
  }
  return entries;
}
