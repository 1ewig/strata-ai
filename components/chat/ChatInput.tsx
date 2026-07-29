'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
}

export default function ChatInput({
  inputValue,
  onInputChange,
  onSubmit,
  isLoading,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'effort' | 'more-models'>('none');

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentModel = MODELS.find(m => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  // Divide models into Primary featured models and Overflow models
  const primaryModels = MODELS.length > 3 ? MODELS.slice(0, 3) : MODELS;
  const overflowModels = MODELS.length > 3 ? MODELS.slice(3) : MODELS;

  // Handle outside clicks to close the menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setActiveSubmenu('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const effortLabel = thinkingLevel && currentModelThinkingConfig
    ? THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] || thinkingLevel
    : null;

  return (
    <form onSubmit={onSubmit} className="relative z-10">
      <div className="flex items-end gap-2 bg-surface-raised border border-edge-hover/60 focus-within:border-edge-hover rounded-2xl px-4 py-3 transition-all">

        {/* Model Dropdown Trigger & Popover Container */}
        <div className="relative flex items-center self-stretch">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setMenuOpen(prev => {
                if (prev) setActiveSubmenu('none');
                return !prev;
              });
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary bg-surface-base hover:bg-surface-hover/60 border border-edge-raised px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span>{currentModel?.label || 'Model'}</span>
            {effortLabel && (
              <span className="text-text-faint font-normal capitalize">{effortLabel}</span>
            )}
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {/* Main Dropdown Menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 mb-2 w-72 bg-surface-elevated border border-edge-hover rounded-2xl shadow-2xl p-1.5 text-sm z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Featured Primary Models List */}
              <div className="space-y-0.5">
                {primaryModels.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onModelSelect(m.id);
                      setMenuOpen(false);
                      setActiveSubmenu('none');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                      }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-text-primary group-hover:text-text-bright">
                        {m.label}
                      </span>
                      {MODEL_DESCRIPTIONS[m.id] && (
                        <span className="text-[11px] text-text-muted line-clamp-1">
                          {MODEL_DESCRIPTIONS[m.id]}
                        </span>
                      )}
                    </div>
                    {m.id === model && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>

              <div className="h-px bg-edge-default my-1.5 mx-1" />

              {/* Overflow Menus: Effort & More Models */}
              <div className="space-y-0.5 relative">

                {/* 1. Effort Overflow Option */}
                {currentModelThinkingConfig && (
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('effort')}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu(prev => prev === 'effort' ? 'none' : 'effort')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${activeSubmenu === 'effort'
                          ? 'bg-surface-hover text-text-primary'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                        }`}
                    >
                      <span>Effort</span>
                      <div className="flex items-center gap-1 text-text-muted">
                        <span className="text-text-faint capitalize">{effortLabel || 'Default'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Effort Submenu Flyout Panel */}
                    {activeSubmenu === 'effort' && (
                      <div className="absolute left-full bottom-0 ml-1.5 w-48 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50">
                        <div className="px-2.5 py-1 text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                          Thinking Level
                        </div>
                        {currentModelThinkingConfig.levels.map(level => {
                          const label = THINKING_LEVEL_LABELS[level as keyof typeof THINKING_LEVEL_LABELS] || level;
                          const isSelected = thinkingLevel === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                onThinkingLevelChange(level);
                                setMenuOpen(false);
                                setActiveSubmenu('none');
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected
                                  ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                                }`}
                            >
                              <span className="capitalize">{label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. More Models Overflow Option */}
                <div
                  className="relative"
                  onMouseEnter={() => setActiveSubmenu('more-models')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(prev => prev === 'more-models' ? 'none' : 'more-models')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${activeSubmenu === 'more-models'
                        ? 'bg-surface-hover text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                  >
                    <span>More models</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </button>

                  {/* More Models Submenu Flyout Panel */}
                  {activeSubmenu === 'more-models' && (
                    <div className="absolute left-full bottom-0 ml-1.5 w-64 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 max-h-64 overflow-y-auto">
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                        Other Models
                      </div>
                      {overflowModels.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onModelSelect(m.id);
                            setMenuOpen(false);
                            setActiveSubmenu('none');
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                            }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-text-primary group-hover:text-text-bright">
                              {m.label}
                            </span>
                            {MODEL_DESCRIPTIONS[m.id] && (
                              <span className="text-[11px] text-text-muted line-clamp-1">
                                {MODEL_DESCRIPTIONS[m.id]}
                              </span>
                            )}
                          </div>
                          {m.id === model && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Text Field Input */}
        <textarea
          ref={textareaRef}
          id="chat-input-field"
          rows={1}
          disabled={isLoading}
          placeholder="Message Strata AI..."
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted border-none text-sm focus:outline-none resize-none max-h-40 py-2 focus:ring-0 disabled:opacity-50"
        />

        {/* Send Button */}
        <button
          id="chat-submit-btn"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-2 rounded-lg bg-text-primary hover:bg-text-bright disabled:bg-surface-elevated disabled:opacity-40 shrink-0 transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowUp className="w-4 h-4 text-surface-base" />
        </button>
      </div>

      <p className="text-center text-xs text-text-faint mt-2">
        Strata AI can make mistakes. Verify important info.
      </p>
    </form>
  );
}