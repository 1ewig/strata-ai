'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronRight, Check, AlertCircle } from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  rateLimitData: rateLimitDataProp,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'effort' | 'more-models'>('none');

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentModel = MODELS.find(m => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  // Divide models into Primary featured models and Overflow models
  const primaryModels = MODELS.length > 3 ? MODELS.slice(0, 3) : MODELS;
  const overflowModels = MODELS.length > 3 ? MODELS.slice(3) : MODELS;

  const rateLimitData = rateLimitDataProp ?? null;
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);

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
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (text && !isLoading && !isQuotaExhausted) {
      onSendMessage(text);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const effortLabel = thinkingLevel && currentModelThinkingConfig
    ? THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] || thinkingLevel
    : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="relative z-10"
    >
      <div className={`flex flex-col gap-2 bg-surface-raised border ${
        isQuotaExhausted ? 'border-danger/40 bg-danger-soft/20' : 'border-edge-hover/60 focus-within:border-edge-hover'
      } rounded-2xl p-3.5 transition-all shadow-lg`}>

        {/* Row 1: Text Field Input or Quota Warning directly on the input field */}
        {isQuotaExhausted ? (
          <div className="w-full min-h-[48px] py-1 flex items-center gap-2 text-danger text-sm font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>
              {rateLimitData?.remaining5h === 0
                ? '5-hour limit reached (10/10 msgs used).'
                : 'Weekly limit reached (50/50 msgs used).'}
              {rateLimitData?.retryAfter
                ? ` Resets in ~${Math.ceil(rateLimitData.retryAfter / 60)} min.`
                : ' Please wait before sending.'}
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id="chat-input-field"
            rows={2}
            disabled={isLoading}
            placeholder="Message Strata AI..."
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-text-primary placeholder-text-muted border-none text-sm focus:outline-none resize-none min-h-[48px] max-h-48 py-1 focus:ring-0 disabled:opacity-50"
          />
        )}

        {/* Row 2: Bottom Toolbar (Model Dropdown & Quota Ring on Left, Send Button on Right) */}
        <div className="flex items-center justify-between pt-1">

          {/* Left Side Controls: Model Dropdown & Quota Ring */}
          <div className="flex items-center gap-2">

            {/* Model Dropdown Trigger & Popover Container */}
            <div className="relative flex items-center">
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
                        className={`w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${
                          m.id === model ? 'bg-surface-hover/70' : ''
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
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                            activeSubmenu === 'effort'
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
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary-soft text-primary font-medium'
                                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                                  }`}
                                >
                                  <span className="capitalize">{label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                          activeSubmenu === 'more-models'
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
                              className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${
                                m.id === model ? 'bg-surface-hover/70' : ''
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
                                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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

            {/* Rate Limit Ring Indicator */}
            {rateLimitData !== null && (
              <div className="relative group flex items-center">
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-base border text-xs font-medium cursor-help transition-colors ${
                  isQuotaExhausted ? 'border-danger/40 bg-danger-soft/40' : 'border-edge-raised'
                }`}>
                  <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 20 20">
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="text-edge-default"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeDasharray={43.98}
                      strokeDashoffset={43.98 * (1 - Math.min(1, Math.max(0, rateLimitData.remaining5h / 10)))}
                      strokeLinecap="round"
                      className={`transition-all duration-500 ${
                        rateLimitData.remaining5h > 3
                          ? 'text-primary'
                          : rateLimitData.remaining5h > 1
                          ? 'text-warning'
                          : 'text-danger'
                      }`}
                    />
                  </svg>
                  <span className={`text-[11px] font-medium ${isQuotaExhausted ? 'text-danger font-semibold' : 'text-text-muted'}`}>
                    {rateLimitData.remaining5h} left
                  </span>
                </div>

                {/* Popover Tooltip on Hover */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-56 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-2.5 text-xs text-text-primary z-50 animate-in fade-in zoom-in-95 pointer-events-none">
                  <div className="font-semibold text-text-bright mb-1.5 flex items-center justify-between">
                    <span>Remaining Messages</span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      isQuotaExhausted ? 'bg-danger/15 text-danger' : 'bg-surface-base text-text-faint'
                    }`}>
                      {isQuotaExhausted ? 'Exhausted' : 'Quota'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-text-muted">
                    <div className="flex items-center justify-between">
                      <span>5-hour window:</span>
                      <span className={`font-semibold ${rateLimitData.remaining5h === 0 ? 'text-danger' : 'text-primary'}`}>
                        {rateLimitData.remaining5h} of 10 left
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>7-day window:</span>
                      <span className={`font-semibold ${rateLimitData.remainingWeek === 0 ? 'text-danger' : 'text-primary'}`}>
                        {rateLimitData.remainingWeek} of 50 left
                      </span>
                    </div>
                    {rateLimitData.retryAfter && (
                      <div className="pt-1 border-t border-edge-default text-[10px] text-danger flex items-center justify-between font-medium">
                        <span>Resets in:</span>
                        <span>~{Math.ceil(rateLimitData.retryAfter / 60)} minutes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            )}

          </div>

          {/* Send Button */}
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={isLoading || !inputValue.trim() || isQuotaExhausted}
            className="p-2 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-surface-elevated disabled:opacity-40 shrink-0 transition-colors focus:outline-none cursor-pointer"
            title={isQuotaExhausted ? "Quota limit reached" : "Send message"}
          >
            <ArrowUp className="w-4 h-4 text-surface" />
          </button>
        </div>

      </div>
    </form>
  );
}