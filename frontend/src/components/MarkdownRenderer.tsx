import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-extrabold text-[var(--color-text-primary)] mt-5 mb-3 pb-2 border-b border-[var(--color-border)] tracking-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-[var(--color-text-primary)] mt-4 mb-2 tracking-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-[var(--color-text-secondary)] mt-3 mb-1.5">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-[var(--color-text-muted)] mt-3 mb-1.5">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="mb-2.5 leading-relaxed text-[var(--color-text-secondary)]">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-[var(--color-text-primary)]">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--color-text-muted)]">
            {children}
          </em>
        ),
        del: ({ children }) => (
          <del className="line-through text-[var(--color-text-muted)] opacity-60">
            {children}
          </del>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2.5 space-y-1 text-[var(--color-text-secondary)]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2.5 space-y-1 text-[var(--color-text-secondary)]">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-relaxed marker:text-[var(--color-text-muted)]">
            {children}
          </li>
        ),
        pre: ({ children }) => (
          <pre className="bg-[#0e0e14] border border-[var(--color-border)] rounded-xl p-4 my-3 overflow-x-auto shadow-inner">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <code className="text-xs font-mono text-[#e8a87c] block leading-relaxed">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-[var(--surface-hover)] text-[var(--color-secondary)] px-1.5 py-0.5 rounded-md text-xs font-mono border border-[var(--color-border)]">
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-[3px] border-[var(--color-accent)] pl-4 py-1 my-3 bg-[var(--color-accent-dim)] rounded-r-lg text-[var(--color-text-secondary)] text-sm italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--surface-elevated)] text-[var(--color-text-primary)]">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-[var(--color-border)] last:border-0">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 text-left font-bold text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2.5 text-xs">
            {children}
          </td>
        ),
        hr: () => (
          <hr className="my-4 border-[var(--color-border)]" />
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:text-[var(--color-secondary)] underline underline-offset-4 decoration-[var(--color-accent)]/30 hover:decoration-[var(--color-secondary)] transition-colors font-medium"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
