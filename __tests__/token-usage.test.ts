import { describe, it, expect } from "bun:test";
import {
  calculateTokenCost,
  calculateTokenMetrics,
  formatCost,
  formatTokens,
  formatContextWindow,
  type ChatMetadata,
} from "@/lib/token-usage";

type TestMessage = { role?: string; metadata?: any };

const USAGE = { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 };

describe("calculateTokenCost", () => {
  it("computes input and output costs from the model pricing", () => {
    // gemini-3.5-flash-lite: $0.30 / 1M input, $2.50 / 1M output.
    expect(calculateTokenCost("gemini-3.5-flash-lite", 1_000_000, 0)).toBeCloseTo(0.3);
    expect(calculateTokenCost("gemini-3.5-flash-lite", 0, 1_000_000)).toBeCloseTo(2.5);
  });

  it("uses the default lite pricing for unknown models", () => {
    expect(calculateTokenCost("unknown-model", 1_000_000, 0)).toBeCloseTo(0.3);
  });
});

describe("formatTokens", () => {
  it("renders raw counts below 1k", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("renders k and M suffixes", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(1_234_567)).toBe("1.23M");
  });
});

describe("formatContextWindow", () => {
  it("renders thousands and millions", () => {
    expect(formatContextWindow(131072)).toBe("131k");
    expect(formatContextWindow(1_000_000)).toBe("1.0M");
  });
});

describe("formatCost", () => {
  it("renders zero and negative costs as $0.00", () => {
    expect(formatCost(0)).toBe("$0.00");
    expect(formatCost(-1)).toBe("$0.00");
  });

  it("renders sub-cent costs with four decimals", () => {
    expect(formatCost(0.0014)).toBe("$0.0014");
  });

  it("flags negligible costs", () => {
    expect(formatCost(0.00005)).toBe("<$0.0001");
  });

  it("renders larger costs with three decimals", () => {
    expect(formatCost(0.0123)).toBe("$0.012");
    expect(formatCost(1.5)).toBe("$1.500");
  });
});

describe("calculateTokenMetrics", () => {
  it("returns null for empty or missing histories", () => {
    expect(calculateTokenMetrics([])).toBeNull();
    expect(calculateTokenMetrics(undefined)).toBeNull();
  });

  it("returns null when no assistant turn carries usage", () => {
    const messages: TestMessage[] = [{ role: "user" }];
    expect(calculateTokenMetrics(messages)).toBeNull();
  });

  it("aggregates a single assistant turn into active + session metrics", () => {
    const messages: TestMessage[] = [
      { role: "assistant", metadata: { usage: USAGE, modelId: "gemini-3.5-flash-lite" } },
    ];
    const metrics = calculateTokenMetrics(messages);

    expect(metrics).not.toBeNull();
    expect(metrics!.active.totalTokens).toBe(1200);
    expect(metrics!.active.inputTokens).toBe(1000);
    expect(metrics!.active.outputTokens).toBe(200);
    expect(metrics!.active.remainingTokens).toBe(131072 - 1200);
    expect(metrics!.active.percentUsed).toBeCloseTo((1200 / 131072) * 100);
    expect(metrics!.session.turnCount).toBe(1);
    expect(metrics!.session.totalOutputTokens).toBe(200);
    expect(metrics!.session.totalApiTokens).toBe(1200);
    expect(metrics!.modelsUsed).toEqual(["Gemini 3.5 Flash Lite"]);
    expect(metrics!.modelBreakdowns[0].cost).toBeCloseTo(
      calculateTokenCost("gemini-3.5-flash-lite", 1000, 200),
    );
  });

  it("folds stepTotalUsage into session and cost accounting across turns", () => {
    const messages: TestMessage[] = [
      {
        role: "assistant",
        metadata: {
          usage: { inputTokens: 500, outputTokens: 100, totalTokens: 600 },
          stepTotalUsage: { inputTokens: 2000, outputTokens: 300, totalTokens: 2300 },
          modelId: "gemini-3.5-flash-lite",
        },
      },
      { role: "assistant", metadata: { usage: USAGE, modelId: "gemini-3.5-flash-lite" } },
    ];
    const metrics = calculateTokenMetrics(messages);

    expect(metrics!.session.turnCount).toBe(2);
    expect(metrics!.session.totalOutputTokens).toBe(300);
    expect(metrics!.session.totalApiTokens).toBe(2300 + 1200);
    expect(metrics!.active.totalTokens).toBe(1200);
    expect(metrics!.modelBreakdowns[0].apiTokens).toBe(2300 + 1200);
  });

  it("resets the active context to the system baseline after a compaction summary", () => {
    const messages: TestMessage[] = [
      { role: "assistant", metadata: { usage: USAGE, modelId: "gemini-3.5-flash-lite" } },
      {
        role: "assistant",
        metadata: {
          usage: { inputTokens: 90000, outputTokens: 800, totalTokens: 90800 },
          isCompactedSummary: true,
          modelId: "gemini-3.1-flash-lite",
        },
      },
    ];
    const metrics = calculateTokenMetrics(messages);

    expect(metrics!.active.inputTokens).toBe(1500);
    expect(metrics!.active.outputTokens).toBe(800);
    expect(metrics!.active.totalTokens).toBe(2300);
    // Session totals still account for the full pre-compaction history.
    expect(metrics!.session.turnCount).toBe(2);
  });

  it("respects a custom context window", () => {
    const messages: TestMessage[] = [
      { role: "assistant", metadata: { usage: USAGE, modelId: "gemini-3.5-flash-lite" } },
    ];
    const metrics = calculateTokenMetrics(messages, 10000);

    expect(metrics!.active.remainingTokens).toBe(10000 - 1200);
    expect(metrics!.active.percentUsed).toBe(12);
  });

  it("returns null when the latest turn reports zero total tokens", () => {
    const messages: TestMessage[] = [
      { role: "assistant", metadata: { usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } } },
    ];
    expect(calculateTokenMetrics(messages)).toBeNull();
  });
});