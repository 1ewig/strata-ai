import { afterEach, describe, expect, it } from "bun:test";
import {
  MODELS,
  MODEL_THINKING_LEVELS,
  getInitialModel,
  getModelPricing,
  getModelSupportsVision,
  getStoredThinkingLevel,
  getValidThinkingLevelForModel,
} from "@/lib/models";

// Minimal localStorage stand-in so getInitialModel / getStoredThinkingLevel can
// exercise their browser branches under the Node test runner.
function mockBrowserStorage(entries: Record<string, string> = {}) {
  const store = new Map(Object.entries(entries));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
}

function restoreBrowserGlobals() {
  // TS libs type window/localStorage as non-optional; delete is legal at runtime.
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
}

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

  it("prefers a stored thinking level when localStorage is available", () => {
    mockBrowserStorage({ selectedThinkingLevel: "medium" });
    try {
      expect(getStoredThinkingLevel("gemini-3-flash-preview")).toBe("medium");
    } finally {
      restoreBrowserGlobals();
    }
  });

  it("falls back to the model default when the stored level is absent", () => {
    mockBrowserStorage({});
    try {
      expect(getStoredThinkingLevel("gemini-3.1-flash-lite")).toBe("minimal");
    } finally {
      restoreBrowserGlobals();
    }
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
    restoreBrowserGlobals();
  });

  it("defaults to the first lite model when no env override is set", () => {
    delete process.env.NEXT_PUBLIC_GEMINI_MODEL;
    expect(getInitialModel()).toBe("gemini-3.5-flash-lite");
  });

  it("prefers the NEXT_PUBLIC_GEMINI_MODEL env var when set", () => {
    process.env.NEXT_PUBLIC_GEMINI_MODEL = "gemini-3-flash-preview";
    expect(getInitialModel()).toBe("gemini-3-flash-preview");
  });

  it("prefers a stored valid model id over the env var", () => {
    mockBrowserStorage({ selectedModel: "gemma-4-31b-it" });
    process.env.NEXT_PUBLIC_GEMINI_MODEL = "gemini-3-flash-preview";
    expect(getInitialModel()).toBe("gemma-4-31b-it");
  });

  it("ignores a stored model id that is not in the catalog", () => {
    mockBrowserStorage({ selectedModel: "not-a-real-model" });
    process.env.NEXT_PUBLIC_GEMINI_MODEL = "gemini-3-flash-preview";
    expect(getInitialModel()).toBe("gemini-3-flash-preview");
  });
});

describe("getModelSupportsVision", () => {
  it("flags Google-hosted models as vision-capable", () => {
    expect(getModelSupportsVision("gemini-3.5-flash-lite")).toBe(true);
    expect(getModelSupportsVision("gemini-3.1-flash-lite")).toBe(true);
    expect(getModelSupportsVision("gemini-3-flash-preview")).toBe(true);
    expect(getModelSupportsVision("gemma-4-31b-it")).toBe(true);
    expect(getModelSupportsVision("gemma-4-26b-a4b-it")).toBe(true);
  });

  it("flags the Fireworks DeepSeek model as text-only", () => {
    expect(getModelSupportsVision("accounts/fireworks/models/deepseek-v4-flash-0731")).toBe(false);
  });

  it("defaults unknown model ids to vision-capable", () => {
    expect(getModelSupportsVision("not-in-catalog")).toBe(true);
  });
});

describe("model catalog invariants", () => {
  it("declares a provider for every model", () => {
    for (const m of MODELS) {
      expect(["google", "fireworks"]).toContain(m.provider ?? "google");
    }
  });

  it("declares vision support explicitly for every model", () => {
    for (const m of MODELS) {
      expect(typeof m.supportsVision).toBe("boolean");
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