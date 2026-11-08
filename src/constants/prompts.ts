import { Globe, FileText, Compass, type LucideIcon } from 'lucide-react';

/** Quick-action suggestion chips for the Dribbble-style hero empty state. */
export interface SuggestionChip {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

/**
 * Open-ended prompt seeds injected into the chat input when a chip is clicked.
 * Intentionally incomplete so the user finishes the thought themselves rather
 * than sending a pre-written end-to-end message.
 */
export const SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    icon: Globe,
    label: 'Web Research',
    prompt: 'Search the web for ',
  },
  {
    icon: FileText,
    label: 'Draft Document',
    prompt: 'Draft a document about ',
  },
  {
    icon: Compass,
    label: 'Analyze Workspace',
    prompt: 'Analyze my workspace and ',
  },
];

/** Pool of short, engaging welcome greetings for new chats. */
export const WELCOME_MESSAGES: readonly string[] = [
  'Ready when you are',
  "Let's make something great",
  'Pick a place to start',
  'How can I help you today',
  "What's on your mind today",

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
