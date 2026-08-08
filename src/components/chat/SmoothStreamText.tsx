'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SmoothStreamTextProps {
  /** The full accumulated text of the message segment so far. */
  text: string;
  /** Whether the message is actively streaming tokens. */
  isStreaming: boolean;
  /** Custom ReactMarkdown component dictionary. */
  components?: any;
}

/**
 * Remark plugin that locates the trailing text node in the markdown AST
 * and wraps the newest delta tokens in an `animate-token-fade` span for
 * smooth, ChatGPT-style opacity & blur fade-in transitions.
 */
function createTokenFadePlugin(deltaLength: number, chunkKey: number) {
  return () => (tree: any) => {
    if (!deltaLength || deltaLength <= 0) return;

    let lastTextNode: any = null;
    let parentNode: any = null;
    let nodeIndex: number = -1;

    function walk(node: any, parent: any, index: number) {
      if (node.type === 'text') {
        lastTextNode = node;
        parentNode = parent;
        nodeIndex = index;
      }
      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          walk(node.children[i], node, i);
        }
      }
    }

    walk(tree, null, -1);

    if (lastTextNode && parentNode && nodeIndex !== -1) {
      const fullText = lastTextNode.value;
      const deltaLen = Math.min(deltaLength, fullText.length);
      const prefix = fullText.slice(0, fullText.length - deltaLen);
      const delta = fullText.slice(fullText.length - deltaLen);

      const newNodes: any[] = [];
      if (prefix) {
        newNodes.push({ type: 'text', value: prefix });
      }
      if (delta) {
        newNodes.push({
          type: 'tokenFade',
          data: {
            hName: 'span',
            hProperties: {
              className: 'animate-token-fade inline',
              key: `fade-${chunkKey}`,
            },
          },
          children: [{ type: 'text', value: delta }],
        });
      }

      parentNode.children.splice(nodeIndex, 1, ...newNodes);
    }
  };
}

/**
 * Renders live streaming Markdown with:
 * 1. Real-time GFM formatting (headings, bold, lists, inline code, and syntax blocks).
 * 2. 60ms throttled AST batching to prevent CPU spikes.
 * 3. Smooth token fade-in animation (`animate-token-fade`) on newly appended token chunks.
 * 4. A pulsing streaming caret at the active typing edge.
 */
export function SmoothStreamText({ text, isStreaming, components }: SmoothStreamTextProps) {
  const prevTextRef = useRef('');
  const chunkCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderTimeRef = useRef<number>(0);

  const [streamState, setStreamState] = useState<{
    content: string;
    deltaLength: number;
    chunkKey: number;
  }>({
    content: text,
    deltaLength: 0,
    chunkKey: 0,
  });

  useEffect(() => {
    if (!isStreaming) return;

    const prev = prevTextRef.current;
    const current = text;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    const THROTTLE_MS = 60;

    const commitUpdate = () => {
      const delta = current.length > prev.length && current.startsWith(prev)
        ? current.length - prev.length
        : current.length;
      chunkCountRef.current += 1;
      prevTextRef.current = current;
      lastRenderTimeRef.current = Date.now();

      setStreamState({
        content: current,
        deltaLength: delta,
        chunkKey: chunkCountRef.current,
      });
    };

    if (timeSinceLastRender >= THROTTLE_MS) {
      commitUpdate();
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commitUpdate();
      }, THROTTLE_MS - timeSinceLastRender);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, isStreaming]);

  // When inference finishes, render the final complete markdown string directly
  const activeContent = isStreaming ? streamState.content : text;
  const activeDeltaLength = isStreaming ? streamState.deltaLength : 0;
  const activeChunkKey = isStreaming ? streamState.chunkKey : 0;

  const plugins = useMemo(() => {
    if (!isStreaming || activeDeltaLength <= 0) {
      return [remarkGfm];
    }
    return [remarkGfm, createTokenFadePlugin(activeDeltaLength, activeChunkKey)];
  }, [isStreaming, activeDeltaLength, activeChunkKey]);

  return (
    <div className="relative">
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {activeContent}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1.05em] ml-1 -mb-0.5 bg-primary/90 rounded-full animate-caret align-text-bottom"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default React.memo(SmoothStreamText);
