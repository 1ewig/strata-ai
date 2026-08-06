/** A selectable AI model option shown in the model picker. */
export interface ModelOption {
  id: string;
  label: string;
  family: string;
  /** Backend provider that serves this model (defaults to 'google'). */
  provider?: 'google' | 'fireworks';
  /** Approximate context window in tokens (display metadata only). */
  contextWindow: number;
  /** Maximum output tokens when the provider publishes one. */
  maxOutput?: number;
}

/** The catalog of AI models available for chat. */
export const MODELS: ModelOption[] = [
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    family: 'Gemini 3.5',
    contextWindow: 1048576,
    maxOutput: 65536,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    family: 'Gemini 3.1',
    contextWindow: 1048576,
    maxOutput: 65536,
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    family: 'Gemini 3',
    contextWindow: 1048576,
    maxOutput: 65536,
  },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT', family: 'Gemma 4', contextWindow: 262144 },
  { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT', family: 'Gemma 4', contextWindow: 131072 },
  {
    id: 'accounts/fireworks/models/deepseek-v4-flash-0731',
    label: 'DeepSeek V4 Flash 0731',
    family: 'DeepSeek',
    provider: 'fireworks',
    contextWindow: 1048576,
    maxOutput: 1048576,
  },
];

/** One-line descriptions keyed by model id, for tooltips and detail views. */
export const MODEL_DESCRIPTIONS: Record<string, string> = {
  'gemini-3.5-flash-lite': 'Ultra-fast lightweight variant',
  'gemini-3.1-flash-lite': 'Fastest responses, simple tasks',
  'gemini-3-flash-preview': 'Preview of latest Gemini 3',
  'gemma-4-31b-it': 'Open-weight, fully private',
  'gemma-4-26b-a4b-it': 'Efficient open model',
  'accounts/fireworks/models/deepseek-v4-flash-0731': 'Fast open-weight reasoning model',
};

/** Unique family names derived from MODELS, preserving insertion order. */
export const MODEL_FAMILIES = [...new Set(MODELS.map(m => m.family))];

/** Supported thinking-effort levels for models that expose the setting. */
export type ThinkingLevelId = 'minimal' | 'low' | 'medium' | 'high';

/** Display labels for each thinking level. */
export const THINKING_LEVEL_LABELS: Record<ThinkingLevelId, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Thinking-level configuration for a single model. */
export interface ModelThinkingConfig {
  levels: ThinkingLevelId[];
  defaultLevel: ThinkingLevelId;
}

/** Thinking levels per model id; only models listed here expose the setting. */
export const MODEL_THINKING_LEVELS: Record<string, ModelThinkingConfig> = {
  'gemini-3.5-flash-lite': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'low' },
  'gemini-3.1-flash-lite': { levels: ['minimal', 'high'], defaultLevel: 'minimal' },
  'gemini-3-flash-preview': { levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'high' },
  // DeepSeek V4 Flash supports low/high/max reasoning effort; the app maps to low/high
  // because the AI SDK's top-level reasoning option cannot express 'max'.
  'accounts/fireworks/models/deepseek-v4-flash-0731': { levels: ['low', 'high'], defaultLevel: 'high' },
};

// localStorage keys for persisting the user's model and thinking-level choices
const STORAGE_KEY = 'selectedModel';
const THINKING_LEVEL_KEY = 'selectedThinkingLevel';

/**
 * Resolves the initial model id for a session.
 * @returns The stored preference when valid, otherwise the NEXT_PUBLIC_GEMINI_MODEL
 * env var, falling back to the default lite model.
 */
export function getInitialModel(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Only trust a stored id that is still a valid catalog entry
    if (stored && MODELS.some(m => m.id === stored)) return stored;
  }
  return process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
}

/**
 * Persists the selected model id to localStorage.
 * @param modelId - The model id to store.
 */
export function saveModelPreference(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

/**
 * Resolves the thinking level for a model.
 * @param modelId - The model id to look up defaults for.
 * @returns The stored preference, or the model's default level (empty string
 * when the model has no thinking configuration).
 */
export function getStoredThinkingLevel(modelId: string): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THINKING_LEVEL_KEY);
    if (stored) return stored;
  }
  const config = MODEL_THINKING_LEVELS[modelId];
  return config?.defaultLevel || '';
}

/**
 * Persists the selected thinking level to localStorage.
 * @param level - The thinking level id to store.
 */
export function saveThinkingLevel(level: string): void {
  localStorage.setItem(THINKING_LEVEL_KEY, level);
}

/**
 * Validates a thinking level against a model's allowed set.
 * @param modelId - The model id to validate against.
 * @param level - The proposed thinking level id.
 * @returns The level when supported, otherwise the model's default (or an
 * empty string when the model has no thinking configuration).
 */
export function getValidThinkingLevelForModel(modelId: string, level: string): string {
  const config = MODEL_THINKING_LEVELS[modelId];
  if (!config) return '';
  if (config.levels.includes(level as ThinkingLevelId)) return level;
  return config.defaultLevel;
}
