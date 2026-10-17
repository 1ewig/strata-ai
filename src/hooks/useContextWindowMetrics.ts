'use client';

import { useMemo } from 'react';
import { MODELS, type ModelOption } from '@/lib/models';
import { NEAR_LIMIT_PERCENT } from '@/lib/limits';
import type { ConversationTokenMetrics } from '@/lib/token-usage';

export interface ContextWindowMetrics {
  modelOption: ModelOption;
  contextWindow: number;
  activeTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalApiUsage: number;
  totalCost: number;
  modelBreakdowns: ConversationTokenMetrics['modelBreakdowns'];
  pct: number;
  isNearLimit: boolean;
}

/**
 * Computes context window utilization and token metrics for a selected model and conversation.
 */
export function useContextWindowMetrics(
  model?: string,
  tokenUsage?: ConversationTokenMetrics | null
): ContextWindowMetrics {
  return useMemo(() => {
    const modelOption = MODELS.find((m) => m.id === model) || MODELS[0];
    const { contextWindow } = modelOption;

    const activeTokens = tokenUsage?.active.totalTokens ?? 0;
    const inputTokens = tokenUsage?.active.inputTokens ?? 0;
    const outputTokens = tokenUsage?.active.outputTokens ?? 0;
    const totalApiUsage = tokenUsage?.session.totalApiTokens ?? activeTokens;
    const totalCost = tokenUsage?.totalCost ?? 0;
    const modelBreakdowns = tokenUsage?.modelBreakdowns ?? [];

    const pct =
      contextWindow > 0
        ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
        : 0;

    const isNearLimit = pct >= NEAR_LIMIT_PERCENT;

    return {
      modelOption,
      contextWindow,
      activeTokens,
      inputTokens,
      outputTokens,
      totalApiUsage,
      totalCost,
      modelBreakdowns,
      pct,
      isNearLimit,
    };
  }, [model, tokenUsage]);
}
