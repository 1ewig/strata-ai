'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SmoothStreamTextProps {
  /** The full accumulated text of the message segment so far. */
  text: string;
  /** Whether the message is actively streaming tokens. */
  isStreaming: boolean;
}

/**
 * Renders streaming text with a ChatGPT-style opacity/blur fade effect on newly appended tokens.
 * Splits text into static baseline prefix and animated delta token chunk for smooth visual pacing.
 */
export function SmoothStreamText({ text, isStreaming }: SmoothStreamTextProps) {
  const prevTextRef = useRef('');
  const chunkCountRef = useRef(0);
  const [streamState, setStreamState] = useState<{
    prefix: string;
    delta: string;
    key: number;
  }>({
    prefix: '',
    delta: text,
    key: 0,
  });

  useEffect(() => {
    if (!isStreaming) {
      prevTextRef.current = text;
      setStreamState({
        prefix: text,
        delta: '',
        key: chunkCountRef.current,
      });
      return;
    }

    const prev = prevTextRef.current;

    if (text.startsWith(prev) && text.length > prev.length) {
      const prefix = prev;
      const delta = text.slice(prev.length);
      chunkCountRef.current += 1;

      setStreamState({
        prefix,
        delta,
        key: chunkCountRef.current,
      });
    } else {
      // Full replacement or non-contiguous update fallback
      setStreamState({
        prefix: '',
        delta: text,
        key: chunkCountRef.current + 1,
      });
    }

    prevTextRef.current = text;
  }, [text, isStreaming]);

  if (!isStreaming) {
    return <span className="whitespace-pre-wrap leading-relaxed font-sans">{text}</span>;
  }

  return (
    <span className="whitespace-pre-wrap leading-relaxed font-sans relative inline">
      <span>{streamState.prefix}</span>
      {streamState.delta ? (
        <span key={streamState.key} className="animate-token-fade inline">
          {streamState.delta}
        </span>
      ) : null}
      <span className="inline-block w-[1.5px] h-[1.05em] ml-0.5 -mb-0.5 bg-primary/90 rounded-full animate-caret align-text-bottom" />
    </span>
  );
}

export default React.memo(SmoothStreamText);
