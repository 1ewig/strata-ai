'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Check, Code2, User, BrainCircuit, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import ToolCallCard from './ToolCallCard';
import { resolveToolDisplay } from './tools/resolver';

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenResumeDrawer?: () => void;
}

interface Segment {
  type: string;
  content?: string;
  part?: any;
  key: string;
}

function ThoughtAccordion({ text, isThinking }: { text: string; isThinking?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text || !text.trim()) return null;

  return (
    <div className="my-1.5 rounded-xl border border-cyan-900/40 bg-cyan-950/20 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left font-mono text-[11px] text-cyan-300 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          ) : (
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="font-semibold">{isThinking ? 'Thinking...' : 'Thought Process'}</span>
          <span className="text-[10px] text-zinc-500 font-normal">({text.length} chars)</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-zinc-800/60 text-[11px] text-zinc-300 leading-relaxed max-h-56 overflow-y-auto bg-zinc-950/90 font-mono">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 leading-relaxed text-zinc-300">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-zinc-400">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-zinc-400">{children}</ol>,
              li: ({ children }) => <li className="text-[11px] leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-cyan-300">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-zinc-900 text-cyan-200 px-1 py-0.5 rounded text-[10px] font-mono border border-zinc-800">
                  {children}
                </code>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function ChatBubble({ message, isStreaming, onOpenResumeDrawer }: ChatBubbleProps) {
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
        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;

          if (seg.type === 'user-text') {
            return (
              <div
                key={seg.key}
                className="relative rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed transition-all bg-emerald-950/40 border border-emerald-800/40 text-emerald-100 rounded-tr-xs shadow-sm"
              >
                <p className="whitespace-pre-wrap leading-relaxed">{seg.content}</p>
              </div>
            );
          }

          if (seg.type === 'reasoning' && seg.content) {
            return <ThoughtAccordion key={seg.key} text={seg.content} isThinking={isStreaming && isLastSegment} />;
          }

          if (seg.type === 'tool') {
            const cardProps = resolveToolDisplay(seg.part, onOpenResumeDrawer);
            return <ToolCallCard key={seg.key} {...cardProps} />;
          }

          if (seg.type === 'text' && seg.content) {
            return (
              <div
                key={seg.key}
                className="relative rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed transition-all bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 rounded-tl-xs shadow-md backdrop-blur-sm"
              >
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
                    {seg.content}
                  </ReactMarkdown>
                </div>
                {isStreaming && isLastSegment && (
                  <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-1 animate-pulse align-text-bottom" />
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

