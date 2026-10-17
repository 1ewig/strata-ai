import { Globe, FileText, Compass, type LucideIcon } from 'lucide-react';

/** Quick-action suggestion chips for the Dribbble-style hero empty state. */
export interface SuggestionChip {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

export const SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    icon: Globe,
    label: 'Web Research',
    prompt: 'Search the web for the latest updates on AI agents and summarize key findings into a new workspace file.',
  },
  {
    icon: FileText,
    label: 'Draft Document',
    prompt: 'Create a structured project proposal document in the workspace with milestones and technical architecture.',
  },
  {
    icon: Compass,
    label: 'Analyze Workspace',
    prompt: 'List and analyze all current workspace files, providing a comprehensive executive summary.',
  },
];

/** Pool of short, engaging welcome greetings for new chats. */
export const WELCOME_MESSAGES: readonly string[] = [
  'What would you like to build or edit today?',
  'How can I help with your workspace today?',
  'What are we working on today?',
  'Ready to create, edit, or analyze your files.',
  'What would you like to research or draft?',
  'How can Strata AI assist your workspace today?',
];

/** Available placeholder prompts for the chat input. */
export const PLACEHOLDER_PROMPTS: readonly string[] = [
  'How can Strata help?',
  'What are you working on?',
  'Research, write, or build...',
  'Draft, edit, or search...',
  'Ask, plan, or create...',
];

/**
 * Selects a random placeholder prompt index, avoiding picking the same prompt
 * consecutively when multiple options are available.
 *
 * @param excludeIndex - Optional index to avoid selecting
 * @returns A randomized index within PLACEHOLDER_PROMPTS
 */
export function getRandomPlaceholderIndex(excludeIndex?: number): number {
  if (PLACEHOLDER_PROMPTS.length <= 1) return 0;
  let nextIndex: number;
  do {
    nextIndex = Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length);
  } while (excludeIndex !== undefined && nextIndex === excludeIndex);
  return nextIndex;
}

/**
 * Returns a stable welcome greeting for a given conversation ID using deterministic hashing.
 *
 * @param chatId - Optional unique conversation ID
 * @returns Welcome greeting string
 */
export function getWelcomeMessage(chatId?: string): string {
  if (!chatId) return WELCOME_MESSAGES[0];
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = (hash << 5) - hash + chatId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WELCOME_MESSAGES.length;
  return WELCOME_MESSAGES[index];
}
