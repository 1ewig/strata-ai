'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { Check, Code2, User, Sparkles } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import WorkGroupCard from './WorkGroupCard';
import SmoothStreamText from './SmoothStreamText';

/** Props for the ChatBubble message component. */
interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

/**
 * A flattened, render-ready slice of a message: user text, markdown text,
 * reasoning/thought content, a tool invocation part, or a work group of reasoning + tools.
 */
interface Segment {
  type: string;
  content?: string;
  part?: any;
  items?: Segment[];
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
  // text, reasoning, tool invocations, grouped work items) so each part can be
  // rendered by its own sub-component below.
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

    const rawSegments: Segment[] = [];
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
          rawSegments.push({ type: 'text', content: currentText, key: `text-${idx}` });
          currentText = '';
        }
        const reasoningText =
          (p as any).reasoning ||
          (p as any).reasoningText ||
          (p as any).thought ||
          (p.type === 'reasoning' || p.type === 'thought' || p.type === 'thinking' ? p.text : '') ||
          '';
        if (reasoningText) {
          rawSegments.push({ type: 'reasoning', content: reasoningText, key: `reasoning-${idx}` });
        }
      } else if (isTool) {
        if (currentText) {
          rawSegments.push({ type: 'text', content: currentText, key: `text-${idx}` });
          currentText = '';
        }
        const inv = (p as any).toolInvocation || p;
        const key = inv.toolCallId || p.toolCallId || `tool-${idx}`;
        rawSegments.push({ type: 'tool', part: p, key });
      } else if (p.type === 'text' && typeof p.text === 'string') {
        currentText += p.text;
      }
    });

    if (currentText) {
      rawSegments.push({ type: 'text', content: currentText, key: `text-final` });
    }

    // Last resort: render the raw content string if segmentation produced nothing.
    if (rawSegments.length === 0 && typeof (message as any).content === 'string' && (message as any).content) {
      rawSegments.push({ type: 'text', content: (message as any).content, key: 'text-fallback' });
    }

    // While streaming, render each part live and ungrouped so thoughts, tool
    // calls, and intermediate text stream in place. Grouping happens only once
    // the inference finishes (isStreaming flips false and the memo recomputes).
    if (isStreaming) {
      return rawSegments;
    }

    // Group ALL pre-answer output (intermediate text + reasoning + tool calls) into
    // a single work group so a multi-response inference reads as one compact block.
    // Only the final text segment renders as the assistant message bubble.
    const result: Segment[] = [];
    const lastSegment = rawSegments[rawSegments.length - 1];
    const hasFinalText = lastSegment?.type === 'text';
    const workItems = hasFinalText ? rawSegments.slice(0, -1) : rawSegments;

    if (workItems.length > 0) {
      result.push({ type: 'work-group', items: workItems, key: 'work-group-single' });
    }
    if (hasFinalText) {
      result.push(lastSegment);
    }

    return result;
  }, [message, isUser, isStreaming]);

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
      a: ({ href, children, ...props }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-primary/50 hover:decoration-primary font-medium transition-colors"
          {...props}
        >
          {children}
        </a>
      ),
    }),
    [copiedCodeId],
  );

  // Memoize user-specific markdown components styled for the solid primary background.
  const userMarkdownComponents = React.useMemo(
    () => ({
      h1: ({ children }: any) => (
        <h1 className="text-title font-display font-bold text-surface mt-2 mb-1.5 border-b border-surface/30 pb-1 flex items-center gap-2">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-heading font-display font-bold text-surface mt-2 mb-1 tracking-wide">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-subheading font-semibold text-surface mt-1.5 mb-0.5">
          {children}
        </h3>
      ),
      p: ({ children }: any) => <p className="text-body mb-2 leading-relaxed last:mb-0 text-surface">{children}</p>,
      ul: ({ children }: any) => (
        <ul className="list-disc list-inside space-y-1 my-1.5 text-surface/95">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal list-inside space-y-1 my-1.5 text-surface/95">
          {children}
        </ol>
      ),
      li: ({ children }: any) => <li className="text-body leading-relaxed">{children}</li>,
      strong: ({ children }: any) => (
        <strong className="font-semibold text-surface">{children}</strong>
      ),
      em: ({ children }: any) => (
        <em className="italic text-surface/90">{children}</em>
      ),
      code: ({ className, children, ...props }: any) => {
        const isInline = !className;
        const rawCode = String(children).replace(/\n$/, '');
        const snippetId = `user-snippet-${rawCode.slice(0, 15)}`;

        if (isInline) {
          return (
            <code className="bg-surface/20 text-surface font-mono px-1.5 py-0.5 rounded text-micro border border-surface/30" {...props}>
              {children}
            </code>
          );
        }
        return (
          <div className="my-2.5 rounded-xl bg-surface-base border border-edge-raised/80 overflow-hidden font-mono text-micro shadow-sm text-text-primary text-left">
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
        <div className="overflow-x-auto my-2.5 rounded-xl border border-surface/30 bg-surface/10">
          <table className="min-w-full text-caption text-left text-surface">{children}</table>
        </div>
      ),
      th: ({ children }: any) => (
        <th className="bg-surface/20 px-3 py-1.5 border-b border-surface/30 font-semibold text-surface">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="px-3 py-1.5 border-b border-surface/20 hover:bg-surface/15">{children}</td>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-surface/60 pl-3 my-2 text-surface/90 italic text-caption">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-surface/30" />,
      a: ({ href, children, ...props }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-surface/60 hover:decoration-surface transition-colors font-medium text-surface"
          {...props}
        >
          {children}
        </a>
      ),
    }),
    [copiedCodeId],
  );

  return (
    <div
      className={`group relative flex items-start gap-3.5 ${isUser ? 'flex-row-reverse animate-slide-up' : ''
        } ${!isUser ? 'fade-in' : ''}`}
    >
      {/* Avatar Container: hidden on mobile (< sm) to give messages maximum width */}
      <div
        className={`
          hidden sm:flex relative w-8 h-8 rounded-xl items-center justify-center text-label font-semibold shrink-0 mt-0.5
          transition-all duration-500
          ${isUser
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
          ${isUser ? 'items-end w-fit max-w-[90%] sm:max-w-[82%] ms-auto' : 'items-start w-fit max-w-full'}
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
                className="relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all bg-primary text-surface border border-primary rounded-tr-xs shadow-card animate-slide-up w-fit max-w-full"
              >
                <div className="text-body text-surface leading-relaxed relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={userMarkdownComponents}>
                    {seg.content || ''}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          if (seg.type === 'work-group' && seg.items && seg.items.length > 0) {
            return (
              <WorkGroupCard
                key={seg.key}
                items={seg.items}
                isStreaming={isStreaming}
                onOpenDrawer={onOpenDrawer}
              />
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
                  shadow-md backdrop-blur-sm w-fit max-w-full
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
                  {(message as any).metadata?.isCompactedSummary && (
                    <div className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-primary mb-2.5 pb-1.5 border-b border-edge-raised/70">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Context Compaction Summary</span>
                    </div>
                  )}
                  {isStreamingActiveSegment ? (
                    <SmoothStreamText
                      text={seg.content}
                      isStreaming={true}
                      components={markdownComponents}
                    />
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