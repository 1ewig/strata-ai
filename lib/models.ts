export interface ModelOption {
  id: string;
  label: string;
  family: string;
}

export const MODELS: ModelOption[] = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', family: 'Gemini 3.6' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', family: 'Gemini 3.5' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', family: 'Gemini 3.5' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', family: 'Gemini 3.1' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', family: 'Gemini 3' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT', family: 'Gemma 4' },
  { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT', family: 'Gemma 4' },
];

export const MODEL_DESCRIPTIONS: Record<string, string> = {
  'gemini-3.6-flash': 'Latest — great speed and quality',
  'gemini-3.5-flash': 'Best overall for most tasks',
  'gemini-3.5-flash-lite': 'Ultra-fast lightweight variant',
  'gemini-3.1-flash-lite': 'Fastest responses, simple tasks',
  'gemini-3-flash-preview': 'Preview of latest Gemini 3',
  'gemma-4-31b-it': 'Open-weight, fully private',
  'gemma-4-26b-a4b-it': 'Efficient open model',
};

export const MODEL_FAMILIES = [...new Set(MODELS.map(m => m.family))];

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
  'gemini-3.5-flash': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'medium' },
  'gemini-3.5-flash-lite': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'low' },
  'gemini-3.6-flash': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'medium' },
  'gemini-3.1-flash-lite': { levels: ['minimal', 'high'], defaultLevel: 'minimal' },
  'gemini-3-flash-preview': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'high' },
};

const STORAGE_KEY = 'selectedModel';
const THINKING_LEVEL_KEY = 'selectedThinkingLevel';

export function getInitialModel(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && MODELS.some(m => m.id === stored)) return stored;
  }
  return process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
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
