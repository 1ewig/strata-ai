'use client';

import { useState, useRef, useCallback } from 'react';
import { readUIMessageStream, parseJsonEventStream, uiMessageChunkSchema } from 'ai';
import { WorkspaceFile } from '@/lib/schemas';
import { RateLimitData, QuotaError } from '@/contexts/RateLimitContext';
import { reconcileFinishedStep } from '@/lib/ai/chat-reconciler';
import { buildQuotaError } from '@/lib/limits';

/** Parameters required by the `useCompaction` hook. */
export interface UseCompactionParams {
  chatId: string;
  userId?: string;
  filesRef: React.RefObject<WorkspaceFile[]>;
  modelRef: React.RefObject<string>;
  thinkingLevelRef: React.RefObject<string | undefined>;
  chatRef: React.RefObject<any>;
  continuationCountRef: React.RefObject<number>;
  sendMessageRef: React.RefObject<((msg: { text: string }) => void) | null>;
  updateRateLimitData: (data: Partial<RateLimitData>) => void;
  setQuotaError: React.Dispatch<React.SetStateAction<QuotaError | null>>;
}

/** Return interface of `useCompaction`. */
export interface UseCompactionReturn {
  isCompacting: boolean;
  triggerCompaction: (messagesToCompact: any[]) => Promise<void>;
}

/**
 * Stamps context-compaction metadata onto a message so the rest of the application
 * (and future prompt slicing) recognizes it as a compaction distillation anchor.
 */
function withCompactionMetadata(msg: any, modelId?: string) {
  return {
    ...msg,
    metadata: {
      ...(msg?.metadata || {}),
      isCompactedSummary: true,
      modelId,
    },
  };
}

/**
 * Custom hook encapsulating context-compaction streaming, SSE parsing,
 * rate-limit syncing, and reconciliation for a chat session.
 */
export function useCompaction({
  chatId,
  userId,
  filesRef,
  modelRef,
  thinkingLevelRef,
  chatRef,
  continuationCountRef,
  sendMessageRef,
  updateRateLimitData,
  setQuotaError,
}: UseCompactionParams): UseCompactionReturn {
  const [isCompacting, setIsCompacting] = useState(false);
  const isCompactingRef = useRef(false);

  /**
   * Executes the manual context compaction stream against /api/agent/compact,
   * streams the summary (including reasoning and markdown) into the conversation, and reconciles into Dexie.
   */
  const triggerCompaction = useCallback(
    async (messagesToCompact: any[]) => {
      if (isCompactingRef.current || !chatId || messagesToCompact.length === 0) return;

      isCompactingRef.current = true;
      setIsCompacting(true);

      const activeModel = modelRef.current;
      const compactionMessageId = `compact-${Date.now()}`;
      const initialCompactionMsg = withCompactionMetadata(
        {
          id: compactionMessageId,
          role: 'assistant',
          content: '',
          parts: [],
        },
        activeModel,
      );

      // Append initial compaction message to UI messages list so it renders live
      chatRef.current?.setMessages([...messagesToCompact, initialCompactionMsg]);

      try {
        const res = await fetch('/api/agent/compact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // History pruning to the latest compaction summary happens server-side.
            messages: messagesToCompact,
            files: filesRef.current,
            model: activeModel,
            thinkingLevel: thinkingLevelRef.current,
          }),
        });

        const rem5h = res.headers.get('X-RateLimit-Remaining-5h');
        const remWeek = res.headers.get('X-RateLimit-Remaining-Week');
        const retryHeader = res.headers.get('X-RateLimit-Retry-After') || res.headers.get('Retry-After');
        const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : undefined;

        const num5h = rem5h !== null ? parseInt(rem5h, 10) : undefined;
        const numWeek = remWeek !== null ? parseInt(remWeek, 10) : undefined;

        if (num5h !== undefined && numWeek !== undefined) {
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
              buildQuotaError(num5h ?? 0, numWeek ?? 0)?.message ||
              'Usage quota reached. Please try again later.',
            retryAfter: retryAfterSec || data?.retryAfter,
          });
          chatRef.current?.setMessages(messagesToCompact);
          return;
        }

        if (!res.ok || !res.body) {
          const data = await res.clone().json().catch(() => null);
          const detailMsg = data?.error || data?.message || `HTTP ${res.status}`;
          throw new Error(`[Compaction Error] ${detailMsg}`);
        }

        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        }).pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.success) {
                controller.enqueue(chunk.value);
              }
            },
          }),
        );

        let latestCompactionMsg: any = initialCompactionMsg;

        for await (const uiMessage of readUIMessageStream({ stream: chunkStream })) {
          latestCompactionMsg = withCompactionMetadata(
            {
              ...uiMessage,
              id: compactionMessageId,
              role: 'assistant',
            },
            activeModel,
          );

          chatRef.current?.setMessages([...messagesToCompact, latestCompactionMsg]);
        }

        const finalCompactionMsg = withCompactionMetadata(latestCompactionMsg, activeModel);
        const allWithCompaction = [...messagesToCompact, finalCompactionMsg];
        chatRef.current?.setMessages(allWithCompaction);

        await reconcileFinishedStep({
          chatId,
          userId,
          message: finalCompactionMsg,
          allMessages: allWithCompaction,
          finishReason: 'stop',
          continuationCountRef,
          sendMessageRef,
        });
      } catch (err) {
        console.error('[useCompaction] Compaction failed:', err);
        chatRef.current?.setMessages(messagesToCompact);
      } finally {
        isCompactingRef.current = false;
        setIsCompacting(false);
      }
    },
    [
      chatId,
      userId,
      filesRef,
      modelRef,
      thinkingLevelRef,
      chatRef,
      continuationCountRef,
      sendMessageRef,
      updateRateLimitData,
      setQuotaError,
    ],
  );

  return {
    isCompacting,
    triggerCompaction,
  };
}
