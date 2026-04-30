import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownFlow: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-body text-[var(--c-text)]">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props: any) {
            const { children, className, node, ...rest } = props;
            return (
              <code className={`${className} bg-gray-100 px-1.5 py-0.5 rounded text-sm text-indigo-700 font-mono`} {...rest}>
                {children}
              </code>
            );
          },
          h1: ({children}) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
          p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
          li: ({children}) => <li className="mb-1">{children}</li>,
          a: ({href, children}) => <a href={href} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{children}</blockquote>,
          pre: ({children}) => <pre className="bg-slate-800 text-slate-50 p-4 rounded-xl overflow-x-auto shadow-inner my-4 text-sm font-mono">{children}</pre>
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
