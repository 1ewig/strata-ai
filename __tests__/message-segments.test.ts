import { describe, it, expect } from "bun:test";
import { flattenMessageSegments } from "@/lib/ai/message-segments";

describe("flattenMessageSegments", () => {
  it("joins all text parts into a single user bubble", () => {
    const segments = flattenMessageSegments({
      role: "user",
      parts: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
    });
    expect(segments).toEqual([{ type: "user-text", content: "Hello world", key: "user-text" }]);
  });

  it("falls back to the content string for user messages without parts", () => {
    expect(flattenMessageSegments({ role: "user", content: "hi" })).toEqual([
      { type: "user-text", content: "hi", key: "user-text" },
    ]);
  });

  it("renders legacy assistant messages without parts from the content string", () => {
    expect(flattenMessageSegments({ role: "assistant", content: "Hello" })).toEqual([
      { type: "text", content: "Hello", key: "text-0" },
    ]);
  });

  it("returns no segments for an empty legacy assistant message", () => {
    expect(flattenMessageSegments({ role: "assistant", content: "" })).toEqual([]);
  });

  it("streams parts ungrouped and in order while streaming", () => {
    const message = {
      role: "assistant",
      parts: [
        { type: "reasoning", text: "thinking..." },
        { type: "tool-invocation", toolInvocation: { toolCallId: "call-1" } },
        { type: "text", text: "Answer" },
      ],
    };
    const segments = flattenMessageSegments(message, true);
    expect(segments.map((s) => s.type)).toEqual(["reasoning", "tool", "text"]);
    expect(segments[0].content).toBe("thinking...");
    expect(segments[1].key).toBe("call-1");
    expect(segments[2].content).toBe("Answer");
  });

  it("folds pre-answer output into a single work group once finished", () => {
    const message = {
      role: "assistant",
      parts: [
        { type: "reasoning", text: "thinking..." },
        { type: "tool-invocation", toolInvocation: { toolCallId: "call-1" } },
        { type: "text", text: "Final answer" },
      ],
    };
    const segments = flattenMessageSegments(message, false);
    expect(segments).toHaveLength(2);
    expect(segments[0].type).toBe("work-group");
    expect(segments[0].items?.map((s) => s.type)).toEqual(["reasoning", "tool"]);
    expect(segments[1]).toEqual({ type: "text", content: "Final answer", key: "text-final" });
  });

  it("keeps a lone text part as the only segment when finished", () => {
    const segments = flattenMessageSegments({
      role: "assistant",
      parts: [{ type: "text", text: "Only text" }],
    });
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("text");
  });

  it("wraps work-only messages entirely in a work group when finished", () => {
    const segments = flattenMessageSegments({
      role: "assistant",
      parts: [
        { type: "reasoning", text: "thought" },
        { type: "tool-invocation", toolInvocation: { toolCallId: "call-1" } },
      ],
    });
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("work-group");
    expect(segments[0].items).toHaveLength(2);
  });

  it("ensures a placeholder text segment for empty compaction messages", () => {
    const segments = flattenMessageSegments({
      role: "assistant",
      metadata: { isCompactedSummary: true },
      parts: [{ type: "custom", value: 1 }],
    });
    expect(segments).toEqual([{ type: "text", content: "", key: "text-initial" }]);
  });
});