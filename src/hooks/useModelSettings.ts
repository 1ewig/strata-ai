'use client';

import { useState, useEffect } from 'react';
import {
  getInitialModel,
  saveModelPreference,
  getStoredThinkingLevel,
  saveThinkingLevel,
  getValidThinkingLevelForModel,
  MODEL_THINKING_LEVELS,
} from '@/lib/models';
import { updateConversationModel, Conversation } from '@/lib/db/db';

/**
 * Owns the selected model and thinking level for a chat session.
 * Initializes from stored preferences, re-syncs when the active conversation
 * changes, and persists every change to local storage and the conversation row.
 */
export function useModelSettings(chatId: string, currentConv?: Conversation) {
  const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const [model, setModel] = useState(() => {
    return getInitialModel() || defaultModel;
  });
  const [thinkingLevel, setThinkingLevel] = useState<string>(() => {
    const storedModel = getInitialModel() || defaultModel;
    return getValidThinkingLevelForModel(storedModel, getStoredThinkingLevel(storedModel));
  });

  // Re-hydrate state from the conversation row when switching chats, during render
  const [prevConvId, setPrevConvId] = useState(currentConv?.id);
  if (currentConv?.id !== prevConvId) {
    setPrevConvId(currentConv?.id);
    if (currentConv?.model) {
      setModel(currentConv.model);
      setThinkingLevel(
        currentConv.thinkingLevel ||
          getValidThinkingLevelForModel(currentConv.model, ''),
      );
    }
  }


  /**
   * Applies a model selection, clamping the thinking level to what that model supports.
   * @param id - The model identifier to select.
   */
  const handleModelSelect = (id: string) => {
    setModel(id);
    saveModelPreference(id);
    const currentLevel = getStoredThinkingLevel(id);
    const valid = getValidThinkingLevelForModel(id, currentLevel);
    setThinkingLevel(valid);
    saveThinkingLevel(valid);
    updateConversationModel(chatId, id, valid);
  };

  /**
   * Updates the thinking level for the current model.
   * @param level - The new thinking level to apply.
   */
  const handleThinkingLevelChange = (level: string) => {
    setThinkingLevel(level);
    saveThinkingLevel(level);
    updateConversationModel(chatId, model, level);
  };

  return {
    model,
    thinkingLevel,
    handleModelSelect,
    handleThinkingLevelChange,
    setModel,
    setThinkingLevel,
  };
}
