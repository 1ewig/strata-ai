'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash, ChevronDown } from 'lucide-react';
import { Resume } from '@/lib/schemas';
import { useChat } from '@/hooks/useChat';
import { MODELS, getInitialModel, saveModelPreference, MODEL_THINKING_LEVELS, THINKING_LEVEL_LABELS, getStoredThinkingLevel, saveThinkingLevel, getValidThinkingLevelForModel } from '@/lib/models';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import SuggestionChips from '@/components/chat/SuggestionChips';

const QUICK_SUGGESTIONS = [
  { label: "Rewrite my summary section", text: "Help me rewrite my professional summary to be more impactful." },
  { label: "Make my experience ATS-friendly", text: "Review my experience section and suggest ATS-optimized bullet points." },
  { label: "Add a skills section", text: "Create a skills section based on my experience." },
  { label: "Tailor for a specific job", text: "Help me tailor my resume for a Senior Software Engineer role." },
];

interface ChatPanelProps {
  resumes: Resume[];
  onAgentUpdateResumes: (newResumes: Resume[]) => void;
}

export default function ChatPanel({ resumes, onAgentUpdateResumes }: ChatPanelProps) {
  const [model, setModel] = useState(getInitialModel);
  const [thinkingLevel, setThinkingLevel] = useState(() => getValidThinkingLevelForModel(model, getStoredThinkingLevel(model)));

  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    streamingContent,
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
  } = useChat(resumes, onAgentUpdateResumes, model, thinkingLevel);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setModel(id);
    saveModelPreference(id);
    const currentLevel = getStoredThinkingLevel(id);
    const valid = getValidThinkingLevelForModel(id, currentLevel);
    setThinkingLevel(valid);
    saveThinkingLevel(valid);
  };

  const handleThinkingLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = e.target.value;
    setThinkingLevel(level);
    saveThinkingLevel(level);
  };

  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  return (
    <div id="chat-panel-container" className="flex flex-col h-[650px] md:h-full md:max-h-[calc(100vh-10rem)] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">

      <div id="chat-panel-header" className="flex-shrink-0 flex items-center justify-between border-b border-zinc-800 px-4 py-4 bg-zinc-900/40 relative z-10">
        <div className="flex items-center gap-2">
          <div id="chat-sparkle-avatar" className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h3 id="chat-header-title" className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              ResumeFlow AI
              <span id="chat-online-dot" className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <div className="flex flex-row gap-1.5">
              <div className="relative">
                <select
                  id="model-selector"
                  value={model}
                  onChange={handleModelChange}
                  className="text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 rounded-md appearance-none cursor-pointer hover:text-zinc-200 hover:border-zinc-700 focus:outline-none focus:text-zinc-200 focus:border-emerald-500/50 px-2 py-1 pr-6 transition-colors"
                >
                  <optgroup label="Gemini" className="bg-zinc-900">
                    {MODELS.filter(m => m.provider === 'Gemini').map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Gemma 4" className="bg-zinc-900">
                    {MODELS.filter(m => m.provider === 'Gemma 4').map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
              </div>
              {currentModelThinkingConfig && (
                <div className="relative">
                  <select
                    id="thinking-level-selector"
                    value={thinkingLevel}
                    onChange={handleThinkingLevelChange}
                    className="text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 rounded-md appearance-none cursor-pointer hover:text-zinc-200 hover:border-zinc-700 focus:outline-none focus:text-zinc-200 focus:border-emerald-500/50 px-2 py-1 pr-6 transition-colors"
                  >
                    {currentModelThinkingConfig.levels.map(level => (
                      <option key={level} value={level}>{THINKING_LEVEL_LABELS[level]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          id="clear-chat-btn"
          onClick={handleClearChat}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-800 transition-colors focus:outline-none"
        >
          Clear chat
        </button>
      </div>

      <div id="chat-messages-scroll" className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {streamingContent !== null && (
          <ChatBubble
            message={{
              id: 'streaming',
              role: 'model',
              content: streamingContent,
              timestamp: '',
            }}
            isStreaming
          />
        )}

        {isLoading && streamingContent === null && (
          <div id="chat-loading-row" className="flex items-start gap-3">
            <div id="chat-loading-avatar" className="w-8 h-8 rounded-lg bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 flex-shrink-0 flex items-center justify-center mt-0.5">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <div id="chat-loading-bubble" className="bg-zinc-900 border border-zinc-800/80 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                <span className="text-sm text-zinc-400">Reviewing your resume</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0">
        {messages.length <= 1 && streamingContent === null && (
          <SuggestionChips suggestions={QUICK_SUGGESTIONS} onSelect={handleSendMessage} />
        )}
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
