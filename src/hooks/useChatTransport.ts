'use client';

import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';

/** Ref-based inputs passed by the parent session hook, so the transport can read latest values without re-creating itself. */
interface UseChatTransportParams {
  filesRef: React.RefObject<any>;
  modelRef: React.RefObject<string>;
  thinkingLevelRef: React.RefObject<string>;
  chatRef: React.RefObject<any>;
  updateRateLimitData: (data: any) => void;
  setQuotaError: (data: any) => void;
}

/**
 * Builds the memoized streaming transport for the chat agent endpoint.
 * Reads live values through refs (never re-created when they change) and parses
 * rate-limit headers from every response, reporting quota state to the context.
 */
export function useChatTransport({
  filesRef,
  modelRef,
  thinkingLevelRef,
  chatRef,
  updateRateLimitData,
  setQuotaError,
}: UseChatTransportParams) {
  /* eslint-disable react-hooks/refs */
  return useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent',
        body: () => ({
          model: modelRef.current,
          thinkingLevel: thinkingLevelRef.current,
          files: filesRef.current,
        }),
        fetch: async (url, options) => {
          const res = await fetch(url, options);
          // Rate-limit state is returned on every response; surface it to the global quota context
          const rem5h = res.headers.get('X-RateLimit-Remaining-5h');
          const remWeek = res.headers.get('X-RateLimit-Remaining-Week');
          const retryHeader = res.headers.get('X-RateLimit-Retry-After') || res.headers.get('Retry-After');
          const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : undefined;

          if (rem5h !== null && remWeek !== null) {
            const num5h = parseInt(rem5h, 10);
            const numWeek = parseInt(remWeek, 10);
            updateRateLimitData({
              remaining5h: num5h,
              remainingWeek: numWeek,
              retryAfter: retryAfterSec,
            });
          }

          if (res.status === 429) {
            const data = await res.clone().json().catch(() => null);
            setQuotaError({
              message: data?.message || 'Usage quota reached (10 msgs per 5 hours, 50 msgs per week). Please try again later.',
              retryAfter: retryAfterSec || data?.retryAfter,
            });
            // Stop the in-flight stream on the next tick so the partial message is dropped
            setTimeout(() => {
              if (chatRef.current?.stop) {
                chatRef.current.stop();
              }
            }, 0);
          } else if (!res.ok) {
            const data = await res.clone().json().catch(() => null);
            const detailMsg = data?.error || data?.message || `HTTP ${res.status}`;
            throw new Error(`[API Error ${res.status}] ${detailMsg}`);
          }
          return res;
        },
      }),
    [updateRateLimitData, setQuotaError, chatRef, filesRef, modelRef, thinkingLevelRef],
  );
  /* eslint-enable react-hooks/refs */
}
