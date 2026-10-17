import { google } from "@ai-sdk/google";
import { fireworks } from "@ai-sdk/fireworks";
import { MODELS, MODEL_THINKING_LEVELS } from "@/lib/models";
import type { ModelProvider, ResolvedAgentModel } from "./types";

export * from "./types";

/** Default model used when the client omits or sends an unknown model id. */
export const DEFAULT_AGENT_MODEL = "gemini-3.5-flash-lite";

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
 * Maps app thinking levels to Fireworks reasoning effort. GLM 5.3 Flash
 * and DeepSeek V4.1 Flash expose low/medium/high, so the four app levels collapse onto those.
 */
const FIREWORKS_EFFORT: Record<string, "low" | "medium" | "high"> = {
  minimal: "low",
  low: "low",
  medium: "medium",
  high: "high",
};

/** Fireworks-hosted GLM 5.3 Flash model id. */
export const FIREWORKS_MODEL_ID = "accounts/fireworks/models/glm-5p3-flash";

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
    const effort = FIREWORKS_EFFORT[thinkingLevel || ""];
    return {
      model: fireworks(modelId || FIREWORKS_MODEL_ID),
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

  // Google provider: only attach thinkingConfig and reasoning for models that support it.
  const hasThinking = Boolean(MODEL_THINKING_LEVELS[modelId || DEFAULT_AGENT_MODEL]);
  return {
    model: google(modelId || DEFAULT_AGENT_MODEL),
    ...(hasThinking
      ? {
          reasoning: thinkingLevel ? (thinkingLevel as string) : "provider-default",
          providerOptions: {
            google: {
              thinkingConfig: {
                includeThoughts: true,
              },
            },
          },
        }
      : {}),
  };
}
