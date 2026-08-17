import { afterEach, describe, expect, it } from "bun:test";
import {
  MODELS,
  MODEL_THINKING_LEVELS,
  getInitialModel,
  getModelPricing,
  getStoredThinkingLevel,
  getValidThinkingLevelForModel,
} from "@/lib/models";

describe("getModelPricing", () => {
  it("returns the catalog pricing for a known model", () => {
    const pricing = getModelPricing("gemini-3.5-flash-lite");
    expect(pricing.inputPerMillion).toBe(0.3);
    expect(pricing.outputPerMillion).toBe(2.5);
    expect(pricing.cachedInputPerMillion).toBe(0.075);
    expect(pricing.currency).toBe("USD");
  });

  it("falls back to default lite rates for unknown models", () => {
    const pricing = getModelPricing("unknown-model");
    expect(pricing.inputPerMillion).toBe(0.3);
    expect(pricing.outputPerMillion).toBe(2.5);
  });

  it("handles an undefined model id", () => {
    expect(getModelPricing(undefined).currency).toBe("USD");
  });
});

describe("getValidThinkingLevelForModel", () => {
  it("accepts a supported level", () => {
    expect(getValidThinkingLevelForModel("gemini-3.5-flash-lite", "high")).toBe("high");
  });

  it("falls back to the model default for unsupported levels", () => {
    expect(getValidThinkingLevelForModel("gemini-3.1-flash-lite", "medium")).toBe("minimal");
  });

  it("returns an empty string for models without a thinking config", () => {
    expect(getValidThinkingLevelForModel("gemma-4-31b-it", "high")).toBe("");
    expect(getValidThinkingLevelForModel("unknown-model", "high")).toBe("");
  });
});

describe("getStoredThinkingLevel", () => {
  it("returns the model default when no window/localStorage is available", () => {
    expect(getStoredThinkingLevel("gemini-3-flash-preview")).toBe("high");
    expect(getStoredThinkingLevel("gemma-4-31b-it")).toBe("");
  });
});

describe("getInitialModel", () => {
  const originalEnv = process.env.NEXT_PUBLIC_GEMINI_MODEL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GEMINI_MODEL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GEMINI_MODEL;
    }
  });

  it("defaults to the first lite model when no env override is set", () => {
    delete process.env.NEXT_PUBLIC_GEMINI_MODEL;
    expect(getInitialModel()).toBe("gemini-3.5-flash-lite");
  });

  it("prefers the NEXT_PUBLIC_GEMINI_MODEL env var when set", () => {
    process.env.NEXT_PUBLIC_GEMINI_MODEL = "gemini-3-flash-preview";
    expect(getInitialModel()).toBe("gemini-3-flash-preview");
  });
});

describe("model catalog invariants", () => {
  it("declares a provider for every model", () => {
    for (const m of MODELS) {
      expect(["google", "fireworks"]).toContain(m.provider ?? "google");
    }
  });

  it("keeps every model at the 128k context window", () => {
    for (const m of MODELS) {
      expect(m.contextWindow).toBe(131072);
    }
  });

  it("exposes thinking levels only for models that support them", () => {
    for (const m of MODELS) {
      if (MODEL_THINKING_LEVELS[m.id]) {
        expect(MODEL_THINKING_LEVELS[m.id].levels.length).toBeGreaterThan(0);
      }
    }
  });
});