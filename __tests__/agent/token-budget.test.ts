import { describe, it, expect } from "bun:test";
import { computeTokenBudget } from "@/agent/core/token-budget";

const WINDOW = 131072;

/**
 * Builds a conversation whose latest assistant turn carries a usage snapshot.
 */
function conversation(totalTokens: number) {
  return [
    { role: "user", parts: [{ type: "text", text: "hi" }] },
    {
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
      metadata: {
        usage: { inputTokens: totalTokens - 100, outputTokens: 100, totalTokens },
        modelId: "gemini-3.5-flash-lite",
      },
    },
  ] as any;
}

describe("computeTokenBudget", () => {
  it("reports the catalog context window and occupancy for the requested model", async () => {
    const budget = await computeTokenBudget(conversation(20000), "gemini-3.5-flash-lite");
    expect(budget.contextWindow).toBe(WINDOW);
    expect(budget.totalTokens).toBe(20000);
    expect(budget.remainingTokens).toBe(WINDOW - 20000);
    expect(budget.percentUsed).toBeCloseTo((20000 / WINDOW) * 100);
  });

  it("uses the same window for every catalog model", async () => {
    const budgets = await Promise.all([
      computeTokenBudget(conversation(1000), "gemini-3.5-flash-lite"),
      computeTokenBudget(conversation(1000), "accounts/fireworks/models/glm-5p3-flash"),
    ]);
    expect(budgets.map((b) => b.contextWindow)).toEqual([WINDOW, WINDOW]);
  });

  it("falls back to the default agent model when no id is supplied", async () => {
    const budget = await computeTokenBudget(conversation(5000));
    expect(budget.contextWindow).toBe(WINDOW);
    expect(budget.totalTokens).toBe(5000);
  });

  it("returns an undefined occupancy when no turn carries usage yet", async () => {
    const messages = [{ role: "user", parts: [{ type: "text", text: "hi" }] }] as any;
    const budget = await computeTokenBudget(messages);
    expect(budget.contextWindow).toBe(WINDOW);
    expect(budget.totalTokens).toBeUndefined();
    expect(budget.remainingTokens).toBeUndefined();
    expect(budget.percentUsed).toBeUndefined();
  });

  it("measures the latest assistant turn, not the sum of all turns", async () => {
    const messages = [
      {
        role: "assistant",
        parts: [],
        metadata: { usage: { inputTokens: 90000, outputTokens: 0, totalTokens: 90000 } },
      },
      {
        role: "assistant",
        parts: [],
        metadata: { usage: { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 } },
      },
    ] as any;
    const budget = await computeTokenBudget(messages);
    expect(budget.totalTokens).toBe(1200);
  });

  it("resets occupancy to the system baseline after a compaction summary", async () => {
    const messages = [
      {
        role: "assistant",
        parts: [],
        metadata: { usage: { inputTokens: 120000, outputTokens: 0, totalTokens: 120000 } },
      },
      {
        role: "assistant",
        parts: [],
        metadata: {
          usage: { inputTokens: 2000, outputTokens: 800, totalTokens: 2800 },
          isCompactedSummary: true,
          modelId: "gemini-3.1-flash-lite",
        },
      },
    ] as any;
    const budget = await computeTokenBudget(messages);
    expect(budget.totalTokens).toBe(1500 + 800);
    expect(budget.remainingTokens).toBe(WINDOW - 2300);
  });

  it("clamps occupancy at 100 percent when usage exceeds the window", async () => {
    const budget = await computeTokenBudget(conversation(WINDOW + 5000));
    expect(budget.percentUsed).toBe(100);
    expect(budget.remainingTokens).toBe(0);
  });
});
