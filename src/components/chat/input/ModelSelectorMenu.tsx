'use client';

import React from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Settings } from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';
import { useModelSelectorMenu } from '@/hooks/useModelSelectorMenu';

/** Props for the ModelSelectorMenu dropdown. */
interface ModelSelectorMenuProps {
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
  dropDirection?: 'up' | 'down';
  align?: 'left' | 'right';
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Model selector menu dropdown component.
 * Uses useModelSelectorMenu to manage subview transitions and click-outside dismissal.
 */
export default function ModelSelectorMenu({
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
  dropDirection = 'down',
  align = 'right',
  id,
  className = '',
  disabled = false,
}: ModelSelectorMenuProps) {
  const {
    isOpen,
    view,
    setView,
    menuRef,
    currentModel,
    currentModelThinkingConfig,
    primaryModels,
    overflowModels,
    effortLabel,
    closeMenu,
    toggleMenu,
  } = useModelSelectorMenu({
    model,
    thinkingLevel,
    disabled,
  });

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
        className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between group transition-all duration-150 active:scale-[0.99] cursor-pointer ${
          isSelected
            ? 'bg-primary-soft text-primary font-semibold'
            : 'text-text-primary hover:bg-surface-hover'
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-label font-semibold ${
              isSelected ? 'text-primary' : 'text-text-primary group-hover:text-text-bright'
            }`}
          >
            {m.label}
          </span>
          {MODEL_DESCRIPTIONS[m.id] && (
            <span
              className={`text-caption line-clamp-1 ${
                isSelected ? 'text-primary/75' : 'text-text-muted'
              }`}
            >
              {MODEL_DESCRIPTIONS[m.id]}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      {/* TRIGGER BUTTON: Gear icon on mobile, Model name pill + effort badge + chevron on tablet/desktop */}
      <button
        type="button"
        id={id || 'chat-model-selector-btn'}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-label={`Select model (current: ${currentModel?.label || 'Model'})`}
        title={
          disabled
            ? 'Model selection unavailable while responding'
            : `Model: ${currentModel?.label || 'Model'}${effortLabel ? ` (${effortLabel} effort)` : ''}`
        }
        onClick={toggleMenu}
        className={`p-2 sm:px-3 sm:py-2 rounded-xl shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center sm:justify-start gap-1.5 border select-none ${
          disabled
            ? 'bg-surface-elevated text-text-muted border-edge-raised shadow-none opacity-40 cursor-not-allowed'
            : isOpen
              ? 'group bg-surface-hover border-edge-hover text-text-bright ring-2 ring-primary/20 shadow-button cursor-pointer'
              : 'group bg-surface-raised/80 hover:bg-surface-hover text-text-primary hover:border-edge-hover active:scale-95 border-edge-raised shadow-button cursor-pointer'
        }`}
      >
        {/* Mobile View: Gear Icon */}
        <div className="sm:hidden flex items-center justify-center">
          <Settings
            className={`w-4 h-4 transition-transform duration-200 ${
              disabled
                ? 'text-text-muted'
                : isOpen
                  ? 'rotate-45 text-primary'
                  : 'text-text-muted group-hover:text-primary'
            }`}
          />
        </div>

        {/* Desktop/Tablet View: Model Name + Effort Badge + Chevron */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className={`text-caption font-semibold truncate max-w-[120px] md:max-w-[180px] lg:max-w-[240px] ${
              disabled ? 'text-text-muted' : 'text-text-primary'
            }`}
          >
            {currentModel?.label || 'Model'}
          </span>
          {effortLabel && (
            <span
              className={`text-micro px-1.5 py-0.5 rounded-md border text-text-muted font-medium capitalize shrink-0 ${
                disabled
                  ? 'bg-surface-elevated border-edge-raised'
                  : 'bg-surface-base border-edge-default'
              }`}
            >
              {effortLabel}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
              disabled
                ? ''
                : isOpen
                  ? 'rotate-180 text-text-primary'
                  : 'group-hover:text-text-primary'
            }`}
          />
        </div>
      </button>

      {/* POPOVER MENU */}
      {isOpen && (
        <div
          className={`absolute ${
            dropDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
          } ${
            align === 'left' ? 'left-0' : 'right-0'
          } w-72 max-w-[calc(100vw-1.5rem)] bg-surface-elevated border border-edge-raised rounded-2xl shadow-card-lg p-1.5 text-label z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* SUBMENU HEADER */}
          {view !== 'main' && (
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-edge-default">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-1 text-caption font-semibold text-text-muted hover:text-text-primary active:scale-95 px-2 py-1 rounded-lg hover:bg-surface-hover transition-all duration-150 cursor-pointer"
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-[0.98] cursor-pointer transition-all duration-150"
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-[0.98] cursor-pointer transition-all duration-150"
                  >
                    <span>More models</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* EFFORT OPTIONS SUBVIEW */}
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-label cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                      isSelected
                        ? 'bg-primary-soft text-primary font-semibold'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="capitalize">{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* MORE MODELS LIST SUBVIEW */}
          {view === 'more-models' && overflowModels.length > 0 && (
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {overflowModels.map(renderModelItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}