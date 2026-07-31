'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  createConversation,
  updateConversationTitle,
  getWorkspaceFiles,
  updateConversationFiles,
} from '@/lib/db/db';
import { useModelSettings } from './useModelSettings';
import { useWorkspaceFiles } from './useWorkspaceFiles';
import {
  GenericUIMessage,
  extractDeletedFilesFromMessage,
  extractFilesFromMessage,
} from '@/lib/ai/message-extractor';

export function useChatSession(chatId: string) {
  const dexieMessages = useLiveQuery(
    () => db.messages.where('chatId').equals(chatId).sortBy('timestamp'),
    [chatId],
  );

  const currentConv = useLiveQuery(
    () => db.conversations.get(chatId),
    [chatId],
  );

  // Modular specialized hooks
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

  const [rateLimitData, setRateLimitData] = useState<{
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null>(null);

  const [quotaError, setQuotaError] = useState<{
    message: string;
    retryAfter?: number;
  } | null>(null);

  const checkQuotaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/rate-limit');
      if (res.ok) {
        const data = await res.json();
        const rem5h = data.remaining5h ?? 10;
        const remWeek = data.remainingWeek ?? 50;
        setRateLimitData({
          remaining5h: rem5h,
          remainingWeek: remWeek,
          retryAfter: data.retryAfter,
        });
        if (rem5h > 0 && remWeek > 0) {
          setQuotaError(null);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/user/rate-limit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && active) {
          const rem5h = data.remaining5h ?? 10;
          const remWeek = data.remainingWeek ?? 50;
          setRateLimitData({
            remaining5h: rem5h,
            remainingWeek: remWeek,
            retryAfter: data.retryAfter,
          });
          if (rem5h > 0 && remWeek > 0) {
            setQuotaError(null);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
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
          const rem5h = res.headers.get('X-RateLimit-Remaining-5h');
          const remWeek = res.headers.get('X-RateLimit-Remaining-Week');
          const retryHeader = res.headers.get('X-RateLimit-Retry-After') || res.headers.get('Retry-After');
          const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : undefined;

          if (rem5h !== null && remWeek !== null) {
            const num5h = parseInt(rem5h, 10);
            const numWeek = parseInt(remWeek, 10);
            setRateLimitData({
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
          }
          return res;
        },
      }),
    [],
  );
  /* eslint-enable react-hooks/refs */

  const chat = useChat({
    id: chatId,
    transport: transport as any,
    onError: useCallback((err: Error) => {
      if (err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit')) {
        setQuotaError((prev) => prev || {
          message: 'Usage quota reached (10 msgs / 5h, 50 msgs / week). Please wait before trying again.',
        });
      }
    }, []),
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
        // Persist all messages to Dexie
        for (const msg of allMessages as any[]) {
          await db.messages.put({
            ...msg,
            chatId,
            timestamp: new Date().toISOString(),
          });
        }
        await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });

        // Process workspace file updates/deletions ONLY from the current assistant message
        const currentMsg = message as GenericUIMessage;
        const deletions = extractDeletedFilesFromMessage(currentMsg);
        const updatedFiles = extractFilesFromMessage(currentMsg);

        if (deletions.length > 0 || (updatedFiles && updatedFiles.length > 0)) {
          const conv = await db.conversations.get(chatId);
          let currentFiles = getWorkspaceFiles(conv);

          // Apply deletions
          if (deletions.length > 0) {
            currentFiles = currentFiles.filter((f) => {
              for (const del of deletions) {
                if (del.fileId && f.id === del.fileId) return false;
                if (del.name && f.name.toLowerCase() === del.name.toLowerCase()) return false;
              }
              return true;
            });
          }

          // Apply creations or edits
          if (updatedFiles && updatedFiles.length > 0) {
            for (const newFile of updatedFiles) {
              const idx = currentFiles.findIndex(
                (f) => f.id === newFile.id || f.name.toLowerCase() === newFile.name.toLowerCase(),
              );
              if (idx >= 0) {
                currentFiles[idx] = newFile;
              } else {
                currentFiles.push(newFile);
              }
            }
          }

          const activeId = currentFiles.length > 0 ? currentFiles[0].id : undefined;
          await updateConversationFiles(chatId, currentFiles, activeId);
        }

        // Auto-continuation loop if step limit reached
        if (finishReason === 'step-limit' && continuationCountRef.current < 2) {
          continuationCountRef.current += 1;
          console.log(
            `[useChatSession] Step limit reached. Auto-continuing pass ${continuationCountRef.current}/2...`,
          );
          setTimeout(() => {
            sendMessageRef.current?.({
              text: 'Please continue completing the task where you left off.',
            });
          }, 300);
        } else {
          continuationCountRef.current = 0;
        }
      },
      [chatId],
    ),
  });

  useEffect(() => {
    sendMessageRef.current = chat.sendMessage;
  }, [chat.sendMessage]);

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
    [chat, chatId, currentConvTitle, rateLimitData],
  );

  const clearQuotaError = useCallback(() => setQuotaError(null), []);

  const isLoading = chat.status !== 'ready';

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
