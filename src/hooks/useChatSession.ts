'use client';

import { useEffect, useRef, useCallback } from 'react';
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
import { handleChatError } from '@/lib/ai/chat-error-handler';
import { reconcileFinishedStep } from '@/lib/ai/chat-reconciler';
import { useRateLimit } from '@/contexts/RateLimitContext';

export function useChatSession(chatId: string) {
  const {
    rateLimitData,
    quotaError,
    updateRateLimitData,
    setQuotaError,
    clearQuotaError,
    checkQuotaStatus,
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
        createConversation(chatId, 'New Chat', modelSettings.model, modelSettings.thinkingLevel);
      }
    });
  }, [chatId, modelSettings.model, modelSettings.thinkingLevel]);

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

  const chat = useChat({
    id: chatId,
    transport: transport as any,
    onError: useCallback(
      (err: Error) => {
        handleChatError({
          err,
          chatId,
          chatRef,
          setQuotaError,
        });
      },
      [chatId, setQuotaError],
    ),
    onFinish: useCallback(
      ({
        message,
        messages: allMessages,
        finishReason,
      }: {
        message: unknown;
        messages: unknown[];
        finishReason?: string;
      }) => {
        return reconcileFinishedStep({
          chatId,
          message,
          allMessages,
          finishReason,
          continuationCountRef,
          sendMessageRef,
        });
      },
      [chatId],
    ),
  });

  useEffect(() => {
    chatRef.current = chat;
    sendMessageRef.current = chat.sendMessage;
  }, [chat]);

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

  const handleSendMessage = useCallback(
    (text: string) => {
      continuationCountRef.current = 0;
      const trimmed = text.trim();
      if (trimmed && chat.status === 'ready') {
        if (rateLimitData && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0)) {
          setQuotaError({
            message: rateLimitData.remaining5h <= 0
              ? 'Your 5-hour quota is exhausted (10/10 messages used).'
              : 'Your weekly quota is exhausted (50/50 messages used).',
            retryAfter: rateLimitData.retryAfter,
          });
          return;
        }
        setQuotaError(null);
        if (!currentConvTitle || currentConvTitle === 'New Chat') {
          const autoTitle = trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
          updateConversationTitle(chatId, autoTitle);
        }
        chat.sendMessage({ text: trimmed });
      }
    },
    [chat, chatId, currentConvTitle, rateLimitData, setQuotaError],
  );

  const isLoading = chat.status !== 'ready' && !quotaError;

  return {
    model: modelSettings.model,
    thinkingLevel: modelSettings.thinkingLevel,
    isWorkspaceDrawerOpen: workspace.isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen: workspace.setIsWorkspaceDrawerOpen,
    files: workspace.files,
    activeFileId: workspace.activeFileId,
    displayMessages: chat.messages,
    streamingContent: null,
    status: chat.status,
    isLoading,
    rateLimitData,
    quotaError,
    clearQuotaError,
    checkQuotaStatus,
    handleSendMessage,
    handleSelectFile: workspace.handleSelectFile,
    handleCreateFile: workspace.handleCreateFile,
    handleUpdateFile: workspace.handleUpdateFile,
    handleDeleteFile: workspace.handleDeleteFile,
    handleModelSelect: modelSettings.handleModelSelect,
    handleThinkingLevelChange: modelSettings.handleThinkingLevelChange,
  };
}
