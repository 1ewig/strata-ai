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
  const [inputValue, setInputValue] = useState('');

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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent',
        body: () => ({
          model: modelRef.current,
          thinkingLevel: thinkingLevelRef.current,
          files: filesRef.current,
        }),
      }),
    [],
  );

  const chat = useChat({
    id: chatId,
    transport: transport as any,
    onFinish: useCallback(
      async ({ message, messages: allMessages }: { message: unknown; messages: unknown[] }) => {
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
      },
      [chatId],
    ),
  });

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

  const handleSendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed && chat.status === 'ready') {
        if (!currentConv?.title || currentConv.title === 'New Chat') {
          const autoTitle = trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
          updateConversationTitle(chatId, autoTitle);
        }
        chat.sendMessage({ text: trimmed });
      }
    },
    [chat, chatId, currentConv?.title],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && chat.status === 'ready') {
      handleSendMessage(inputValue);
      setInputValue('');
    }
  };

  const isLoading = chat.status !== 'ready';

  return {
    model: modelSettings.model,
    thinkingLevel: modelSettings.thinkingLevel,
    inputValue,
    setInputValue,
    isWorkspaceDrawerOpen: workspace.isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen: workspace.setIsWorkspaceDrawerOpen,
    files: workspace.files,
    activeFileId: workspace.activeFileId,
    displayMessages: chat.messages,
    streamingContent: null,
    isLoading,
    handleSendMessage,
    handleSubmit,
    handleSelectFile: workspace.handleSelectFile,
    handleCreateFile: workspace.handleCreateFile,
    handleUpdateFile: workspace.handleUpdateFile,
    handleDeleteFile: workspace.handleDeleteFile,
    handleModelSelect: modelSettings.handleModelSelect,
    handleThinkingLevelChange: modelSettings.handleThinkingLevelChange,
  };
}
