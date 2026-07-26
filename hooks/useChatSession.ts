'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getInitialModel,
  saveModelPreference,
  getStoredThinkingLevel,
  saveThinkingLevel,
  getValidThinkingLevelForModel,
  MODEL_THINKING_LEVELS,
} from '@/lib/models';
import {
  db,
  createConversation,
  updateConversationTitle,
  updateConversationModel,
  getWorkspaceFiles,
  saveWorkspaceFile,
  deleteWorkspaceFile,
  updateConversationFiles,
} from '@/lib/db/db';
import { Resume, WorkspaceFile } from '@/lib/schemas';
import { generateId } from '@/lib/id';

export interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
  result?: { resume?: Resume; file?: WorkspaceFile; files?: WorkspaceFile[]; deleted?: boolean; fileId?: string } | unknown;
  output?: { resume?: Resume; file?: WorkspaceFile; files?: WorkspaceFile[]; deleted?: boolean; fileId?: string } | unknown;
  state?: string;
}

export interface GenericUIMessage {
  id: string;
  role: string;
  content?: string;
  parts?: MessagePart[];
}

export function extractDeletedFilesFromMessage(msg: GenericUIMessage): { fileId?: string; name?: string }[] {
  if (!msg || !Array.isArray(msg.parts)) return [];

  const deletions: { fileId?: string; name?: string }[] = [];
  for (const part of msg.parts) {
    const inv = (part as any).toolInvocation || part;
    const res = inv.result || inv.output || part.result || part.output;

    if (res?.deleted === true && (res?.fileId || res?.name)) {
      deletions.push({ fileId: res.fileId, name: res.name });
    }
  }
  return deletions;
}

export function extractFilesFromMessage(msg: GenericUIMessage): WorkspaceFile[] | null {
  if (!msg || !Array.isArray(msg.parts)) return null;

  const files: WorkspaceFile[] = [];
  for (const part of msg.parts) {
    const inv = (part as any).toolInvocation || part;
    const res = inv.result || inv.output || part.result || part.output;

    if (res?.files && Array.isArray(res.files)) {
      files.push(...res.files);
    } else if (res?.file && typeof res.file.content === 'string') {
      files.push(res.file);
    } else if (res?.resume && typeof res.resume.markdownContent === 'string') {
      const r = res.resume;
      files.push({
        id: r.id || 'resume-file',
        name: `${r.title || 'resume'}.md`,
        content: r.markdownContent,
        language: 'markdown',
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      });
    }
  }
  return files.length > 0 ? files : null;
}

export function useChatSession(chatId: string) {
  const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const [model, setModel] = useState(defaultModel);
  const [thinkingLevel, setThinkingLevel] = useState<string>(() => {
    const config = MODEL_THINKING_LEVELS[defaultModel];
    return config?.defaultLevel || '';
  });
  const [inputValue, setInputValue] = useState('');
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    const storedModel = getInitialModel();
    if (storedModel !== model) setModel(storedModel);
    setThinkingLevel(
      getValidThinkingLevelForModel(storedModel, getStoredThinkingLevel(storedModel)),
    );
  }, []);

  const dexieMessages = useLiveQuery(
    () => db.messages.where('chatId').equals(chatId).sortBy('timestamp'),
    [chatId],
  );

  const currentConv = useLiveQuery(
    () => db.conversations.get(chatId),
    [chatId],
  );

  const files = useMemo(() => getWorkspaceFiles(currentConv), [currentConv]);
  const filesRef = useRef(files);
  const modelRef = useRef(model);
  const thinkingLevelRef = useRef(thinkingLevel);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    thinkingLevelRef.current = thinkingLevel;
  }, [thinkingLevel]);

  // Set default active file if not set
  useEffect(() => {
    if (currentConv?.activeFileId) {
      setActiveFileId(currentConv.activeFileId);
    } else if (files.length > 0 && !activeFileId) {
      setActiveFileId(files[0].id);
    }
  }, [currentConv?.activeFileId, files]);

  useEffect(() => {
    if (!chatId) return;
    db.conversations.get(chatId).then(existing => {
      if (!existing) {
        createConversation(chatId, 'New Chat', model, thinkingLevel);
      }
    });
  }, [chatId, model, thinkingLevel]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent',
        body: () => ({
          model: modelRef.current,
          thinkingLevel: thinkingLevelRef.current,
          files: filesRef.current,
          resumes: filesRef.current.length > 0 ? [
            {
              id: filesRef.current[0].id,
              title: filesRef.current[0].name.replace(/\.md$/, ''),
              markdownContent: filesRef.current[0].content,
              createdAt: filesRef.current[0].createdAt,
              updatedAt: filesRef.current[0].updatedAt,
            }
          ] : [],
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

        // Process file modifications ONLY from the current assistant message
        const currentMsg = message as GenericUIMessage;
        const deletions = extractDeletedFilesFromMessage(currentMsg);
        const updatedFiles = extractFilesFromMessage(currentMsg);

        if (deletions.length > 0 || (updatedFiles && updatedFiles.length > 0)) {
          const conv = await db.conversations.get(chatId);
          let currentFiles = getWorkspaceFiles(conv);

          // Apply deletions
          if (deletions.length > 0) {
            currentFiles = currentFiles.filter(f => {
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
                f => f.id === newFile.id || f.name.toLowerCase() === newFile.name.toLowerCase(),
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

  useEffect(() => {
    if (loadedChatIdRef.current !== chatId) {
      loadedChatIdRef.current = null;
    }

    if (dexieMessages !== undefined && loadedChatIdRef.current === null) {
      loadedChatIdRef.current = chatId;
      chat.setMessages(dexieMessages as any);
    }
  }, [chatId, dexieMessages, chat]);

  useEffect(() => {
    if (currentConv?.model) {
      setModel(currentConv.model);
      if (currentConv.thinkingLevel) {
        setThinkingLevel(currentConv.thinkingLevel);
      }
    }
  }, [currentConv?.id]);

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

  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    setIsWorkspaceDrawerOpen(true);
  };

  const handleCreateFile = async (name: string, content = '') => {
    const now = new Date().toISOString();
    const newFile: WorkspaceFile = {
      id: generateId(),
      name: name.endsWith('.md') || name.endsWith('.txt') ? name : `${name}.md`,
      content,
      language: name.endsWith('.txt') ? 'text' : 'markdown',
      createdAt: now,
      updatedAt: now,
    };
    await saveWorkspaceFile(chatId, newFile);
    setActiveFileId(newFile.id);
    setIsWorkspaceDrawerOpen(true);
  };

  const handleUpdateFile = async (updatedFile: WorkspaceFile) => {
    await saveWorkspaceFile(chatId, updatedFile);
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteWorkspaceFile(chatId, fileId);
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleModelSelect = (id: string) => {
    setModel(id);
    saveModelPreference(id);
    const currentLevel = getStoredThinkingLevel(id);
    const valid = getValidThinkingLevelForModel(id, currentLevel);
    setThinkingLevel(valid);
    saveThinkingLevel(valid);
    updateConversationModel(chatId, id, valid);
  };

  const handleThinkingLevelChange = (level: string) => {
    setThinkingLevel(level);
    saveThinkingLevel(level);
    updateConversationModel(chatId, model, level);
  };

  const isLoading = chat.status !== 'ready';
  const displayMessages = chat.messages;
  const streamingContent = null;

  return {
    model,
    thinkingLevel,
    inputValue,
    setInputValue,
    isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen,
    files,
    activeFileId,
    displayMessages,
    streamingContent,
    isLoading,
    handleSendMessage,
    handleSubmit,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
    handleModelSelect,
    handleThinkingLevelChange,
  };
}
