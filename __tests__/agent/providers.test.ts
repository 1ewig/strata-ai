import { describe, it, expect } from "bun:test";
import {
  DEFAULT_AGENT_MODEL,
  FIREWORKS_MODEL_ID,
  getModelProvider,
  resolveAgentModel,
} from "@/agent/providers";

const GLM = "accounts/fireworks/models/glm-5p3-flash";
const DEEPSEEK = "accounts/fireworks/models/deepseek-v4p1-flash";

describe("DEFAULT_AGENT_MODEL", () => {
  it("is the default lite Gemini model in the catalog", () => {
    expect(DEFAULT_AGENT_MODEL).toBe("gemini-3.5-flash-lite");
  });
});

describe("getModelProvider", () => {
  it("returns fireworks for Fireworks-hosted catalog ids", () => {
    expect(getModelProvider(GLM)).toBe("fireworks");
    expect(getModelProvider(DEEPSEEK)).toBe("fireworks");
  });

  it("returns google for Google-hosted catalog ids", () => {
    expect(getModelProvider("gemini-3.5-flash-lite")).toBe("google");
    expect(getModelProvider("gemini-3.1-flash-lite")).toBe("google");
  });

  it("defaults unknown ids to google", () => {
    expect(getModelProvider("not-a-real-model")).toBe("google");
    expect(getModelProvider("")).toBe("google");
  });
});

describe("resolveAgentModel", () => {
  it("enables Google thinkingConfig with includeThoughts for thinking-capable models", () => {
    const resolved = resolveAgentModel("gemini-3.5-flash-lite", "high");
    expect(resolved.providerOptions?.google).toEqual({ thinkingConfig: { includeThoughts: true } });
    expect(resolved.reasoning).toBe("high");
  });

  it("falls back to provider-default reasoning when no level is requested", () => {
    const resolved = resolveAgentModel("gemini-3.5-flash-lite");
    expect(resolved.reasoning).toBe("provider-default");
  });

  it("omits thinkingConfig and reasoning for Google models without a thinking config", () => {
    const resolved = resolveAgentModel("gemini-not-in-catalog", "high");
    expect(resolved.reasoning).toBeUndefined();
    expect(resolved.providerOptions).toBeUndefined();
  });

  it("maps app thinking levels onto Fireworks reasoning effort", () => {
    expect(resolveAgentModel(GLM, "minimal").reasoning).toBe("low");
    expect(resolveAgentModel(GLM, "low").reasoning).toBe("low");
    expect(resolveAgentModel(GLM, "medium").reasoning).toBe("medium");
    expect(resolveAgentModel(GLM, "high").reasoning).toBe("high");
  });

  it("omits Fireworks reasoning when no known level is supplied", () => {
    const resolved = resolveAgentModel(GLM, "not-a-level");
    expect(resolved.reasoning).toBeUndefined();
    expect(resolveAgentModel(GLM).reasoning).toBeUndefined();
  });

  it("enables Fireworks thinking with interleaved reasoning history", () => {
    const resolved = resolveAgentModel(DEEPSEEK, "medium");
    expect(resolved.providerOptions?.fireworks).toEqual({
      thinking: { type: "enabled" },
      reasoningHistory: "interleaved",
    });
  });

  it("never attaches Google thinkingConfig to Fireworks models", () => {
    expect(resolveAgentModel(GLM, "high").providerOptions?.google).toBeUndefined();
  });

  it("exposes the Fireworks default model id constant", () => {
    expect(FIREWORKS_MODEL_ID).toBe(GLM);
  });

  it("resolves a usable language model instance for both providers", () => {
    expect(resolveAgentModel("gemini-3.5-flash-lite", "low").model).toBeDefined();
    expect(resolveAgentModel(GLM, "high").model).toBeDefined();
  });
});
