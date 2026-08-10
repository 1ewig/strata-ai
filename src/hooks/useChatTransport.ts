'use client';

import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';
import { QUOTA_5H_LIMIT, QUOTA_WEEK_LIMIT, buildQuotaError } from '@/lib/limits';

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
          // History pruning to the latest compaction summary is handled server-side
          // in /api/agent (shared sliceMessagesAfterCompaction), so this transport
          // stays a pure network/header layer.
          const res = await fetch(url, options);
          // Rate-limit state is returned on every response; surface it to the global quota context
          const rem5h = res.headers.get('X-RateLimit-Remaining-5h');
          const remWeek = res.headers.get('X-RateLimit-Remaining-Week');
          const retryHeader = res.headers.get('X-RateLimit-Retry-After') || res.headers.get('Retry-After');
          const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : undefined;

          // Parse header values once so both the context sync and the 429 fallback
          // agree on the remaining quantities (headers may be absent on non-stream errors).
          const num5h = rem5h !== null ? parseInt(rem5h, 10) : QUOTA_5H_LIMIT;
          const numWeek = remWeek !== null ? parseInt(remWeek, 10) : QUOTA_WEEK_LIMIT;

          if (rem5h !== null && remWeek !== null) {
            updateRateLimitData({
              remaining5h: num5h,
              remainingWeek: numWeek,
              retryAfter: retryAfterSec,
            });
          }

          if (res.status === 429) {
            const data = await res.clone().json().catch(() => null);
            setQuotaError({
              message:
                data?.message ||
                buildQuotaError(num5h, numWeek)?.message ||
                `Usage quota reached. Please try again later.`,
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
