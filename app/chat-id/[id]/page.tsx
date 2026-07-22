'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { BrainCircuit, FileText, ChevronDown, PanelRightOpen } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import Sidebar from '@/components/Sidebar';
import ResumeDrawer from '@/components/resumes/ResumeDrawer';
import { MODELS, MODEL_DESCRIPTIONS, getInitialModel, saveModelPreference, MODEL_THINKING_LEVELS, THINKING_LEVEL_LABELS, getStoredThinkingLevel, saveThinkingLevel, getValidThinkingLevelForModel } from '@/lib/models';
import ChatPanel from '@/components/ChatPanel';
import ChatInput from '@/components/chat/ChatInput';

export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  const [model, setModel] = useState(getInitialModel);
  const [thinkingLevel, setThinkingLevel] = useState(() => getValidThinkingLevelForModel(model, getStoredThinkingLevel(model)));
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    messages,
    resume,
    inputValue,
    setInputValue,
    isLoading,
    streamingContent,
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
    handleUpdateResume,
  } = useChat(chatId, model, thinkingLevel);

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

  const currentModel = MODELS.find(m => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <BrainCircuit className="w-5 h-5 text-zinc-950" />
              </div>
              <h1 className="text-base font-bold tracking-tight text-zinc-100">ResumeFlow</h1>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">TAILOR</span>
            </Link>
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
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gemini</p>
                      {MODELS.filter(m => m.provider === 'Gemini').map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-zinc-700 flex flex-col ${m.id === model ? 'bg-zinc-700/50' : ''}`}
                        >
                          <span className="text-sm font-medium text-zinc-200">{m.label}</span>
                          <span className="text-xs text-zinc-500">{MODEL_DESCRIPTIONS[m.id]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-zinc-700 py-1">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gemma 4</p>
                      {MODELS.filter(m => m.provider === 'Gemma 4').map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-zinc-700 flex flex-col ${m.id === model ? 'bg-zinc-700/50' : ''}`}
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
                      <option key={level} value={level} className="bg-zinc-800">{THINKING_LEVEL_LABELS[level]}</option>
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
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all font-medium"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
              Resume Drawer
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-0 pb-28 relative">
          <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4">
            <ChatPanel
              messages={messages}
              streamingContent={streamingContent}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              onSendMessage={handleSendMessage}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-8 pb-4 px-4">
            <div className="max-w-2xl mx-auto">
              <ChatInput
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
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
