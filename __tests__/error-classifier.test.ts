import { describe, it, expect } from "bun:test";
import { classifyProviderError } from "@/lib/ai/error-classifier";

describe("classifyProviderError", () => {
  it("classifies user abort / cancellations", () => {
    const res = classifyProviderError(new Error("The user aborted a request."));
    expect(res.code).toBe("ABORTED");
    expect(res.isRetryable).toBe(false);
  });

  it("classifies rate limit / resource exhaustion from Google/Fireworks", () => {
    const res1 = classifyProviderError(new Error("429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric"));
    expect(res1.code).toBe("PROVIDER_RATE_LIMIT");
    expect(res1.isRetryable).toBe(true);

    const res2 = classifyProviderError(new Error("HTTP 503 Server Overloaded"));
    expect(res2.code).toBe("PROVIDER_RATE_LIMIT");
    expect(res2.isRetryable).toBe(true);
  });

  it("classifies restricted API key or project permission errors", () => {
    const res = classifyProviderError(new Error("403 Forbidden: Project has been restricted"));
    expect(res.code).toBe("PROVIDER_RESTRICTED");
    expect(res.isRetryable).toBe(false);
  });

  it("classifies model safety filter triggers", () => {
    const res = classifyProviderError(new Error("Candidate was blocked due to SAFETY / HARM_CATEGORY_HATE_SPEECH"));
    expect(res.code).toBe("SAFETY_FILTER_TRIGGERED");
    expect(res.isRetryable).toBe(false);
  });

  it("classifies context length exceeded errors", () => {
    const res = classifyProviderError(new Error("Prompt is too long: context_length_exceeded"));
    expect(res.code).toBe("CONTEXT_EXCEEDED");
    expect(res.isRetryable).toBe(true);
    expect(res.message).toContain("/compact");
  });

  it("classifies invalid API keys as authentication errors", () => {
    const res = classifyProviderError(new Error("Invalid API_KEY provided (401)"));
    expect(res.code).toBe("AUTHENTICATION_ERROR");
    expect(res.isRetryable).toBe(false);
  });

  it("classifies network timeouts and socket hang ups", () => {
    const res = classifyProviderError(new Error("fetch failed: ECONNRESET socket hang up"));
    expect(res.code).toBe("NETWORK_ERROR");
    expect(res.isRetryable).toBe(true);
  });

  it("falls back to INFERENCE_FAILURE for unknown errors", () => {
    const res = classifyProviderError(new Error("Something completely unexpected"));
    expect(res.code).toBe("INFERENCE_FAILURE");
    expect(res.isRetryable).toBe(true);
  });
});
