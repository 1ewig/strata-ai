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
    <header className="h-14 border-b border-edge-default bg-surface-base/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-secondary truncate max-w-xs sm:max-w-md">
          {resumeTitle || 'Chat Workspace'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-row gap-1.5 items-center">
          <div className="relative" ref={modelMenuRef}>
            <button
              id="model-selector-btn"
              onClick={() => setModelMenuOpen(prev => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary px-2.5 py-1.5 rounded-lg hover:bg-surface-hover/60 transition-colors"
            >
              {currentModel?.label || 'Select model'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {modelMenuOpen && (
              <div className="absolute mt-1 right-0 w-60 bg-surface-elevated border border-edge-hover rounded-xl shadow-xl overflow-hidden text-sm z-50">
                <div className="py-1">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onModelSelect(m.id);
                        setModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-surface-hover flex flex-col ${
                        m.id === model ? 'bg-surface-hover/60' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-text-primary">{m.label}</span>
                      <span className="text-xs text-text-muted">{MODEL_DESCRIPTIONS[m.id]}</span>
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
                className="text-xs text-text-muted bg-transparent border border-edge-raised rounded-md appearance-none cursor-pointer hover:text-text-primary hover:border-edge-hover focus:outline-none focus:text-text-primary focus:border-edge-hover px-2 py-1 pr-6 transition-colors"
              >
                {currentModelThinkingConfig.levels.map(level => (
                  <option key={level} value={level} className="bg-surface-elevated">
                    {THINKING_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-edge-raised" />

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
