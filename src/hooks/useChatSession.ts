'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  createConversation,
  updateConversationTitle,
} from '@/lib/db/db';
import { useModelSettings } from './useModelSettings';
import { useWorkspaceFiles } from './useWorkspaceFiles';
import { useChatTransport } from './useChatTransport';
import { useCompaction } from './useCompaction';
import { handleChatError } from '@/lib/ai/chat-error-handler';
import { reconcileFinishedStep } from '@/lib/ai/chat-reconciler';
import { calculateTokenMetrics, ChatMetadata } from '@/lib/token-usage';
import { getModelContextWindow } from '@/lib/models';
import { buildQuotaError } from '@/lib/limits';
import type { ProcessedImage } from '@/lib/image-utils';
import { useRateLimit } from '@/contexts/RateLimitContext';
import { useSession } from '@/lib/auth-client';

/**
 * Structural message type carrying provider-reported usage metadata. Kept loose
 * (role + metadata only) so it stays compatible with the SDK version nested
 * under @ai-sdk/react without coupling to a specific `UIMessage` generic.
 */
export interface UsageMessage {
  role?: string;
  metadata?: ChatMetadata;
}

/**
 * Orchestrator hook for a single chat session.
 * Owns the AI chat stream, model/workspace sub-hooks, Dexie persistence, and
 * quota gating, returning everything a chat page needs to render and send.
 * @param chatId - The Dexie id of the active conversation.
 * @returns Chat state, workspace/model controls, and send/quota helpers.
 */
export function useChatSession(chatId: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    rateLimitData,
    quotaError,
    updateRateLimitData,
    setQuotaError,
    clearQuotaError,
  } = useRateLimit();

  const dexieMessages = useLiveQuery(
    () => db.messages.where('chatId').equals(chatId).sortBy('timestamp'),
    [chatId],
  );

  const currentConv = useLiveQuery(
    () => db.conversations.get(chatId),
    [chatId],
  );

  // Modular specialized sub-hooks
  const modelSettings = useModelSettings(chatId, currentConv);
  const workspace = useWorkspaceFiles(chatId, currentConv);

  // Refs mirror sub-hook values so the memoized transport always reads current state
  const filesRef = useRef(workspace.files);
  const modelRef = useRef(modelSettings.model);
  const thinkingLevelRef = useRef(modelSettings.thinkingLevel);

  useEffect(() => {
    filesRef.current = workspace.files;
  }, [workspace.files]);

  useEffect(() => {
    modelRef.current = modelSettings.model;
  }, [modelSettings.model]);

  useEffect(() => {
    thinkingLevelRef.current = modelSettings.thinkingLevel;
  }, [modelSettings.thinkingLevel]);

  // Ensure conversation exists in DB
  useEffect(() => {
    if (!chatId) return;
    db.conversations.get(chatId).then((existing) => {
      if (!existing) {
        createConversation(chatId, 'New Chat', modelSettings.model, modelSettings.thinkingLevel, userId);
      }
    });
  }, [chatId, modelSettings.model, modelSettings.thinkingLevel, userId]);

  // Tracks how many times the assistant has been re-invoked for a single user turn
  const continuationCountRef = useRef<number>(0);
  const sendMessageRef = useRef<((msg: { text: string }) => void) | null>(null);
  const chatRef = useRef<any>(null);

  // Modular transport creation hook
  const transport = useChatTransport({
    filesRef,
    modelRef,
    thinkingLevelRef,
    chatRef,
    updateRateLimitData,
    setQuotaError,
  });

  // Modular context compaction hook
  const { isCompacting, triggerCompaction } = useCompaction({
    chatId,
    userId,
    filesRef,
    chatRef,
    continuationCountRef,
    sendMessageRef,
    updateRateLimitData,
    setQuotaError,
  });

  const chat = useChat({
    id: chatId,
    transport: transport as any,
    onData: useCallback(
      (dataPart: any) => {
        if (dataPart?.type === 'data-workspace' && dataPart.data) {
          const { event, file, fileId } = dataPart.data;
          if (event === 'file-updated' && file) {
            workspace.handleUpdateFile(file);
          } else if (event === 'file-deleted' && fileId) {
            workspace.handleDeleteFile(fileId);
          }
        }
      },
      [workspace],
    ),
    onError: useCallback(
      (err: Error) => {
        handleChatError({
          err,
          chatId,
          userId,
          chatRef,
          setQuotaError,
        });
      },
      [chatId, userId, setQuotaError],
    ),
    onFinish: useCallback(
      async ({
        message,
        messages: allMessages,
        finishReason,
      }: {
        message: unknown;
        messages: unknown[];
        finishReason?: string;
      }) => {
        // Ensure allMessages includes the latest finished message's metadata
        const lastFinishedMsg = message as any;
        const fullMessages = (allMessages as any[]).map((m) =>
          m.id === lastFinishedMsg?.id ? { ...m, ...lastFinishedMsg } : m
        );
        if (lastFinishedMsg && !fullMessages.some((m) => m.id === lastFinishedMsg.id)) {
          fullMessages.push(lastFinishedMsg);
        }

        await reconcileFinishedStep({
          chatId,
          userId,
          message: lastFinishedMsg,
          allMessages: fullMessages,
          finishReason,
          continuationCountRef,
          sendMessageRef,
        });
      },
      [chatId, userId],
    ),
  });

  useEffect(() => {
    chatRef.current = chat;
    sendMessageRef.current = chat.sendMessage;
  }, [chat]);

  // Drop the trailing empty assistant message produced when the stream was cut off by a quota error
  useEffect(() => {
    if (quotaError && chat.messages.length > 0) {
      const lastMsg: any = chat.messages[chat.messages.length - 1];
      const isPartless = !lastMsg.parts || lastMsg.parts.length === 0;
      const isTextEmpty = lastMsg.parts?.every((p: any) => p.type === 'text' && (!p.text || p.text.trim() === ''));
      if (lastMsg.role === 'assistant' && (isPartless || isTextEmpty)) {
        chat.setMessages(chat.messages.slice(0, -1));
      }
    }
  }, [quotaError, chat]);

  const loadedChatIdRef = useRef<string | null>(null);

  // Hydrate chat messages from Dexie on mount or chat switch
  useEffect(() => {
    if (loadedChatIdRef.current !== chatId) {
      loadedChatIdRef.current = null;
    }

    if (dexieMessages !== undefined && loadedChatIdRef.current === null) {
      loadedChatIdRef.current = chatId;
      chat.setMessages(dexieMessages as any);
    }
  }, [chatId, dexieMessages, chat]);

  const currentConvTitle = currentConv?.title;

  // The active model's context window in tokens.
  const contextWindow = getModelContextWindow(modelSettings.model);

  // Accurate active context window metrics and session totals (Claude Code / OpenCode / Codex standard).
  const tokenMetrics = useMemo(
    () => calculateTokenMetrics(chat.messages as UsageMessage[], contextWindow),
    [chat.messages, contextWindow],
  );

  // Refuse further sends in this conversation once active context usage has crossed the model window.
  const isContextWindowExhausted = tokenMetrics != null && tokenMetrics.active.totalTokens >= contextWindow;

  /**
   * Sends a user message after validating quota, auto-titling the conversation on its first message.
   * Image attachments ride along as AI SDK `file` UI parts (data URLs); image-only
   * messages are allowed, and the auto-title falls back to the first filename.
   * @param text - The raw message text to send.
   * @param images - Optional processed image attachments to include.
   */
  const handleSendMessage = useCallback(
    (text: string, images?: ProcessedImage[]) => {
      continuationCountRef.current = 0;
      const trimmed = text.trim();
      const canSend = (chat.status === 'ready' || chat.status === 'error' || chat.status !== 'streaming') && !isCompacting;
      const hasImages = Array.isArray(images) && images.length > 0;
      if ((trimmed || hasImages) && canSend) {
        if (chat.status !== 'ready' && chat.stop) {
          chat.stop();
        }
        if (rateLimitData && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0)) {
          const err = buildQuotaError(rateLimitData.remaining5h, rateLimitData.remainingWeek, rateLimitData.retryAfter);
          if (err) { setQuotaError(err); }
          return;
        }
        if (isContextWindowExhausted) {
          setQuotaError({
            message:
              contextWindow > 0
                ? `Context window reached (${contextWindow.toLocaleString()} tokens). Compact history or start a new chat to continue.`
                : 'Context window reached. Compact history or start a new chat to continue.',
          });
          return;
        }
        setQuotaError(null);
        if (!currentConvTitle || currentConvTitle === 'New Chat') {
          const titleSource = trimmed || images?.[0]?.filename || 'New Chat';
          const autoTitle = titleSource.length > 40 ? `${titleSource.slice(0, 40)}...` : titleSource;
          updateConversationTitle(chatId, autoTitle);
        }
        // Build the UI-message parts: file parts (data URLs) first, then the text.
        // convertToModelMessages turns these into multimodal model content on the server.
        const parts: any[] = [
          ...(hasImages
            ? images.map((image) => ({
                type: 'file',
                mediaType: image.mediaType,
                filename: image.filename,
                url: image.dataUrl,
              }))
            : []),
        ];
        if (trimmed) {
          parts.push({ type: 'text', text: trimmed });
        }
        chat.sendMessage({ parts });
      }
    },
    [chat, chatId, currentConvTitle, rateLimitData, setQuotaError, isContextWindowExhausted, contextWindow, isCompacting],
  );

  const handleStop = useCallback(() => {
    if (chat.stop) {
      chat.stop();
    }
  }, [chat]);

  const isLoading = ((chat.status === 'streaming' || chat.status === 'submitted') && !quotaError) || isCompacting;

  const handleTriggerCompaction = useCallback(() => {
    if (chat.messages.length > 0 && !isCompacting && !isLoading) {
      setQuotaError(null);
      triggerCompaction(chat.messages);
    }
  }, [chat.messages, isCompacting, isLoading, setQuotaError, triggerCompaction]);

  return {
    model: modelSettings.model,
    thinkingLevel: modelSettings.thinkingLevel,
    isWorkspaceDrawerOpen: workspace.isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen: workspace.setIsWorkspaceDrawerOpen,
    files: workspace.files,
    activeFileId: workspace.activeFileId,
    displayMessages: chat.messages,
    tokenUsage: tokenMetrics,
    tokenMetrics,
    isContextWindowExhausted,
    contextWindow,
    status: chat.status,
    isLoading,
    isCompacting,
    rateLimitData,
    quotaError,
    clearQuotaError,
    handleSendMessage,
    handleTriggerCompaction,
    handleStop,
    handleSelectFile: workspace.handleSelectFile,
    handleCreateFile: workspace.handleCreateFile,
    handleUpdateFile: workspace.handleUpdateFile,
    handleDeleteFile: workspace.handleDeleteFile,
    handleModelSelect: modelSettings.handleModelSelect,
    handleThinkingLevelChange: modelSettings.handleThinkingLevelChange,
  };
}
