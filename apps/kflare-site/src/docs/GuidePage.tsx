import Markdown, { type Components, type ExtraProps } from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { CodeBlock, type Lang } from '../components/Code.tsx';
import { ExternalLink } from '../components/ui.tsx';
import { Breadcrumb } from './DocsLayout.tsx';
import { headings, type Heading } from './headings.ts';
import { GUIDES, guideLink } from './links.ts';
import { SOURCE, guideSource, repoUrl } from './reference.ts';

type Node = NonNullable<ExtraProps['node']>;
type Child = Node['children'][number];

const textOf = (node: Child | Node): string =>
  node.type === 'text' ? node.value : 'children' in node ? node.children.map(textOf).join('') : '';

const LANGS: Record<string, Lang> = {
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'sh',
  bash: 'sh',
  shell: 'sh',
  console: 'sh',
};

function components(file: string): Components {
  return {
    a: ({ href = '', children }) => {
      const link = guideLink(href, file);
      return link.external ? (
        <a href={link.href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <a href={link.href}>{children}</a>
      );
    },
    pre: ({ node }) => {
      const code = node?.children.find((c) => c.type === 'element' && c.tagName === 'code');
      const classes = code?.type === 'element' ? code.properties.className : undefined;
      const lang = Array.isArray(classes)
        ? classes
            .map(String)
            .find((c) => c.startsWith('language-'))
            ?.slice('language-'.length)
        : undefined;
      return (
        <div className="not-prose my-6">
          <CodeBlock
            code={textOf(code ?? node ?? { type: 'text', value: '' }).replace(/\n$/, '')}
            lang={LANGS[lang ?? ''] ?? 'text'}
            title={lang ?? 'text'}
          />
        </div>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    ),
  };
}

function Contents({ items }: { items: Heading[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((h) => (
        <li key={h.id}>
          <a href={`#${h.id}`} className="text-dim hover:text-accent">
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** One of kflare's guides, rendered from its markdown at the release the docs describe. */
export function GuidePage({ name }: { name: keyof typeof GUIDES }) {
  const { file } = GUIDES[name];
  const source = guideSource(name);
  const sections = headings(source).filter((h) => h.depth === 2);
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-10">
      <article className="min-w-0">
        <Breadcrumb trail={['Guides']} />
        <details className="mt-6 rounded-lg border border-line bg-panel xl:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">On this page</summary>
          <div className="border-t border-line px-4 py-4">
            <Contents items={sections} />
          </div>
        </details>
        <div className="prose-kflare prose mt-6 max-w-none prose-code:rounded prose-code:bg-accent-soft prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
            components={components(file)}
          >
            {source}
          </Markdown>
        </div>
        <p className="mt-12 border-t border-line pt-6 text-xs text-faint">
          This page is{' '}
          <ExternalLink href={repoUrl(file)} className="font-mono hover:text-accent">
            {file}
          </ExternalLink>{' '}
          from kflare {SOURCE.tag}.
        </p>
      </article>
      <aside className="hidden xl:block">
        <div className="sticky top-15 max-h-[calc(100dvh-3.75rem)] overflow-y-auto py-2">
          <p className="text-xs font-semibold tracking-wider text-faint uppercase">On this page</p>
          <div className="mt-3">
            <Contents items={sections} />
          </div>
        </div>
      </aside>
    </div>
  );
}
