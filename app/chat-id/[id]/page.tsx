'use client';

import React, { useState, useEffect, useRef, use, useMemo, useCallback } from 'react';
import { ChevronDown, PanelRightOpen } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useLiveQuery } from 'dexie-react-hooks';
import Sidebar from '@/components/Sidebar';
import ResumeDrawer from '@/components/resumes/ResumeDrawer';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  getInitialModel,
  saveModelPreference,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
  getStoredThinkingLevel,
  saveThinkingLevel,
  getValidThinkingLevelForModel,
} from '@/lib/models';
import ChatPanel from '@/components/ChatPanel';
import ChatInput from '@/components/chat/ChatInput';
import {
  db,
  createConversation,
  updateConversationResume,
  clearChatMessages,
} from '@/lib/db/db';
import { Resume, ChatMessage } from '@/lib/schemas';

interface MessagePart {
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

interface GenericUIMessage {
  id: string;
  role: string;
  content?: string;
  parts?: MessagePart[];
}

function extractResumeFromMessage(msg: GenericUIMessage): Resume | null {
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

function uiMessageToChatMessage(msg: GenericUIMessage): ChatMessage {
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

export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  const [model, setModel] = useState(getInitialModel);
  const [thinkingLevel, setThinkingLevel] = useState(() =>
    getValidThinkingLevelForModel(model, getStoredThinkingLevel(model)),
  );
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => { resumeRef.current = resume; }, [resume]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { thinkingLevelRef.current = thinkingLevel; }, [thinkingLevel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && chat.status === 'ready') {
      chat.sendMessage({ text: inputValue });
      setInputValue('');
    }
  };

  const handleSendMessage = useCallback(
    (text: string) => {
      if (text.trim() && chat.status === 'ready') {
        chat.sendMessage({ text });
      }
    },
    [chat],
  );

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
    setModelMenuOpen(false);
  };

  const handleThinkingLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = e.target.value;
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

  const currentModel = MODELS.find(m => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  return (
    <main className="h-screen max-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 truncate max-w-xs sm:max-w-md">
              {resume?.title || 'Chat Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-row gap-1.5 items-center">
              <div className="relative" ref={modelMenuRef}>
                <button
                  id="model-selector-btn"
                  onClick={() => setModelMenuOpen(prev => !prev)}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
                >
                  {currentModel?.label || 'Select model'}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {modelMenuOpen && (
                  <div className="absolute mt-1 right-0 w-60 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden text-sm z-50">
                    <div className="py-1">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Gemini
                      </p>
                      {MODELS.filter(m => m.provider === 'Gemini').map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-zinc-700 flex flex-col ${
                            m.id === model ? 'bg-zinc-700/50' : ''
                          }`}
                        >
                          <span className="text-sm font-medium text-zinc-200">{m.label}</span>
                          <span className="text-xs text-zinc-500">{MODEL_DESCRIPTIONS[m.id]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-zinc-700 py-1">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Gemma 4
                      </p>
                      {MODELS.filter(m => m.provider === 'Gemma 4').map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-zinc-700 flex flex-col ${
                            m.id === model ? 'bg-zinc-700/50' : ''
                          }`}
                        >
                          <span className="text-sm font-medium text-zinc-200">{m.label}</span>
                          <span className="text-xs text-zinc-500">{MODEL_DESCRIPTIONS[m.id]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {currentModelThinkingConfig && (
                <div className="relative">
                  <select
                    id="thinking-level-selector"
                    value={thinkingLevel}
                    onChange={handleThinkingLevelChange}
                    className="text-xs text-zinc-400 bg-transparent border border-zinc-800 rounded-md appearance-none cursor-pointer hover:text-zinc-200 hover:border-zinc-700 focus:outline-none focus:text-zinc-200 focus:border-zinc-500 px-2 py-1 pr-6 transition-colors"
                  >
                    {currentModelThinkingConfig.levels.map(level => (
                      <option key={level} value={level} className="bg-zinc-800">
                        {THINKING_LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-zinc-800" />

            <button
              id="clear-chat-btn"
              onClick={handleClearChat}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-800 transition-colors focus:outline-none"
            >
              Clear chat
            </button>

            <button
              onClick={() => setIsResumeDrawerOpen(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all font-medium cursor-pointer"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
              Resume Drawer
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 pb-28">
          <div className="max-w-2xl w-full mx-auto px-4">
            <ChatPanel
              messages={displayMessages}
              streamingContent={streamingContent}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-6 pb-4 px-4 pointer-events-none z-30">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <ChatInput
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <ResumeDrawer
        isOpen={isResumeDrawerOpen}
        onClose={() => setIsResumeDrawerOpen(false)}
        resume={resume}
        onUpdateResume={handleUpdateResume}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </main>
  );
}
