'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User, Trash, RefreshCw, Terminal, CheckCircle, ChevronDown, Wand2, Lightbulb, Zap } from 'lucide-react';
import { ChatMessage, Task } from '@/lib/schemas';

interface ChatPanelProps {
  tasks: Task[];
  onAgentUpdateTasks: (newTasks: Task[]) => void;
}

const QUICK_SUGGESTIONS = [
  { label: "Break down launching a podcast", text: "Break down the process of planning and launching a new podcast." },
  { label: "Steps to plan a weekend trip", text: "Help me break down planning a weekend mountain trip into actionable steps." },
  { label: "Create a study plan for French", text: "I want to start learning French. Give me a 5-step beginner breakdown." },
  { label: "Design a bedroom cleaning plan", text: "Break down a deep-cleaning routine for my bedroom so it isn't overwhelming." },
];

export default function ChatPanel({
  tasks,
  onAgentUpdateTasks,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const key = `taskflow_chat_history`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimeout(() => {
          setMessages(parsed);
        }, 0);
      } catch (e) {
        console.error("Error parsing chat history", e);
      }
    } else {
      // Seed initial welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'model',
        content: "Hi! I'm **TaskFlow**, your personal AI productivity coach and task breakdown assistant. 🚀\n\nTell me any big goal, project, or chore you're working on (e.g., *'Plan my move to a new apartment'*, *'Build a React website'*, or *'Learn Portuguese'*), and I will instantly break it down into manageable, bite-sized steps for you!",
        timestamp: new Date().toISOString(),
      };
      setTimeout(() => {
        setMessages([welcomeMessage]);
      }, 0);
      localStorage.setItem(key, JSON.stringify([welcomeMessage]));
    }
  }, []);

  // Save chat history to localStorage when changed
  const saveChatHistory = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(`taskflow_chat_history`, JSON.stringify(updatedMessages));
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    saveChatHistory(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls,
          })),
          tasks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI agent.');
      }

      const data = await response.json();

      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: data.content,
        timestamp: new Date().toISOString(),
        toolCalls: data.toolCalls && data.toolCalls.length > 0 ? data.toolCalls : undefined,
      };

      saveChatHistory([...newMessages, agentMessage]);

      // If tasks checklist was updated by tools, apply changes
      if (data.tasks) {
        onAgentUpdateTasks(data.tasks);
      }

    } catch (e: any) {
      console.error(e);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: `⚠️ Sorry, I encountered an error: ${e.message || 'Unknown error'}. Make sure your GEMINI_API_KEY is configured in Settings > Secrets.`,
        timestamp: new Date().toISOString(),
      };
      saveChatHistory([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      content: "Chat cleared. What project or goal would you like me to break down next?",
      timestamp: new Date().toISOString(),
    };
    saveChatHistory([welcomeMessage]);
  };

  // Format tool name for elegant user display
  const formatToolName = (name: string) => {
    switch (name) {
      case 'addTask': return 'Creating task breakdown';
      case 'addStep': return 'Adding detailed step';
      case 'updateTask': return 'Updating task details';
      case 'updateStep': return 'Updating step checkbox/title';
      case 'deleteTask': return 'Removing task completely';
      case 'deleteStep': return 'Deleting specific step';
      case 'listTasks': return 'Retrieving tasks list';
      default: return name;
    }
  };

  return (
    <div id="chat-panel-container" className="flex flex-col h-[650px] md:h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Panel Header */}
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

      {/* Messages Scrolling Area */}
      <div id="chat-messages-scroll" className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              id={`chat-msg-row-${message.id}`}
              key={message.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar icon */}
              <div
                id={`chat-msg-avatar-${message.id}`}
                className={`w-8 h-8 rounded-lg border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  isUser
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message box */}
              <div className="flex flex-col max-w-[85%] gap-2">
                <div
                  id={`chat-msg-bubble-${message.id}`}
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                      : 'bg-zinc-900 border border-zinc-800/80 text-zinc-300 rounded-tl-none whitespace-pre-line'
                  }`}
                >
                  {/* Basic parsing for markdown bold **text** */}
                  {message.content.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-zinc-100 font-bold">{part}</strong> : part
                  )}
                </div>

                {/* Visual Tool Calling Displays */}
                {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
                  <div id={`tool-calls-container-${message.id}`} className="space-y-2 ml-1">
                    {message.toolCalls.map((tc, tcIdx) => (
                      <div
                        id={`tool-call-${message.id}-${tcIdx}`}
                        key={tcIdx}
                        className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs font-mono text-zinc-400"
                      >
                        <div className="flex items-center gap-1.5 text-emerald-400/90 font-semibold mb-2">
                          <Terminal id={`tool-call-icon-${message.id}-${tcIdx}`} className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Tool Execution: {formatToolName(tc.name)}</span>
                        </div>
                        <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40 text-[11px] mb-1.5 max-h-24 overflow-y-auto">
                          <span className="text-zinc-500">Args:</span> {JSON.stringify(tc.args)}
                        </div>
                        {tc.result && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                            <span className="text-emerald-500 font-medium">Result:</span>
                            <span className="truncate">{tc.result.message || JSON.stringify(tc.result)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
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

      {/* Suggested Prompt Chips */}
      {messages.length <= 1 && (
        <div id="chat-suggestions-container" className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-950/50 relative z-10">
          <p id="chat-suggestions-title" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-yellow-500" /> Suggested Prompts
          </p>
          <div id="chat-suggestions-list" className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((sug, sIdx) => (
              <button
                id={`sug-chip-${sIdx}`}
                key={sIdx}
                onClick={() => handleSendMessage(sug.text)}
                className="text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl transition-all font-medium text-left focus:outline-none flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        id="chat-input-form"
        onSubmit={handleSubmit}
        className="p-4 border-t border-zinc-800 bg-zinc-900/30 relative z-10"
      >
        <div id="chat-input-wrapper" className="flex gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500/50 rounded-xl px-3.5 py-1.5 items-center transition-all">
          <input
            id="chat-input-field"
            type="text"
            disabled={isLoading}
            placeholder="Ask TaskFlow to break down a project..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow bg-transparent text-zinc-200 placeholder-zinc-600 border-none text-sm focus:outline-none py-1.5 focus:ring-0 disabled:opacity-50"
          />
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="text-emerald-500 hover:text-emerald-400 disabled:text-zinc-600 transition-colors p-1.5 focus:outline-none"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
