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
        // 标题
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-600">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-white mt-3 mb-2">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-slate-200 mt-2 mb-1">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-slate-300 mt-2 mb-1">
            {children}
          </h4>
        ),
        // 段落
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed text-slate-200">
            {children}
          </p>
        ),
        // 粗体
        strong: ({ children }) => (
          <strong className="font-bold text-white">
            {children}
          </strong>
        ),
        // 斜体
        em: ({ children }) => (
          <em className="italic text-slate-300">
            {children}
          </em>
        ),
        // 删除线
        del: ({ children }) => (
          <del className="line-through text-slate-500">
            {children}
          </del>
        ),
        // 无序列表
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-0.5 text-slate-200">
            {children}
          </ul>
        ),
        // 有序列表
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-0.5 text-slate-200">
            {children}
          </ol>
        ),
        // 列表项
        li: ({ children }) => (
          <li className="text-sm leading-relaxed">
            {children}
          </li>
        ),
        // 代码块
        pre: ({ children }) => (
          <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 my-2 overflow-x-auto">
            {children}
          </pre>
        ),
        // 行内代码
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <code className="text-xs font-mono text-green-300 block">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-slate-700/60 text-amber-300 px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          );
        },
        // 引用块
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-500 pl-3 py-1 my-2 bg-slate-700/30 rounded-r text-slate-300 text-sm italic">
            {children}
          </blockquote>
        ),
        // 表格
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-sm border-collapse border border-slate-600 rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-700 text-slate-200">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="bg-slate-800/50 text-slate-300">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-slate-700 last:border-0">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-xs">
            {children}
          </td>
        ),
        // 水平分割线
        hr: () => (
          <hr className="my-3 border-slate-600" />
        ),
        // 链接
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
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
