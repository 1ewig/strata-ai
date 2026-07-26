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

export function useModelSettings(chatId: string, currentConv?: Conversation) {
  const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const [model, setModel] = useState(defaultModel);
  const [thinkingLevel, setThinkingLevel] = useState<string>(() => {
    const config = MODEL_THINKING_LEVELS[defaultModel];
    return config?.defaultLevel || '';
  });

  useEffect(() => {
    const storedModel = getInitialModel();
    if (storedModel !== model) setModel(storedModel);
    setThinkingLevel(
      getValidThinkingLevelForModel(storedModel, getStoredThinkingLevel(storedModel)),
    );
  }, []);

  useEffect(() => {
    if (currentConv?.model) {
      setModel(currentConv.model);
      if (currentConv.thinkingLevel) {
        setThinkingLevel(currentConv.thinkingLevel);
      }
    }
  }, [currentConv?.id, currentConv?.model, currentConv?.thinkingLevel]);

  const handleModelSelect = (id: string) => {
    setModel(id);
    saveModelPreference(id);
    const currentLevel = getStoredThinkingLevel(id);
    const valid = getValidThinkingLevelForModel(id, currentLevel);
    setThinkingLevel(valid);
    saveThinkingLevel(valid);
    updateConversationModel(chatId, id, valid);
  };

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
