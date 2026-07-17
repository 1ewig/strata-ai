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

const STORAGE_KEY = 'selectedModel';

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
