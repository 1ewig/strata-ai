'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Throttles high-frequency streaming message updates to the browser's display
 * refresh rate using requestAnimationFrame.
 *
 * During inference, token and tool deltas arrive at 50-100Hz from the network.
 * Updating React state on every chunk causes main-thread blocking and DOM churn.
 *
 * This hook coalesces in-flight updates so React and Markdown rendering run at
 * most once per animation frame (60Hz / 120Hz). Structural changes (new message
 * appended, stream ended, conversation switch) flush immediately with zero delay.
 *
 * @param messages - Live message array from the chat stream or Dexie.
 * @param isStreaming - Whether an assistant response is actively generating.
 * @returns Throttled message array synced with the browser paint cycle.
 */
export function useThrottledMessages<T extends { id?: string }>(
  messages: T[],
  isStreaming: boolean,
): T[] {
  const [throttledMessages, setThrottledMessages] = useState<T[]>(messages);
  const latestMessagesRef = useRef<T[]>(messages);
  const rafIdRef = useRef<number | null>(null);

  latestMessagesRef.current = messages;

  useEffect(() => {
    // Structural changes (message added/removed, conversation switch, or stream complete)
    // must flush immediately to avoid any perceived UI latency.
    const hasStructuralChange =
      messages.length !== throttledMessages.length ||
      (messages.length > 0 &&
        throttledMessages.length > 0 &&
        messages[messages.length - 1]?.id !== throttledMessages[throttledMessages.length - 1]?.id);

    if (!isStreaming || hasStructuralChange) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setThrottledMessages(messages);
      return;
    }

    // While actively streaming token content into an existing message, throttle to rAF
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setThrottledMessages(latestMessagesRef.current);
      });
    }
  }, [messages, isStreaming, throttledMessages.length, throttledMessages]);

  // Clean up any in-flight rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return throttledMessages;
}
