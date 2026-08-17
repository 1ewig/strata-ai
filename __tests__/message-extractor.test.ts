import { describe, it, expect } from "bun:test";
import {
  extractFilesFromMessage,
  extractDeletedFilesFromMessage,
  findLatestCompactedMessageIndex,
  sliceMessagesAfterCompaction,
} from "@/lib/ai/message-extractor";
import { makeFile } from "./helpers";

function legacyToolResult(result: unknown, toolCallId = "call-1") {
  return {
    type: "tool-invocation",
    toolInvocation: { toolCallId, toolName: "writeFile", state: "result", result },
  };
}

function modernToolResult(output: unknown) {
  return {
    type: "tool",
    toolCallId: "call-1",
    toolName: "writeFile",
    state: "output-available",
    output,
  };
}

describe("extractFilesFromMessage", () => {
  it("returns an empty list for messages without parts", () => {
    expect(extractFilesFromMessage({ role: "assistant" })).toEqual([]);
  });

  it("extracts a single file result from a legacy tool-invocation part", () => {
    const file = makeFile("f1", "a.md", "content");
    const msg = { role: "assistant", parts: [legacyToolResult({ file })] };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("extracts a single file result from the modern typed tool part shape", () => {
    const file = makeFile("f1", "a.md", "content");
    const msg = { role: "assistant", parts: [modernToolResult({ file })] };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("extracts every file from a files array", () => {
    const f1 = makeFile("f1", "a.md", "x");
    const f2 = makeFile("f2", "b.md", "y");
    const msg = { role: "assistant", parts: [modernToolResult({ files: [f1, f2] })] };
    expect(extractFilesFromMessage(msg)).toEqual([f1, f2]);
  });

  it("skips results without string content (metadata-only summaries)", () => {
    const noContent = makeFile("f1", "a.md");
    delete (noContent as { content?: string }).content;
    const msg = { role: "assistant", parts: [modernToolResult({ file: noContent })] };
    expect(extractFilesFromMessage(msg)).toEqual([]);
  });

  it("deduplicates repeated results for the same file id", () => {
    const file = makeFile("f1", "a.md", "v1");
    const msg = {
      role: "assistant",
      parts: [
        legacyToolResult({ file }, "call-1"),
        legacyToolResult({ file: { ...file, content: "v2" } }, "call-2"),
      ],
    };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("extracts from a legacy tool-invocation that only exposes output", () => {
    const file = makeFile("f1", "a.md", "content");
    const msg = {
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: { toolCallId: "call-1", toolName: "writeFile", state: "result", output: { file } },
        },
      ],
    };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("extracts from a direct tool part carrying a result field", () => {
    const file = makeFile("f1", "a.md", "content");
    const msg = { role: "assistant", parts: [{ type: "tool", toolCallId: "call-1", result: { file } }] };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("extracts from a direct tool part carrying an output field", () => {
    const file = makeFile("f1", "a.md", "content");
    const msg = { role: "assistant", parts: [{ type: "tool", toolCallId: "call-1", output: { file } }] };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("deduplicates across legacy and modern part shapes", () => {
    const file = makeFile("f1", "a.md", "v1");
    const msg = {
      role: "assistant",
      parts: [
        legacyToolResult({ file }, "call-1"),
        modernToolResult({ file: { ...file, content: "v2" } }),
      ],
    };
    expect(extractFilesFromMessage(msg)).toEqual([file]);
  });

  it("skips files without an id instead of deduplicating them", () => {
    const noId = makeFile("f1", "a.md", "content");
    delete (noId as { id?: string }).id;
    const msg = { role: "assistant", parts: [modernToolResult({ file: noId })] };
    expect(extractFilesFromMessage(msg)).toEqual([]);
  });
});

describe("extractDeletedFilesFromMessage", () => {
  it("collects deletions signalled by tool results", () => {
    const msg = {
      role: "assistant",
      parts: [legacyToolResult({ deleted: true, fileId: "f1", name: "a.md" })],
    };
    expect(extractDeletedFilesFromMessage(msg)).toEqual([{ fileId: "f1", name: "a.md" }]);
  });

  it("ignores results that are not deletions or lack identifiers", () => {
    const msg = {
      role: "assistant",
      parts: [
        legacyToolResult({ file: makeFile("f1", "a.md", "x") }),
        legacyToolResult({ deleted: true }),
      ],
    };
    expect(extractDeletedFilesFromMessage(msg)).toEqual([]);
  });

  it("collects deletions from the modern typed tool part shape", () => {
    const msg = {
      role: "assistant",
      parts: [
        {
          type: "tool",
          toolCallId: "call-1",
          toolName: "deleteFile",
          state: "output-available",
          output: { deleted: true, fileId: "f1", name: "a.md" },
        },
      ],
    };
    expect(extractDeletedFilesFromMessage(msg)).toEqual([{ fileId: "f1", name: "a.md" }]);
  });
});

describe("findLatestCompactedMessageIndex", () => {
  it("returns -1 for empty or missing histories", () => {
    expect(findLatestCompactedMessageIndex(undefined)).toBe(-1);
    expect(findLatestCompactedMessageIndex([])).toBe(-1);
  });

  it("returns -1 when no compaction summary exists", () => {
    const messages: Array<{ id: string; metadata?: { isCompactedSummary?: boolean } }> = [
      { id: "m1" },
      { id: "m2" },
    ];
    expect(findLatestCompactedMessageIndex(messages)).toBe(-1);
  });

  it("finds the latest message stamped as a compaction summary", () => {
    const messages: Array<{ id: string; metadata?: { isCompactedSummary?: boolean } }> = [
      { id: "m1", metadata: { isCompactedSummary: true } },
      { id: "m2", metadata: {} },
      { id: "m3", metadata: { isCompactedSummary: true } },
    ];
    expect(findLatestCompactedMessageIndex(messages)).toBe(2);
  });
});

describe("sliceMessagesAfterCompaction", () => {
  it("returns an empty array for missing history", () => {
    expect(sliceMessagesAfterCompaction(undefined)).toEqual([]);
  });

  it("returns the original messages when no summary exists", () => {
    const messages: Array<{ id: string }> = [{ id: "m1" }, { id: "m2" }];
    expect(sliceMessagesAfterCompaction(messages)).toBe(messages);
  });

  it("trims history to start at the latest compaction summary", () => {
    const messages = [
      { id: "m1" },
      { id: "m2", metadata: { isCompactedSummary: true } },
      { id: "m3" },
      { id: "m4" },
    ];
    const sliced = sliceMessagesAfterCompaction(messages);
    expect(sliced.map((m) => m.id)).toEqual(["m2", "m3", "m4"]);
  });
});