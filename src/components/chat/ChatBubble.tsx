'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Check, Code2, User } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';

/** Props for the ChatBubble message component. */
interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

/**
 * A flattened, render-ready slice of a message: user text, markdown text,
 * reasoning/thought content, or a tool invocation part.
 */
interface Segment {
  type: string;
  content?: string;
  part?: any;
  key: string;
}

/**
 * Renders a single chat message as a bubble row: avatar, optional streaming
 * states, markdown body, thinking accordions, and tool call cards.
 *
 * @param message - The message to render; user text is pulled from `parts`,
 *   assistant content is split into text/reasoning/tool segments.
 * @param isStreaming - True for the in-flight assistant message; drives glow,
 *   shimmer, caret, and thinking animations.
 * @param onOpenDrawer - Opens the workspace file drawer from tool call cards.
 */
function ChatBubble({ message, isStreaming, onOpenDrawer }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  /**
   * Copies a code snippet to the clipboard and flashes a temporary "Copied"
   * confirmation on the matching snippet button.
   *
   * @param codeText - The raw code to copy.
   * @param id - The snippet id used to highlight the button that was clicked.
   */
  const handleCopyCodeSnippet = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Flatten the raw message into render-ready segments (user text, markdown
  // text, reasoning, tool invocations) so each part can be rendered by its
  // own sub-component below.
  const segments: Segment[] = React.useMemo(() => {
    if (isUser) {
      // User bubbles show a single combined bubble: join every text part.
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

    // Legacy messages without parts fall back to the raw content string.
    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      const text = typeof (message as any).content === 'string' ? (message as any).content : '';
      return text ? [{ type: 'text', content: text, key: 'text-0' }] : [];
    }

    const result: Segment[] = [];
    let currentText = '';

    // Detect tool invocations and reasoning/thought parts across both the
    // streaming parts schema and legacy shape variants.
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

    // Last resort: render the raw content string if segmentation produced nothing.
    if (result.length === 0 && typeof (message as any).content === 'string' && (message as any).content) {
      result.push({ type: 'text', content: (message as any).content, key: 'text-fallback' });
    }

    return result;
  }, [message, isUser]);

  // Memoize custom markdown components so ReactMarkdown does not tear down DOM nodes on every token render.
  const markdownComponents = React.useMemo(
    () => ({
      h1: ({ children }: any) => (
        <h1 className="text-title font-display font-bold text-text-bright mt-3 mb-2 border-b border-edge-raised/80 pb-1.5 flex items-center gap-2">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-heading font-display font-bold text-primary/90 mt-3 mb-1.5 tracking-wide">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-subheading font-semibold text-text-primary mt-2 mb-1">
          {children}
        </h3>
      ),
      p: ({ children }: any) => <p className="text-body mb-2.5 leading-relaxed last:mb-0">{children}</p>,
      ul: ({ children }: any) => (
        <ul className="list-disc list-inside space-y-1.5 mb-3 text-text-secondary">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal list-inside space-y-1.5 mb-3 text-text-secondary">
          {children}
        </ol>
      ),
      li: ({ children }: any) => <li className="text-body leading-relaxed">{children}</li>,
      strong: ({ children }: any) => (
        <strong className="font-semibold text-text-bright">{children}</strong>
      ),
      code: ({ className, children, ...props }: any) => {
        const isInline = !className;
        const rawCode = String(children).replace(/\n$/, '');
        const snippetId = `snippet-${rawCode.slice(0, 15)}`;

        if (isInline) {
          return (
            <code className="bg-surface-elevated/90 text-primary font-mono px-1.5 py-0.5 rounded text-micro border border-edge-hover/60" {...props}>
              {children}
            </code>
          );
        }
        return (
          <div className="my-2.5 rounded-xl bg-surface-base border border-edge-raised/80 overflow-hidden font-mono text-micro shadow-sm">
            <div className="bg-surface-raised/90 px-3 py-1.5 border-b border-edge-raised text-micro text-text-muted font-semibold uppercase tracking-wider flex items-center justify-between">
              <span className="text-text-muted">Code Snippet</span>
              <button
                onClick={() => handleCopyCodeSnippet(rawCode, snippetId)}
                className="flex items-center gap-1 text-micro text-text-muted hover:text-primary transition-colors cursor-pointer"
              >
                {copiedCodeId === snippetId ? (
                  <>
                    <Check className="w-3 h-3 text-primary" />
                    <span className="text-primary">Copied</span>
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
      table: ({ children }: any) => (
        <div className="overflow-x-auto my-3 rounded-xl border border-edge-raised/80 bg-surface-base/40">
          <table className="min-w-full text-caption text-left text-text-secondary">{children}</table>
        </div>
      ),
      th: ({ children }: any) => (
        <th className="bg-surface-elevated/70 px-3 py-2 border-b border-edge-raised font-semibold text-text-primary">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="px-3 py-2 border-b border-edge-raised/40 hover:bg-surface-hover/20">{children}</td>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-primary/60 pl-3 my-2 text-text-muted italic text-caption">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3.5 border-edge-raised" />,
    }),
    [copiedCodeId],
  );

  return (
    <div
      className={`group relative flex items-start gap-3.5 ${
        isUser ? 'flex-row-reverse' : ''
      } ${!isUser ? 'fade-in' : ''}`}
    >
      {/* Avatar Container: hidden on mobile (< sm) to give messages maximum width */}
      <div
        className={`
          hidden sm:flex relative w-8 h-8 rounded-xl items-center justify-center text-label font-semibold shrink-0 mt-0.5
          transition-all duration-500
          ${
            isUser
              ? 'bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-sm'
              : `bg-gradient-to-tr from-primary to-secondary text-surface
                 ${isStreaming ? 'shadow-glow-primary scale-[1.03]' : 'shadow-card'}`
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-text-secondary" />
        ) : (
          <StrataIcon className="w-4.5 h-4.5 text-surface" />
        )}

        {!isUser && isStreaming && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-primary/40 animate-ping opacity-40" />
        )}
      </div>

      <div
        className={`
          flex flex-col min-w-0 gap-2
          ${isUser ? 'items-end w-fit max-w-[88%] sm:max-w-[78%] ms-auto' : 'items-start w-full max-w-full sm:max-w-[88%]'}
        `}
      >
        {/* Empty streaming state before first tokens */}
        {!isUser && isStreaming && segments.length === 0 && (
          <div className="rounded-2xl px-4.5 py-3.5 bg-surface-overlay/70 border border-edge-raised/60 backdrop-blur-sm fade-in w-fit">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}

        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;

          if (seg.type === 'user-text') {
            return (
              <div
                key={seg.key}
                className="relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all bg-primary text-surface border border-primary rounded-tr-xs shadow-card fade-in w-fit max-w-full"
              >
                <p className="whitespace-pre-wrap leading-relaxed">{seg.content}</p>
              </div>
            );
          }

          if (seg.type === 'reasoning' && seg.content) {
            return <ThoughtAccordion key={seg.key} text={seg.content} isThinking={isStreaming && isLastSegment} />;
          }

          if (seg.type === 'tool') {
            return <ToolCallCard key={seg.key} part={seg.part} onOpenDrawer={onOpenDrawer} />;
          }

          if (seg.type === 'text' && seg.content) {
            const isStreamingActiveSegment = isStreaming && isLastSegment;
            return (
              <div
                key={seg.key}
                className={`
                  relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed
                  transition-all duration-300 fade-in
                  bg-surface-overlay/90 border border-edge-raised text-text-primary rounded-tl-xs
                  shadow-md backdrop-blur-sm w-full max-w-full
                  ${isStreamingActiveSegment ? 'shadow-glow-primary' : ''}
                `}
              >
                {/* Streaming glow: shimmer sweep across the newest text bubble */}
                {isStreamingActiveSegment && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
                  </div>
                )}

                <div className="text-body text-text-primary leading-relaxed relative">
                  {isStreamingActiveSegment ? (
                    <p className="whitespace-pre-wrap leading-relaxed font-sans">
                      {seg.content}
                      <span className="inline-block w-[1.5px] h-[1.05em] ml-0.5 -mb-0.5 bg-primary/90 rounded-full animate-caret align-text-bottom" />
                    </p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {seg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

export default React.memo(ChatBubble);