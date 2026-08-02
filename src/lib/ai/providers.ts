import { google } from "@ai-sdk/google";
import { fireworks } from "@ai-sdk/fireworks";
import { streamText, type LanguageModel } from "ai";
import { MODELS } from "@/lib/models";

/** Default model used when the client omits or sends an unknown model id. */
export const DEFAULT_AGENT_MODEL = "gemini-3.5-flash-lite";

/** Backend providers the agent endpoint can route to. */
export type ModelProvider = "google" | "fireworks";

/** Provider lookup derived from the MODELS catalog (client-facing shape, server-side only usage). */
const providerByModelId: Record<string, ModelProvider> = Object.fromEntries(
  MODELS.filter((m) => m.provider).map((m) => [m.id, m.provider as ModelProvider]),
);

/**
 * Returns the backend provider responsible for a model id.
 * @param modelId - The catalog model id.
 * @returns 'fireworks' for Fireworks-hosted ids, otherwise 'google'.
 */
export function getModelProvider(modelId: string): ModelProvider {
  return providerByModelId[modelId] || "google";
}

/**
 * Maps app thinking levels to DeepSeek V4 Flash reasoning effort. The model
 * exposes low/high/max, but the AI SDK's top-level reasoning option cannot
 * express 'max', so the app levels collapse onto low/high.
 */
const DEEPSEEK_EFFORT: Record<string, "low" | "high"> = {
  minimal: "low",
  low: "low",
  medium: "high",
  high: "high",
};

/** Fireworks-hosted DeepSeek V4 Flash model id. */
export const DEEPSEEK_V4_FLASH_MODEL = "accounts/fireworks/models/deepseek-v4-flash-0731";

/** The resolved model configuration passed into streamText. */
export interface ResolvedAgentModel {
  model: LanguageModel;
  reasoning?: string;
  providerOptions?: NonNullable<Parameters<typeof streamText>[0]>["providerOptions"];
}

/**
 * Resolves a catalog model id into the provider-specific streamText config.
 * Keeps provider wiring out of the API route so new providers are additive.
 *
 * @param modelId - The catalog model id.
 * @param thinkingLevel - Optional thinking effort level requested by the client.
 * @returns The language model plus per-provider reasoning/providerOptions config.
 */
export function resolveAgentModel(modelId: string, thinkingLevel?: string): ResolvedAgentModel {
  if (getModelProvider(modelId) === "fireworks") {
    const effort = DEEPSEEK_EFFORT[thinkingLevel || ""];
    return {
      model: fireworks(DEEPSEEK_V4_FLASH_MODEL),
      // Top-level reasoning maps to Fireworks' reasoning_effort param.
      ...(effort ? { reasoning: effort } : {}),
      // Enable thinking output and keep reasoning across tool calls in agent loops.
      providerOptions: {
        fireworks: {
          thinking: { type: "enabled" },
          reasoningHistory: "interleaved",
        },
      },
    };
  }

  // Google provider: current behavior unchanged (Gemini reasoning thoughts + Gemma defaults).
  return {
    model: google(modelId || DEFAULT_AGENT_MODEL),
    reasoning: thinkingLevel ? (thinkingLevel as string) : "provider-default",
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    },
  };
}
