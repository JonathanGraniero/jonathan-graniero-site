import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { CodeBlock } from './CodeBlock.tsx';

const components: Components = {
  // Fenced blocks are rendered by CodeBlock; `pre` just passes its child through.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const lang = /language-([\w-]+)/.exec(className ?? '')?.[1];
    const text = String(children);
    const isBlock = Boolean(lang) || text.includes('\n');
    return isBlock ? (
      <CodeBlock code={text.replace(/\n$/, '')} lang={lang} />
    ) : (
      <code>{children}</code>
    );
  },
  a: ({ href = '', children }) =>
    href.startsWith('/') ? (
      <Link to={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * GitHub-flavoured markdown. Raw HTML in the source is not rendered, so
 * content can never inject script into the page.
 */
export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={clsx(
        'prose max-w-none font-serif text-[1.075rem] leading-[1.75]',
        // Theme the typography plugin through its CSS variables.
        '[--tw-prose-body:var(--ink)] [--tw-prose-headings:var(--ink)] [--tw-prose-bold:var(--ink)] [--tw-prose-links:var(--signal)] [--tw-prose-counters:var(--faint)] [--tw-prose-bullets:var(--signal)] [--tw-prose-hr:var(--line)] [--tw-prose-quotes:var(--ink)] [--tw-prose-quote-borders:var(--signal)] [--tw-prose-code:var(--ink)] [--tw-prose-th-borders:var(--line)] [--tw-prose-td-borders:var(--line)]',
        'prose-headings:scroll-mt-20 prose-headings:font-sans prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h3:text-base',
        "prose-h2:before:text-signal prose-h2:before:content-['##_'] prose-h3:before:text-signal prose-h3:before:content-['###_']",
        'prose-a:underline-offset-4 hover:prose-a:decoration-2',
        'prose-code:border prose-code:border-line prose-code:bg-panel prose-code:px-1 prose-code:py-0.5 prose-code:font-code prose-code:text-[0.85em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
        'prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-dim',
        'prose-table:font-sans prose-table:text-sm prose-th:font-medium prose-th:text-faint',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
