import type { Heading, ListItem, PhrasingContent, Root, RootContent, Table } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

// Reads kflare's README, ROADMAP and CHANGELOG for src/release/digest.ts.

const processor = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(text: string): Root {
  return processor.parse(text);
}

/** Phrasing as the site writes text: plain, with `backticks` around inline code. */
export function inlineText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      if (node.type === 'text') return node.value;
      if (node.type === 'inlineCode') return `\`${node.value}\``;
      if (node.type === 'break') return ' ';
      return 'children' in node ? inlineText(node.children) : '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export const headingText = (heading: Heading) => inlineText(heading.children);

/** The blocks under the first heading titled `title`, up to the next heading of its depth or above. */
export function section(root: Root, title: string): RootContent[] | undefined {
  const start = root.children.findIndex((n) => n.type === 'heading' && headingText(n) === title);
  const heading = root.children[start];
  if (heading?.type !== 'heading') return undefined;
  const rest = root.children.slice(start + 1);
  const end = rest.findIndex((n) => n.type === 'heading' && n.depth <= heading.depth);
  return end < 0 ? rest : rest.slice(0, end);
}

/** A table's cells as text, in the order of `columns`, which are header names; `name` is for errors. */
export function tableRows(table: Table, columns: string[], name: string): string[][] {
  const [header, ...rows] = table.children;
  const headers = header?.children.map((cell) => inlineText(cell.children)) ?? [];
  const at = columns.map((column) => headers.indexOf(column));
  if (at.includes(-1)) {
    throw new Error(`${name} has the columns ${headers.join(', ')}, not ${columns.join(', ')}`);
  }
  return rows.map((row) => at.map((i) => inlineText(row.children[i]?.children ?? [])));
}

/** A list item's first paragraph. */
export function itemText(item: ListItem): string {
  const [first] = item.children;
  return first?.type === 'paragraph' ? inlineText(first.children) : '';
}
