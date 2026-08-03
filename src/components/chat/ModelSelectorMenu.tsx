'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';

/** Props for the ModelSelectorMenu dropdown. */
interface ModelSelectorMenuProps {
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
}

/**
 * Dropdown for picking an AI model and, when the model supports it, its
 * thinking effort level. The main view lists the primary models with drill-down
 * submenus for "More models" and "Effort".
 *
 * @param model - Currently selected model id.
 * @param thinkingLevel - Currently selected thinking effort level.
 * @param onModelSelect - Called with the chosen model id.
 * @param onThinkingLevelChange - Called with the chosen thinking effort level.
 */
export default function ModelSelectorMenu({
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
}: ModelSelectorMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'effort' | 'more-models'>('main');

  const menuRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  // First three models appear on the main view; the rest live in "More models".
  const primaryModels = MODELS.length > 3 ? MODELS.slice(0, 3) : MODELS;
  const overflowModels = MODELS.length > 3 ? MODELS.slice(3) : [];

  // Show the effort chip only when the current model ships a thinking config;
  // fall back to the raw level string if it has no registered label.
  const effortLabel =
    thinkingLevel && currentModelThinkingConfig
      ? THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] || thinkingLevel
      : null;

  /**
   * Closes the popover and resets any drilled-down submenu back to the main view.
   */
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setView('main');
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            setIsOpen(true);
          }
        }}
        className={`flex items-center gap-1.5 text-label font-medium transition-all rounded-xl px-2 py-1 h-7 cursor-pointer shrink-0 border select-none ${
          isOpen
            ? 'bg-surface-hover text-text-primary border-edge-hover'
            : 'text-text-muted hover:text-text-primary bg-surface-base hover:bg-surface-hover/60 border-edge-raised'
        }`}
      >
        <span className="font-semibold text-text-primary truncate max-w-[110px] sm:max-w-[160px]">
          {currentModel?.label || 'Model'}
        </span>
        {effortLabel && (
          <span className="text-micro px-1 py-0.5 rounded-md bg-surface-hover text-text-muted font-normal capitalize">
            {effortLabel}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>

      {/* UNIFIED POPOVER MENU (For Mobile & Desktop) */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-72 max-w-[calc(100vw-2rem)] bg-surface-elevated border border-edge-hover rounded-2xl shadow-2xl p-1.5 text-label z-50 animate-in fade-in zoom-in-95 duration-100">

          {/* SUBMENU HEADER (When drilled down into Effort or More Models) */}
          {view !== 'main' && (
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-edge-default">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-1 text-caption font-semibold text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-caption font-semibold text-text-primary uppercase tracking-wider pr-2">
                {view === 'effort' ? 'Thinking Effort' : 'More Models'}
              </span>
            </div>
          )}

          {/* MAIN MENU VIEW */}
          {view === 'main' && (
            <>
              {/* Featured / Primary Models */}
              <div className="space-y-0.5">
                {primaryModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onModelSelect(m.id);
                      closeMenu();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                      }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-label font-semibold text-text-primary group-hover:text-text-bright">
                        {m.label}
                      </span>
                      {MODEL_DESCRIPTIONS[m.id] && (
                        <span className="text-caption text-text-muted line-clamp-1">
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

              {(currentModelThinkingConfig || overflowModels.length > 0) && (
                <div className="h-px bg-edge-default my-1.5 mx-1" />
              )}

              {/* Submenu Triggers */}
              <div className="space-y-0.5">
                {/* Effort Button */}
                {currentModelThinkingConfig && (
                  <button
                    type="button"
                    onClick={() => setView('effort')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <span>Effort</span>
                    <div className="flex items-center gap-1">
                      <span className="text-text-faint capitalize">{effortLabel || 'Default'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  </button>
                )}

                {/* More Models Button */}
                {overflowModels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setView('more-models')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <span>More models</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* SUBVIEW: EFFORT OPTIONS */}
          {view === 'effort' && currentModelThinkingConfig && (
            <div className="space-y-0.5">
              {currentModelThinkingConfig.levels.map((level) => {
                const label =
                  THINKING_LEVEL_LABELS[level as keyof typeof THINKING_LEVEL_LABELS] || level;
                const isSelected = thinkingLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      onThinkingLevelChange(level);
                      closeMenu();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-label cursor-pointer transition-colors ${isSelected
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

          {/* SUBVIEW: MORE MODELS LIST */}
          {view === 'more-models' && overflowModels.length > 0 && (
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {overflowModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onModelSelect(m.id);
                    closeMenu();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                    }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-label font-semibold text-text-primary group-hover:text-text-bright">
                      {m.label}
                    </span>
                    {MODEL_DESCRIPTIONS[m.id] && (
                      <span className="text-caption text-text-muted line-clamp-1">
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
      )}
    </div>
  );
}