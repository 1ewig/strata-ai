import { describe, it, expect } from "bun:test";
import {
  isSameFilename,
  findWorkspaceFile,
  upsertFileIntoWorkspace,
  removeFileFromWorkspace,
  createMutableWorkspace,
} from "@/lib/ai/workspace";
import { makeFile } from "./helpers";

describe("isSameFilename", () => {
  it("compares names case-insensitively", () => {
    expect(isSameFilename("notes.md", "NOTES.md")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isSameFilename("  notes.md  ", "notes.md")).toBe(true);
  });

  it("distinguishes different names", () => {
    expect(isSameFilename("notes.md", "todo.md")).toBe(false);
  });
});

describe("findWorkspaceFile", () => {
  const files = [makeFile("f1", "notes.md", "hi"), makeFile("f2", "app.ts", "code")];

  it("finds a file by id", () => {
    expect(findWorkspaceFile(files, "f2")?.name).toBe("app.ts");
  });

  it("finds a file by exact name", () => {
    expect(findWorkspaceFile(files, "notes.md")?.id).toBe("f1");
  });

  it("finds a file by case-insensitive name", () => {
    expect(findWorkspaceFile(files, "APP.TS")?.id).toBe("f2");
  });

  it("returns undefined when nothing matches", () => {
    expect(findWorkspaceFile(files, "missing.md")).toBeUndefined();
  });
});

describe("upsertFileIntoWorkspace", () => {
  it("appends a brand-new file", () => {
    const base = [makeFile("f1", "a.md")];
    const next = upsertFileIntoWorkspace(base, makeFile("f2", "b.md", "x"));
    expect(next).toHaveLength(2);
    expect(next[1].id).toBe("f2");
  });

  it("replaces in place when the id matches even with a different name", () => {
    const base = [makeFile("f1", "a.md", "old")];
    const next = upsertFileIntoWorkspace(base, makeFile("f1", "renamed.md", "new"));
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("renamed.md");
    expect(next[0].content).toBe("new");
  });

  it("replaces in place when the name matches case-insensitively", () => {
    const base = [makeFile("f1", "a.md", "old")];
    const next = upsertFileIntoWorkspace(base, makeFile("f9", "A.MD", "new"));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("f9");
  });

  it("does not mutate the input array", () => {
    const base = [makeFile("f1", "a.md")];
    upsertFileIntoWorkspace(base, makeFile("f2", "b.md"));
    expect(base).toHaveLength(1);
  });
});

describe("removeFileFromWorkspace", () => {
  it("removes a file by id", () => {
    const base = [makeFile("f1", "a.md"), makeFile("f2", "b.md")];
    expect(removeFileFromWorkspace(base, "f1")).toHaveLength(1);
  });

  it("removes a file by case-insensitive name", () => {
    const base = [makeFile("f1", "a.md"), makeFile("f2", "b.md")];
    expect(removeFileFromWorkspace(base, "A.MD")).toHaveLength(1);
  });

  it("removes every case-insensitive match", () => {
    const base = [makeFile("f1", "a.md"), makeFile("f2", "A.MD")];
    expect(removeFileFromWorkspace(base, "a.md")).toHaveLength(0);
  });

  it("is a no-op when nothing matches", () => {
    const base = [makeFile("f1", "a.md")];
    expect(removeFileFromWorkspace(base, "missing.md")).toHaveLength(1);
  });
});

describe("createMutableWorkspace", () => {
  it("returns the initial files from getCurrentFiles", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md")]);
    expect(ws.getCurrentFiles()).toHaveLength(1);
  });

  it("replaces an existing file by id on update", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md", "old")]);
    ws.onUpdateFile(makeFile("f1", "a.md", "new"));
    expect(ws.getCurrentFiles()).toHaveLength(1);
    expect(ws.getCurrentFiles()[0].content).toBe("new");
  });

  it("replaces an existing file by case-insensitive name on update", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md")]);
    ws.onUpdateFile(makeFile("f2", "A.MD", "content"));
    expect(ws.getCurrentFiles()).toHaveLength(1);
    expect(ws.getCurrentFiles()[0].id).toBe("f2");
  });

  it("appends a new file on update", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md")]);
    ws.onUpdateFile(makeFile("f2", "b.md"));
    expect(ws.getCurrentFiles()).toHaveLength(2);
  });

  it("deletes a file by id", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md"), makeFile("f2", "b.md")]);
    ws.onDeleteFile("f1");
    expect(ws.getCurrentFiles().map((f) => f.id)).toEqual(["f2"]);
  });

  it("deletes a file by case-insensitive name", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md"), makeFile("f2", "b.md")]);
    ws.onDeleteFile("A.MD");
    expect(ws.getCurrentFiles().map((f) => f.id)).toEqual(["f2"]);
  });

  it("removes every case-insensitive match on delete", () => {
    const ws = createMutableWorkspace([makeFile("f1", "a.md"), makeFile("f2", "A.MD")]);
    ws.onDeleteFile("a.md");
    expect(ws.getCurrentFiles()).toHaveLength(0);
  });
});
