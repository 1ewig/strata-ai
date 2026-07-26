'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Check, Code2, User, BrainCircuit } from 'lucide-react';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import { resolveToolDisplay } from './tools/resolver';

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

interface Segment {
  type: string;
  content?: string;
  part?: any;
  key: string;
}

export default function ChatBubble({ message, isStreaming, onOpenDrawer }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCodeSnippet = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const segments: Segment[] = React.useMemo(() => {
    if (isUser) {
      let userText = '';
      if (Array.isArray(message.parts)) {
        userText = message.parts
          .filter(p => p.type === 'text' && typeof p.text === 'string')
          .map(p => p.text)
          .join('');
      }
      if (!userText && typeof (message as any).content === 'string') {
        userText = (message as any).content;
      }
      return [{ type: 'user-text', content: userText, key: 'user-text' }];
    }

    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      const text = typeof (message as any).content === 'string' ? (message as any).content : '';
      return text ? [{ type: 'text', content: text, key: 'text-0' }] : [];
    }

    const result: Segment[] = [];
    let currentText = '';

    message.parts.forEach((p, idx) => {
      const isTool =
        p.type === 'tool-invocation' ||
        p.type === 'dynamic-tool' ||
        (typeof p.type === 'string' && p.type.startsWith('tool')) ||
        (p as any).toolInvocation !== undefined;

      const isReasoning =
        p.type === 'reasoning' ||
        p.type === 'thought' ||
        p.type === 'thinking' ||
        typeof (p as any).reasoning === 'string' ||
        typeof (p as any).reasoningText === 'string';

      if (isReasoning) {
        if (currentText) {
          result.push({ type: 'text', content: currentText, key: `text-${idx}` });
          currentText = '';
        }
        const reasoningText =
          (p as any).reasoning ||
          (p as any).reasoningText ||
          (p as any).thought ||
          (p.type === 'reasoning' || p.type === 'thought' || p.type === 'thinking' ? p.text : '') ||
          '';
        if (reasoningText) {
          result.push({ type: 'reasoning', content: reasoningText, key: `reasoning-${idx}` });
        }
      } else if (isTool) {
        if (currentText) {
          result.push({ type: 'text', content: currentText, key: `text-${idx}` });
          currentText = '';
        }
        const inv = (p as any).toolInvocation || p;
        const key = inv.toolCallId || p.toolCallId || `tool-${idx}`;
        result.push({ type: 'tool', part: p, key });
      } else if (p.type === 'text' && typeof p.text === 'string') {
        currentText += p.text;
      }
    });

    if (currentText) {
      result.push({ type: 'text', content: currentText, key: `text-final` });
    }

    if (result.length === 0 && typeof (message as any).content === 'string' && (message as any).content) {
      result.push({ type: 'text', content: (message as any).content, key: 'text-fallback' });
    }

    return result;
  }, [message, isUser]);

  return (
    <div
      className={`group relative flex items-start gap-3.5 ${
        isUser ? 'flex-row-reverse' : ''
      } ${!isUser ? 'animate-in fade-in duration-500' : ''}`}
    >
      {/* Avatar Container */}
      <div
        className={`
          relative w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5
          transition-all duration-500
          ${
            isUser
              ? 'bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-sm'
              : `bg-gradient-to-tr from-emerald-600 via-emerald-500 to-cyan-400 text-surface-base
                 ${isStreaming ? 'shadow-[0_0_20px_rgba(16,185,129,0.45)] scale-[1.03]' : 'shadow-[0_0_15px_rgba(16,185,129,0.25)]'}`
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-text-secondary" />
        ) : (
          <BrainCircuit
            className={`w-4.5 h-4.5 text-surface-base stroke-[2.5] transition-transform duration-700 ${
              isStreaming ? 'animate-[spin_8s_linear_infinite]' : ''
            }`}
          />
        )}

        {!isUser && isStreaming && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/30 animate-ping opacity-40" />
        )}
      </div>

      <div className="flex flex-col max-w-[88%] min-w-0 gap-2">
        {/* Empty streaming state before first tokens */}
        {!isUser && isStreaming && segments.length === 0 && (
          <div className="rounded-2xl px-4.5 py-3.5 bg-surface-overlay/70 border border-edge-raised/60 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" />
            </div>
          </div>
        )}

        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;

          if (seg.type === 'user-text') {
            return (
              <div
                key={seg.key}
                className="relative rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed transition-all bg-emerald-950/30 border border-emerald-800/30 text-emerald-100 rounded-tr-xs shadow-sm"
              >
                <p className="whitespace-pre-wrap leading-relaxed">{seg.content}</p>
              </div>
            );
          }

          if (seg.type === 'reasoning' && seg.content) {
            return <ThoughtAccordion key={seg.key} text={seg.content} isThinking={isStreaming && isLastSegment} />;
          }

          if (seg.type === 'tool') {
            const cardProps = resolveToolDisplay(seg.part, onOpenDrawer);
            return <ToolCallCard key={seg.key} {...cardProps} />;
          }

          if (seg.type === 'text' && seg.content) {
            return (
              <div
                key={seg.key}
                className={`
                  relative rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed
                  transition-all duration-300
                  bg-surface-overlay/90 border border-edge-raised text-text-primary rounded-tl-xs
                  shadow-md backdrop-blur-sm
                  ${isStreaming && isLastSegment ? 'ring-1 ring-emerald-500/20 shadow-[0_0_24px_-6px_rgba(16,185,129,0.25)]' : ''}
                `}
              >
                {isStreaming && isLastSegment && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent" />
                  </div>
                )}

                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-text-primary leading-relaxed relative">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-base sm:text-lg font-bold text-text-bright mt-3 mb-2 border-b border-edge-raised/80 pb-1.5 flex items-center gap-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xs sm:text-sm font-bold text-text-bright mt-3 mb-1.5 text-emerald-400/90 tracking-wide uppercase">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-semibold text-text-primary mt-2 mb-1">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="mb-2.5 leading-relaxed last:mb-0">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1.5 mb-3 text-text-secondary">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1.5 mb-3 text-text-secondary">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="text-xs sm:text-sm leading-relaxed">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-text-bright">{children}</strong>
                      ),
                      code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        const rawCode = String(children).replace(/\n$/, '');
                        const snippetId = `snippet-${rawCode.slice(0, 15)}`;

                        if (isInline) {
                          return (
                            <code className="bg-surface-elevated/90 text-emerald-300 font-mono px-1.5 py-0.5 rounded text-[11px] border border-edge-hover/60" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <div className="my-2.5 rounded-xl bg-surface-base border border-edge-raised/80 overflow-hidden font-mono text-[11px] shadow-sm">
                            <div className="bg-surface-raised/90 px-3 py-1.5 border-b border-edge-raised text-[10px] text-text-muted font-semibold uppercase tracking-wider flex items-center justify-between">
                              <span className="text-text-muted">Code Snippet</span>
                              <button
                                onClick={() => handleCopyCodeSnippet(rawCode, snippetId)}
                                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-emerald-400 transition-colors cursor-pointer"
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
                            <pre className="p-3 overflow-x-auto text-text-secondary leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        );
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3 rounded-xl border border-edge-raised/80 bg-surface-base/40">
                          <table className="min-w-full text-xs text-left text-text-secondary">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="bg-surface-elevated/70 px-3 py-2 border-b border-edge-raised font-semibold text-text-primary">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 border-b border-edge-raised/40 hover:bg-surface-hover/20">{children}</td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-emerald-500/60 pl-3 my-2 text-text-muted italic text-xs">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="my-3.5 border-edge-raised" />,
                    }}
                  >
                    {seg.content}
                  </ReactMarkdown>
                </div>
                  {isStreaming && isLastSegment && (
                    <span className="inline-block w-[1.5px] h-[1.05em] ml-0.5 -mb-0.5 bg-emerald-400/90 rounded-full animate-caret align-text-bottom" />
                  )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}