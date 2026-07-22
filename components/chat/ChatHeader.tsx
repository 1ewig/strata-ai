'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, PanelRightOpen } from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';

interface ChatHeaderProps {
  resumeTitle?: string;
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
  onOpenResumeDrawer: () => void;
}

export default function ChatHeader({
  resumeTitle,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  onOpenResumeDrawer,
}: ChatHeaderProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
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

  const currentModel = MODELS.find(m => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  return (
    <header className="h-14 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-300 truncate max-w-xs sm:max-w-md">
          {resumeTitle || 'Chat Workspace'}
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
                      onClick={() => {
                        onModelSelect(m.id);
                        setModelMenuOpen(false);
                      }}
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
                      onClick={() => {
                        onModelSelect(m.id);
                        setModelMenuOpen(false);
                      }}
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
                onChange={e => onThinkingLevelChange(e.target.value)}
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
          onClick={onOpenResumeDrawer}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all font-medium cursor-pointer"
        >
          <PanelRightOpen className="w-3.5 h-3.5" />
          Resume Drawer
        </button>
      </div>
    </header>
  );
}
