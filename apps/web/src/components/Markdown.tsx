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
        'prose prose-zinc max-w-none dark:prose-invert',
        'prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-a:text-accent-700 prose-a:underline-offset-2 hover:prose-a:text-accent-600 dark:prose-a:text-accent-400',
        'prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-zinc-800',
        'prose-blockquote:border-accent-500 prose-blockquote:font-normal prose-blockquote:not-italic',
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
