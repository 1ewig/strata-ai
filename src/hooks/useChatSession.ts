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
  } | null>(null);

  useEffect(() => {
    fetch('/api/user/rate-limit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setRateLimitData({
            remaining5h: data.remaining5h ?? 10,
            remainingWeek: data.remainingWeek ?? 50,
          });
        }
      })
      .catch(() => {});
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
          if (rem5h !== null && remWeek !== null) {
            setRateLimitData({
              remaining5h: parseInt(rem5h, 10),
              remainingWeek: parseInt(remWeek, 10),
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

  const handleSubmit = useCallback(
    (text: string) => {
      continuationCountRef.current = 0;
      const trimmed = text.trim();
      if (trimmed && chat.status === 'ready') {
        if (!currentConvTitle || currentConvTitle === 'New Chat') {
          const autoTitle = trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
          updateConversationTitle(chatId, autoTitle);
        }
        chat.sendMessage({ text: trimmed });
      }
    },
    [chat, chatId, currentConvTitle],
  );

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
    handleSubmit,
    handleSelectFile: workspace.handleSelectFile,
    handleCreateFile: workspace.handleCreateFile,
    handleUpdateFile: workspace.handleUpdateFile,
    handleDeleteFile: workspace.handleDeleteFile,
    handleModelSelect: modelSettings.handleModelSelect,
    handleThinkingLevelChange: modelSettings.handleThinkingLevelChange,
  };
}
