import { describe, it, expect } from "bun:test";
import {
  buildQuotaError,
  buildRateLimitErrorMessage,
  formatCharCount,
} from "@/lib/limits";

describe("buildQuotaError", () => {
  it("returns null while both windows have remaining messages", () => {
    expect(buildQuotaError(5, 40)).toBeNull();
  });

  it("reports the 5-hour window when it is exhausted", () => {
    const err = buildQuotaError(0, 40);
    expect(err?.message).toContain("5-hour quota is exhausted");
    expect(err?.message).toContain("10/10 messages used");
  });

  it("reports the weekly window when only it is exhausted", () => {
    const err = buildQuotaError(5, 0);
    expect(err?.message).toContain("weekly quota is exhausted");
    expect(err?.message).toContain("50/50 messages used");
  });

  it("prefers the 5-hour branch when both windows are exhausted", () => {
    const err = buildQuotaError(0, 0);
    expect(err?.message).toContain("5-hour quota is exhausted");
  });

  it("propagates the retryAfter hint", () => {
    expect(buildQuotaError(0, 40, 120)?.retryAfter).toBe(120);
  });
});

describe("buildRateLimitErrorMessage", () => {
  it("summarizes both quotas without a retry hint", () => {
    const msg = buildRateLimitErrorMessage();
    expect(msg).toContain("10 messages per 5 hours, 50 per week");
    expect(msg).toContain("Please try again later.");
  });

  it("adds a minutes-based retry hint when provided", () => {
    expect(buildRateLimitErrorMessage(150)).toContain("Try again in 3 min.");
  });
});

describe("formatCharCount", () => {
  it("formats counts against a limit with locale separators", () => {
    expect(formatCharCount(1200, 2000)).toBe("1,200 / 2,000");
  });
});
