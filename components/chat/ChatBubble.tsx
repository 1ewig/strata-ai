'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Check, Code2, User, BrainCircuit } from 'lucide-react';
import ToolCallCard from './ToolCallCard';

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenResumeDrawer?: () => void;
}

export default function ChatBubble({ message, isStreaming, onOpenResumeDrawer }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

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

  const handleCopyCodeSnippet = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className={`group relative flex items-start gap-3.5 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar Container */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5 transition-transform ${
          isUser
            ? 'bg-zinc-800 border border-zinc-700/60 text-zinc-200 shadow-sm'
            : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-cyan-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-zinc-300" /> : <BrainCircuit className="w-4.5 h-4.5 text-zinc-950 stroke-[2.5]" />}
      </div>

      <div className="flex flex-col max-w-[88%] min-w-0 gap-2">
        {textContent && (
          <div
            className={`relative rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed transition-all ${
              isUser
                ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-100 rounded-tr-xs shadow-sm'
                : 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 rounded-tl-xs shadow-md backdrop-blur-sm'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
            ) : (
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-zinc-200 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-base sm:text-lg font-bold text-zinc-100 mt-3 mb-2 border-b border-zinc-800/80 pb-1.5 flex items-center gap-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xs sm:text-sm font-bold text-zinc-100 mt-3 mb-1.5 text-emerald-400/90 tracking-wide uppercase">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-semibold text-zinc-200 mt-2 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-2.5 leading-relaxed">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1.5 mb-3 text-zinc-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1.5 mb-3 text-zinc-300">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-xs sm:text-sm leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-zinc-100">{children}</strong>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      const rawCode = String(children).replace(/\n$/, '');
                      const snippetId = `snippet-${rawCode.slice(0, 15)}`;

                      if (isInline) {
                        return (
                          <code className="bg-zinc-800/90 text-emerald-300 font-mono px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/50" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <div className="my-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden font-mono text-[11px] shadow-sm">
                          <div className="bg-zinc-900/90 px-3 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span className="text-zinc-400">Code Snippet</span>
                            <button
                              onClick={() => handleCopyCodeSnippet(rawCode, snippetId)}
                              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              {copiedCodeId === snippetId ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Code2 className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 overflow-x-auto text-zinc-300 leading-relaxed">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                        <table className="min-w-full text-xs text-left text-zinc-300">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-zinc-800/70 px-3 py-2 border-b border-zinc-800 font-semibold text-zinc-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border-b border-zinc-800/40 hover:bg-zinc-800/20">{children}</td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-emerald-500/60 pl-3 my-2 text-zinc-400 italic text-xs">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-3.5 border-zinc-800" />,
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            )}

            {isStreaming && (
              <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-1 animate-pulse align-text-bottom" />
            )}
          </div>
        )}

        {/* Tool Invocations */}
        {!isUser && toolParts.length > 0 && !isStreaming && (
          <div className="space-y-2 ml-0.5">
            {toolParts.map((tc: any, idx: number) => (
              <ToolCallCard
                key={idx}
                toolCall={tc}
                onOpenResumeDrawer={onOpenResumeDrawer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

