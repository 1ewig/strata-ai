import { describe, it, expect } from "bun:test";
import { collectFileActivity } from "@/agent/client/file-activity";

const writeFilePart = (
  name: string,
  fileId: string,
  action = "created",
  state = "output-available",
) => ({
  type: "tool-invocation",
  toolInvocation: {
    toolCallId: `call-${name}-${fileId}`,
    toolName: "writeFile",
    args: { name, content: "..." },
    state,
    result: { file: { id: fileId, name }, action },
  },
});

const editFilePart = (nameOrId: string, fileId: string) => ({
  type: "tool-invocation",
  toolInvocation: {
    toolCallId: `call-edit-${fileId}`,
    toolName: "editFile",
    args: { nameOrId },
    state: "output-available",
    result: { file: { id: fileId, name: nameOrId }, action: "edited" },
  },
});

const readFilePart = (name: string) => ({
  type: "tool-invocation",
  toolInvocation: {
    toolCallId: `call-read-${name}`,
    toolName: "readFile",
    args: { nameOrId: name },
    state: "output-available",
    result: { file: { id: `id-${name}`, name }, content: "..." },
  },
});

describe("collectFileActivity", () => {
  it("returns an empty list for messages without tool parts", () => {
    expect(collectFileActivity({ parts: [{ type: "text", text: "hi" }] })).toEqual([]);
    expect(collectFileActivity({})).toEqual([]);
  });

  it("collects created and edited files in order of appearance", () => {
    const activity = collectFileActivity({
      parts: [
        writeFilePart("notes.md", "f1"),
        editFilePart("notes.md", "f1"),
        writeFilePart("app.ts", "f2"),
      ],
    });
    expect(activity).toEqual([
      { fileId: "f1", name: "notes.md", action: "edited" },
      { fileId: "f2", name: "app.ts", action: "created" },
    ]);
  });

  it("deduplicates by file id with the last action winning", () => {
    const activity = collectFileActivity({
      parts: [writeFilePart("a.ts", "f1"), editFilePart("a.ts", "f1"), editFilePart("a.ts", "f1")],
    });
    expect(activity).toEqual([{ fileId: "f1", name: "a.ts", action: "edited" }]);
  });

  it("ignores readFile and other non-mutating tools", () => {
    const activity = collectFileActivity({
      parts: [readFilePart("a.ts"), writeFilePart("b.ts", "f2")],
    });
    expect(activity).toEqual([{ fileId: "f2", name: "b.ts", action: "created" }]);
  });

  it("skips loading and failed tool parts", () => {
    const activity = collectFileActivity({
      parts: [
        writeFilePart("loading.md", "f1", "created", "input-available"),
        {
          type: "tool-invocation",
          toolInvocation: {
            toolCallId: "call-fail",
            toolName: "editFile",
            args: { nameOrId: "x.ts" },
            state: "error",
            result: { error: "nope" },
          },
        },
      ],
    });
    expect(activity).toEqual([]);
  });

  it("maps deleteFile to a deleted activity", () => {
    const activity = collectFileActivity({
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            toolCallId: "call-del",
            toolName: "deleteFile",
            args: { nameOrId: "old.md" },
            state: "output-available",
            result: { name: "old.md", action: "deleted" },
          },
        },
      ],
    });
    expect(activity).toEqual([{ fileId: null, name: "old.md", action: "deleted" }]);
  });

  it("maps renameFile to the new name", () => {
    const activity = collectFileActivity({
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            toolCallId: "call-ren",
            toolName: "renameFile",
            args: { nameOrId: "old.md", newName: "new.md" },
            state: "output-available",
            result: { oldName: "old.md", newName: "new.md", file: { id: "f9", name: "new.md" } },
          },
        },
      ],
    });
    expect(activity).toEqual([{ fileId: "f9", name: "new.md", action: "renamed" }]);
  });

  it("falls back to name-based dedupe when results lack file ids", () => {
    const parts = [
      {
        type: "tool-invocation",
        toolInvocation: {
          toolCallId: "call-1",
          toolName: "writeFile",
          args: { name: "a.ts" },
          state: "output-available",
          result: { name: "a.ts", action: "created" },
        },
      },
      {
        type: "tool-invocation",
        toolInvocation: {
          toolCallId: "call-2",
          toolName: "editFile",
          args: { nameOrId: "a.ts" },
          state: "output-available",
          result: { action: "edited" },
        },
      },
    ];
    const activity = collectFileActivity({ parts });
    expect(activity).toEqual([{ fileId: null, name: "a.ts", action: "edited" }]);
  });
});
