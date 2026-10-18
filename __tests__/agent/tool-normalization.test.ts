import { describe, it, expect } from "bun:test";
import { normalizeToolPart } from "@/agent/client/tool-normalization";

describe("normalizeToolPart", () => {
  it("recovers the tool name from a static AI SDK 7 tool part type", () => {
    const part = {
      type: "tool-writeFile",
      toolCallId: "call-1",
      state: "output-available",
      input: { name: "notes.md", content: "hi" },
      output: { action: "created", file: { name: "notes.md" } },
    };
    const norm = normalizeToolPart(part);
    expect(norm.rawName).toBe("writeFile");
    expect(norm.name).toBe("writeFile");
    expect(norm.isCustom).toBe(false);
    expect(norm.callId).toBe("call-1");
    expect(norm.state).toBe("output-available");
    expect(norm.status).toBe("success");
    expect(norm.args).toEqual({ name: "notes.md", content: "hi" });
    expect(norm.result).toEqual({ action: "created", file: { name: "notes.md" } });
  });

  it("prefers an explicit toolName over the type-derived name", () => {
    const norm = normalizeToolPart({
      type: "tool-writeFile",
      toolName: "writeFile",
      toolCallId: "call-2",
      state: "input-available",
      input: {},
    });
    expect(norm.rawName).toBe("writeFile");
  });

  it("keeps dynamic-tool names resolving through toolName", () => {
    const norm = normalizeToolPart({
      type: "dynamic-tool",
      toolName: "webSearch",
      toolCallId: "call-3",
      state: "output-available",
      input: { query: "ai" },
      output: { results: [] },
    });
    expect(norm.rawName).toBe("webSearch");
    expect(norm.name).toBe("webSearch");
  });

  it("does not treat the legacy tool-invocation type as a name", () => {
    const norm = normalizeToolPart({
      type: "tool-invocation",
      toolInvocation: { toolCallId: "call-4", toolName: "editFile", state: "result", result: {} },
    });
    expect(norm.rawName).toBe("editFile");
  });

  it("falls back to the generic Tool name when nothing identifies the tool", () => {
    const norm = normalizeToolPart({ toolCallId: "call-5" });
    expect(norm.rawName).toBe("Tool");
  });
});
