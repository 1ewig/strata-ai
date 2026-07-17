'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash } from 'lucide-react';
import { Task } from '@/lib/schemas';
import { useChat } from '@/hooks/useChat';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import SuggestionChips from '@/components/chat/SuggestionChips';

const QUICK_SUGGESTIONS = [
  { label: "Break down launching a podcast", text: "Break down the process of planning and launching a new podcast." },
  { label: "Steps to plan a weekend trip", text: "Help me break down planning a weekend mountain trip into actionable steps." },
  { label: "Create a study plan for French", text: "I want to start learning French. Give me a 5-step beginner breakdown." },
  { label: "Design a bedroom cleaning plan", text: "Break down a deep-cleaning routine for my bedroom so it isn't overwhelming." },
];

interface ChatPanelProps {
  tasks: Task[];
  onAgentUpdateTasks: (newTasks: Task[]) => void;
}

export default function ChatPanel({ tasks, onAgentUpdateTasks }: ChatPanelProps) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
  } = useChat(tasks, onAgentUpdateTasks);

  return (
    <div id="chat-panel-container" className="flex flex-col h-[650px] md:h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">

      <div id="chat-panel-header" className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 bg-zinc-900/40 relative z-10">
        <div className="flex items-center gap-2">
          <div id="chat-sparkle-avatar" className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h3 id="chat-header-title" className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              TaskFlow AI Planner
              <span id="chat-online-dot" className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p id="chat-header-status" className="text-[10px] text-zinc-500">Active • Powered by {process.env.NEXT_PUBLIC_GEMINI_MODEL || "Gemini 2.5"}</p>
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

      <div id="chat-messages-scroll" className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div id="chat-loading-row" className="flex items-start gap-3">
            <div id="chat-loading-avatar" className="w-8 h-8 rounded-lg bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 flex-shrink-0 flex items-center justify-center mt-0.5">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <div id="chat-loading-bubble" className="bg-zinc-900 border border-zinc-800/80 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                <span className="text-sm text-zinc-400">Planning & executing tasks</span>
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

      {messages.length <= 1 && (
        <SuggestionChips suggestions={QUICK_SUGGESTIONS} onSelect={handleSendMessage} />
      )}

      <ChatInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
