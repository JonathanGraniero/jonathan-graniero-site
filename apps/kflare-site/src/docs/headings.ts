import GithubSlugger from 'github-slugger';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/**
 * The guide's headings with the ids rehype-slug gives them: both slug the
 * heading's text with github-slugger, in document order.
 */
export function headings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  let fence = '';
  for (const line of markdown.split('\n')) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker && (!fence || marker.startsWith(fence))) {
      fence = fence ? '' : marker;
      continue;
    }
    const heading = fence ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading?.[1] || !heading[2]) continue;
    const text = heading[2]
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\*/g, '');
    out.push({ depth: heading[1].length, text, id: slugger.slug(text) });
  }
  return out;
}
