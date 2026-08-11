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
  dropDirection?: 'up' | 'down';
}

export default function ModelSelectorMenu({
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  dropDirection = 'up',
}: ModelSelectorMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'effort' | 'more-models'>('main');

  const menuRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  // Primary models shown on main view; remaining live in "More models"
  const primaryModels = MODELS.slice(0, 3);
  const overflowModels = MODELS.slice(3);

  // Derive effective view so invalid subviews fall back to 'main' without cascading state effects
  const activeView =
    (view === 'effort' && !currentModelThinkingConfig) ||
    (view === 'more-models' && overflowModels.length === 0)
      ? 'main'
      : view;

  const effortLabel =
    thinkingLevel && currentModelThinkingConfig
      ? THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] || thinkingLevel
      : null;

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setView('main');
  }, []);

  // Handle click outside & escape key (attached ONLY when menu is open)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Reusable helper to render model items consistently
  const renderModelItem = (m: (typeof MODELS)[number]) => {
    const isSelected = m.id === model;
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => {
          onModelSelect(m.id);
          closeMenu();
        }}
        className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between group transition-colors cursor-pointer ${
          isSelected ? 'bg-surface-hover/70' : 'hover:bg-surface-hover'
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
        {isSelected && (
          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        )}
      </button>
    );
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {/* TRIGGER BUTTON (UNCHANGED) */}
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
        className={`flex items-center gap-1.5 text-label transition-all cursor-pointer shrink-0 select-none ${
          isOpen
            ? 'text-text-primary'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <span className="font-semibold text-text-primary truncate max-w-[130px] sm:max-w-[220px] md:max-w-[320px]">
          {currentModel?.label || 'Model'}
        </span>
        {effortLabel && (
          <span className="text-micro px-1.5 py-0.5 rounded-md bg-surface-hover text-text-muted font-medium capitalize shrink-0">
            {effortLabel}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>

      {/* POPOVER MENU */}
      {isOpen && (
        <div
          className={`absolute ${
            dropDirection === 'down' ? 'top-full mt-2 left-0' : 'bottom-full mb-2 right-0'
          } w-72 max-w-[calc(100vw-2rem)] bg-surface-elevated border border-edge-hover rounded-2xl shadow-card-lg p-1.5 text-label z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* SUBMENU HEADER */}
          {activeView !== 'main' && (
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-edge-default">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-1 text-caption font-semibold text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-caption font-semibold text-text-primary uppercase tracking-wider pr-2">
                {activeView === 'effort' ? 'Thinking Effort' : 'More Models'}
              </span>
            </div>
          )}

          {/* MAIN MENU VIEW */}
          {activeView === 'main' && (
            <>
              <div className="space-y-0.5">
                {primaryModels.map(renderModelItem)}
              </div>

              {(currentModelThinkingConfig || overflowModels.length > 0) && (
                <div className="h-px bg-edge-default my-1.5 mx-1" />
              )}

              <div className="space-y-0.5">
                {/* Effort Submenu Trigger */}
                {currentModelThinkingConfig && (
                  <button
                    type="button"
                    onClick={() => setView('effort')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <span>Effort</span>
                    <div className="flex items-center gap-1">
                      <span className="text-text-faint capitalize">
                        {effortLabel || 'Default'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  </button>
                )}

                {/* More Models Submenu Trigger */}
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

          {/* EFFORT OPTIONS SUBVIEW */}
          {activeView === 'effort' && currentModelThinkingConfig && (
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-label cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-surface-hover/70 font-medium text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="capitalize">{label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* MORE MODELS LIST SUBVIEW */}
          {activeView === 'more-models' && overflowModels.length > 0 && (
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {overflowModels.map(renderModelItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}