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
  updateConversationResume,
  updateConversationTitle,
  updateConversationModel,
} from '@/lib/db/db';
import { Resume, ChatMessage } from '@/lib/schemas';

export interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
  result?: { resume?: Resume; markdownContent?: string } | unknown;
  output?: { resume?: Resume; markdownContent?: string } | unknown;
  state?: string;
}

export interface GenericUIMessage {
  id: string;
  role: string;
  content?: string;
  parts?: MessagePart[];
}

export function extractResumeFromMessage(msg: GenericUIMessage): Resume | null {
  if (!msg || !Array.isArray(msg.parts)) return null;

  for (const part of msg.parts) {
    const inv = (part as any).toolInvocation || part;
    const res =
      (inv.result as { resume?: Resume })?.resume ||
      (inv.output as { resume?: Resume })?.resume ||
      (part.result as { resume?: Resume })?.resume ||
      (part.output as { resume?: Resume })?.resume;

    if (res && typeof res.markdownContent === 'string') {
      return res;
    }
  }
  return null;
}



export function useChatSession(chatId: string) {
  const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const [model, setModel] = useState(defaultModel);
  const [thinkingLevel, setThinkingLevel] = useState<string>(() => {
    const config = MODEL_THINKING_LEVELS[defaultModel];
    return config?.defaultLevel || '';
  });
  const [inputValue, setInputValue] = useState('');
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);

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

  const resume = currentConv?.resume;
  const resumeRef = useRef(resume);
  const modelRef = useRef(model);
  const thinkingLevelRef = useRef(thinkingLevel);

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    thinkingLevelRef.current = thinkingLevel;
  }, [thinkingLevel]);

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
          resumes: resumeRef.current ? [resumeRef.current] : [],
        }),
      }),
    [],
  );

  const chat = useChat({
    id: chatId,
    transport: transport as any,
    onFinish: useCallback(
      async ({ message, messages: allMessages }: { message: unknown; messages: unknown[] }) => {
        for (const msg of allMessages as any[]) {
          await db.messages.put({
            ...msg,
            chatId,
            timestamp: new Date().toISOString(),
          });
        }
        await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });

        for (const m of [message, ...allMessages].reverse()) {
          const updatedResume = extractResumeFromMessage(m as GenericUIMessage);
          if (updatedResume) {
            await updateConversationResume(chatId, updatedResume);
            break;
          }
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

  const handleUpdateResume = async (updated: Resume) => {
    if (!chatId) return;
    await updateConversationResume(chatId, updated);
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
  const lastAssistantMsgId =
    chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'assistant'
      ? chat.messages[chat.messages.length - 1].id
      : null;

  const displayMessages = chat.messages;
  const streamingContent = null;

  return {
    model,
    thinkingLevel,
    inputValue,
    setInputValue,
    isResumeDrawerOpen,
    setIsResumeDrawerOpen,
    resume,
    displayMessages,
    streamingContent,
    isLoading,
    handleSendMessage,
    handleSubmit,
    handleUpdateResume,
    handleModelSelect,
    handleThinkingLevelChange,
  };
}
