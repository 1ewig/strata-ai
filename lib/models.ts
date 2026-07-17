export interface ModelOption {
  id: string;
  label: string;
  provider: 'Gemini' | 'Gemma 4';
}

export const MODELS: ModelOption[] = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', provider: 'Gemini' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Gemini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Gemini' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT', provider: 'Gemma 4' },
  { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT', provider: 'Gemma 4' },
  { id: 'gemma-4-e4b-it', label: 'Gemma 4 E4B IT', provider: 'Gemma 4' },
  { id: 'gemma-4-e2b-it', label: 'Gemma 4 E2B IT', provider: 'Gemma 4' },
];

export type ThinkingLevelId = 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_LEVEL_LABELS: Record<ThinkingLevelId, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export interface ModelThinkingConfig {
  levels: ThinkingLevelId[];
  defaultLevel: ThinkingLevelId;
}

export const MODEL_THINKING_LEVELS: Record<string, ModelThinkingConfig> = {
  'gemini-3.1-flash-lite': { levels: ['minimal', 'high'], defaultLevel: 'minimal' },
  'gemini-2.5-flash': { levels: ['low', 'medium', 'high'], defaultLevel: 'medium' },
  'gemini-2.5-pro': { levels: ['low', 'medium', 'high'], defaultLevel: 'medium' },
};

const STORAGE_KEY = 'selectedModel';
const THINKING_LEVEL_KEY = 'selectedThinkingLevel';

export function getInitialModel(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && MODELS.some(m => m.id === stored)) return stored;
  }
  return process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite';
}

export function saveModelPreference(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

export function getStoredThinkingLevel(modelId: string): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THINKING_LEVEL_KEY);
    if (stored) return stored;
  }
  const config = MODEL_THINKING_LEVELS[modelId];
  return config?.defaultLevel || '';
}

export function saveThinkingLevel(level: string): void {
  localStorage.setItem(THINKING_LEVEL_KEY, level);
}

export function getValidThinkingLevelForModel(modelId: string, level: string): string {
  const config = MODEL_THINKING_LEVELS[modelId];
  if (!config) return '';
  if (config.levels.includes(level as ThinkingLevelId)) return level;
  return config.defaultLevel;
}
