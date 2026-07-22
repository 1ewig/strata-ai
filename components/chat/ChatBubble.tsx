'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Copy, Check, FileText, Code2 } from 'lucide-react';
import ToolCallCard from './ToolCallCard';

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);

  let textContent = '';
  if (Array.isArray(message.parts)) {
    textContent = message.parts
      .filter(p => p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
  }
  if (!textContent && typeof (message as any).content === 'string') {
    textContent = (message as any).content;
  }

  const toolParts = Array.isArray(message.parts)
    ? message.parts.filter(p => {
        const isTool =
          p.toolName === 'setResumeMarkdown' ||
          p.name === 'setResumeMarkdown' ||
          p.type === 'tool-invocation' ||
          p.type === 'dynamic-tool' ||
          (typeof p.type === 'string' && p.type.startsWith('tool'));
        const isDone =
          p.state === 'result' ||
          p.state === 'output-available' ||
          p.result !== undefined ||
          p.output !== undefined;
        return isTool && isDone;
      })
    : (message as any).toolCalls || [];

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(textContent);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyText = () => {
    const plainText = textContent
      .replace(/#{1,6}\s?/g, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();
    navigator.clipboard.writeText(plainText);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className={`group relative flex items-start gap-3 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5 ${
          isUser
            ? 'bg-zinc-700 text-white'
            : 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-white'
        }`}
      >
        {isUser ? 'A' : 'R'}
      </div>

      <div className="flex flex-col max-w-[88%] min-w-0 gap-2">
        {textContent && (
          <div
            className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm'
                : 'bg-zinc-900 border border-zinc-800/80 text-zinc-300 rounded-tl-sm'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{textContent}</p>
            ) : (
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-zinc-300 leading-normal">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold text-zinc-100 mt-3 mb-2 border-b border-zinc-800 pb-1">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold text-zinc-100 mt-3 mb-1.5 flex items-center gap-1.5">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-semibold text-zinc-200 mt-2 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-2.5 text-zinc-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-2.5 text-zinc-300">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-xs sm:text-sm leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-zinc-100">{children}</strong>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-zinc-800/80 text-emerald-400 font-mono px-1.5 py-0.5 rounded text-[11px]" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <div className="my-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden font-mono text-[11px]">
                          <div className="bg-zinc-900/80 px-3 py-1 border-b border-zinc-800 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>Code Snippet</span>
                          </div>
                          <pre className="p-3 overflow-x-auto text-zinc-300 leading-relaxed">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-lg border border-zinc-800">
                        <table className="min-w-full text-xs text-left text-zinc-300">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-zinc-800/60 px-3 py-2 border-b border-zinc-800 font-semibold text-zinc-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border-b border-zinc-800/60">{children}</td>
                    ),
                    hr: () => <hr className="my-3 border-zinc-800" />,
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            )}

            {isStreaming && (
              <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 animate-pulse align-text-bottom" />
            )}

            {/* AI Studio Action Toolbar on Assistant Messages */}
            {!isUser && !isStreaming && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex items-center gap-1 shadow-lg z-10 text-[11px]">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Copy Raw Markdown"
                >
                  {copiedType === 'markdown' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Code2 className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'markdown' ? 'Copied MD' : 'Copy MD'}</span>
                </button>

                <div className="w-px h-3 bg-zinc-800" />

                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Copy Plain Text"
                >
                  {copiedType === 'text' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'text' ? 'Copied Text' : 'Copy Text'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {!isUser && toolParts.length > 0 && !isStreaming && (
          <div className="space-y-2 ml-1">
            {toolParts.map((tc: any, idx: number) => (
              <ToolCallCard key={idx} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
