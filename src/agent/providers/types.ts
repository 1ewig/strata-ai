import type { LanguageModel, streamText } from "ai";

/** Backend providers the agent endpoint can route to. */
export type ModelProvider = "google" | "fireworks";

/** The resolved model configuration passed into streamText. */
export interface ResolvedAgentModel {
  model: LanguageModel;
  reasoning?: string;
  providerOptions?: NonNullable<Parameters<typeof streamText>[0]>["providerOptions"];
}
