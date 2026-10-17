import type { Segment } from '@/agent/client/segments';

/**
 * Computes estimated reasoning/thought duration in seconds based on character count.
 * Assumes average reading/generation rate of ~220 characters per second.
 */
export function estimateThoughtDuration(text?: string | null): number {
  if (!text) return 1;
  return Math.max(1, Math.round(text.length / 220));
}

/**
 * Computes estimated duration for a consecutive group of tool invocations and reasoning segments.
 */
export function estimateWorkGroupDuration(items: Segment[]): number {
  let toolCount = 0;
  let reasoningChars = 0;
  for (const item of items) {
    if (item.type === 'tool') toolCount += 1;
    if (item.type === 'reasoning' && item.content) {
      reasoningChars += item.content.length;
    }
  }
  return Math.max(1, Math.ceil(toolCount * 1.5 + reasoningChars / 250));
}
