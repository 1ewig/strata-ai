import { describe, it, expect } from "bun:test";
import { estimateThoughtDuration, estimateWorkGroupDuration } from "@/lib/timing";
import type { Segment } from "@/agent/client/segments";

function tool(key: string): Segment {
  return { type: "tool", key, content: "", callId: key } as unknown as Segment;
}

function reasoning(content: string): Segment {
  return { type: "reasoning", key: "r", content } as unknown as Segment;
}

describe("estimateThoughtDuration", () => {
  it("returns a one-second floor for empty or missing text", () => {
    expect(estimateThoughtDuration(undefined)).toBe(1);
    expect(estimateThoughtDuration(null)).toBe(1);
    expect(estimateThoughtDuration("")).toBe(1);
  });

  it("never drops below one second for short reasoning", () => {
    expect(estimateThoughtDuration("thinking")).toBe(1);
  });

  it("scales with the reasoning character count", () => {
    expect(estimateThoughtDuration("a".repeat(220))).toBe(1);
    expect(estimateThoughtDuration("a".repeat(660))).toBe(3);
  });

  it("rounds to the nearest second", () => {
    expect(estimateThoughtDuration("a".repeat(500))).toBe(2);
  });
});

describe("estimateWorkGroupDuration", () => {
  it("returns a one-second floor for an empty group", () => {
    expect(estimateWorkGroupDuration([])).toBe(1);
  });

  it("charges 1.5 seconds per tool invocation", () => {
    expect(estimateWorkGroupDuration([tool("a"), tool("b")])).toBe(3);
    expect(estimateWorkGroupDuration([tool("a"), tool("b"), tool("c")])).toBe(5);
  });

  it("adds reasoning time on top of tool time", () => {
    expect(estimateWorkGroupDuration([tool("a"), reasoning("b".repeat(500))])).toBe(4);
  });

  it("ignores text and non-reasoning segments", () => {
    const text = { type: "text", key: "t", content: "a".repeat(5000) } as unknown as Segment;
    expect(estimateWorkGroupDuration([text])).toBe(1);
  });

  it("ignores reasoning segments with no content", () => {
    expect(estimateWorkGroupDuration([{ type: "reasoning", key: "r" } as unknown as Segment])).toBe(1);
  });

  it("stays at the one-second floor for pure short reasoning", () => {
    expect(estimateWorkGroupDuration([reasoning("ok")])).toBe(1);
  });
});
