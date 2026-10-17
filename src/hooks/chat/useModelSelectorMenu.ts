'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  MODELS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/ai/models';
import { useClickOutside } from '../common/useClickOutside';

export interface UseModelSelectorMenuOptions {
  model: string;
  thinkingLevel: string;
  disabled?: boolean;
}

/**
 * Controller hook for the ModelSelectorMenu component.
 * Manages open/close state, subview transitions ('main', 'effort', 'more-models'),
 * and click-outside/escape dismissal.
 */
export function useModelSelectorMenu({
  model,
  thinkingLevel,
  disabled = false,
}: UseModelSelectorMenuOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'effort' | 'more-models'>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  const currentModel = useMemo(() => MODELS.find((m) => m.id === model), [model]);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  const primaryModels = useMemo(() => MODELS.slice(0, 3), []);
  const overflowModels = useMemo(() => MODELS.slice(3), []);

  const activeView =
    (view === 'effort' && !currentModelThinkingConfig) ||
    (view === 'more-models' && overflowModels.length === 0)
      ? 'main'
      : view;

  const effortLabel = useMemo(() => {
    if (!thinkingLevel || !currentModelThinkingConfig) return null;
    return (
      THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] ||
      thinkingLevel
    );
  }, [thinkingLevel, currentModelThinkingConfig]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setView('main');
  }, []);

  const toggleMenu = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setView('main');
    }
  }, [disabled, isOpen]);

  useClickOutside(menuRef, closeMenu, { enabled: isOpen });

  return {
    isOpen,
    view: activeView,
    setView,
    menuRef,
    currentModel,
    currentModelThinkingConfig,
    primaryModels,
    overflowModels,
    effortLabel,
    closeMenu,
    toggleMenu,
  };
}
