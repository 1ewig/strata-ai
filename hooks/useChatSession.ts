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
} from '@/lib/models';
import {
  db,
  createConversation,
  updateConversationResume,
  clearChatMessages,
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
    const isSetResumeTool =
      part.toolName === 'setResumeMarkdown' ||
      part.name === 'setResumeMarkdown' ||
      part.type === 'tool-setResumeMarkdown';

    if (isSetResumeTool) {
      const res =
        (part.result as { resume?: Resume })?.resume ||
        (part.output as { resume?: Resume })?.resume;

      if (res && typeof res.markdownContent === 'string') {
        return res;
      }
    }
  }
  return null;
}

export function uiMessageToChatMessage(msg: GenericUIMessage): ChatMessage {
  let content = '';
  if (typeof msg.content === 'string' && msg.content) {
    content = msg.content;
  } else if (Array.isArray(msg.parts)) {
    content = msg.parts
      .filter(p => p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text as string)
      .join('');
  }

  const toolCalls = Array.isArray(msg.parts)
    ? msg.parts
        .filter(p => {
          const isTool =
            p.toolName === 'setResumeMarkdown' ||
            p.name === 'setResumeMarkdown' ||
            p.type === 'tool-invocation' ||
            p.type === 'dynamic-tool' ||
            (typeof p.type === 'string' && p.type.startsWith('tool'));
          const isDone =
            p.state === 'result' ||
            p.state === 'output-available' ||
            p.result !== undefined ||
            p.output !== undefined;
          return isTool && isDone;
        })
        .map(p => ({
          name: p.toolName || p.name || 'setResumeMarkdown',
          args: p.args || p.input,
          result: p.result || p.output,
        }))
    : undefined;

  return {
    id: msg.id,
    role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
    content,
    timestamp: new Date().toISOString(),
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
  };
}

export function useChatSession(chatId: string) {
  const [model, setModel] = useState(getInitialModel);
  const [thinkingLevel, setThinkingLevel] = useState(() =>
    getValidThinkingLevelForModel(model, getStoredThinkingLevel(model)),
  );
  const [inputValue, setInputValue] = useState('');
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);

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
        for (const msg of allMessages) {
          const dexieMsg = uiMessageToChatMessage(msg as GenericUIMessage);
          await db.messages.put({ ...dexieMsg, chatId });
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

  const prevChatIdRef = useRef(chatId);

  useEffect(() => {
    if (dexieMessages && chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      const uiMessages = dexieMessages.map(uiMessageToChatMessage);
      chat.setMessages(uiMessages as unknown as ReturnType<typeof chat.setMessages> extends (msgs: infer M) => void ? M : never);
    }
  }, [chatId, dexieMessages, chat]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (text.trim() && chat.status === 'ready') {
        chat.sendMessage({ text });
      }
    },
    [chat],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && chat.status === 'ready') {
      chat.sendMessage({ text: inputValue });
      setInputValue('');
    }
  };

  const handleClearChat = async () => {
    await clearChatMessages(chatId);
    const welcomeText = 'Chat cleared. Ready to work on your resume!';
    chat.setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: welcomeText }],
      },
    ]);
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
  };

  const handleThinkingLevelChange = (level: string) => {
    setThinkingLevel(level);
    saveThinkingLevel(level);
  };

  const isLoading = chat.status !== 'ready';
  const lastAssistantMsg =
    chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'assistant'
      ? chat.messages[chat.messages.length - 1]
      : null;
  const isStreaming = chat.status === 'streaming' && lastAssistantMsg != null;

  const streamingContent = useMemo(() => {
    return isStreaming && lastAssistantMsg
      ? uiMessageToChatMessage(lastAssistantMsg as GenericUIMessage).content
      : null;
  }, [isStreaming, lastAssistantMsg]);

  const displayMessages = useMemo(() => {
    return chat.messages
      .filter(m => !(isStreaming && m.id === lastAssistantMsg?.id))
      .map(m => uiMessageToChatMessage(m as GenericUIMessage));
  }, [chat.messages, isStreaming, lastAssistantMsg?.id]);

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
    handleClearChat,
    handleUpdateResume,
    handleModelSelect,
    handleThinkingLevelChange,
  };
}
