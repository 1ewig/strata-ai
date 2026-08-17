import { describe, it, expect } from "bun:test";
import {
  createDeleteFileTool,
  createEditFileTool,
  createListFilesTool,
  createReadFileTool,
  createRenameFileTool,
  createWriteFileTool,
} from "@/lib/ai/tools/workspace-tools";
import {
  MAX_FILE_CHARS,
  MAX_FILES_PER_WORKSPACE,
  MAX_WORKSPACE_TOTAL_CHARS,
} from "@/lib/limits";
import { makeFile, runTool, setupWorkspaceTools } from "./helpers";

describe("listFiles", () => {
  it("returns an empty listing for an empty workspace", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createListFilesTool(context), {});
    expect(result).toEqual({ count: 0, files: [] });
  });

  it("returns metadata-only entries without content", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "secret content", "markdown")]);
    const result = await runTool(createListFilesTool(context), {});

    expect(result.count).toBe(1);
    expect(result.files).toEqual([
      {
        id: "f1",
        name: "a.md",
        language: "markdown",
        charCount: "secret content".length,
      },
    ]);
    expect(Object.keys(result.files[0])).toEqual(["id", "name", "language", "charCount"]);
  });
});

describe("readFile", () => {
  it("reads full content by name", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "line1\nline2\n")]);
    const result = await runTool(createReadFileTool(context), { nameOrId: "a.md" });
    expect(result.exists).toBe(true);
    expect(result.content).toBe("line1\nline2");
  });

  it("reads full content by id", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "content")]);
    const result = await runTool(createReadFileTool(context), { nameOrId: "f1" });
    expect(result.content).toBe("content");
  });

  it("reads case-insensitively by name", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "content")]);
    const result = await runTool(createReadFileTool(context), { nameOrId: "A.MD" });
    expect(result.exists).toBe(true);
  });

  it("reports a missing file", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createReadFileTool(context), { nameOrId: "missing.md" });
    expect(result.exists).toBe(false);
    expect(result.error).toContain("missing.md");
  });

  it("treats whitespace-only files as missing", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "  ")]);
    const result = await runTool(createReadFileTool(context), { nameOrId: "a.md" });
    expect(result.exists).toBe(false);
  });

  it("extracts a markdown section", async () => {
    const { context } = setupWorkspaceTools([
      makeFile("f1", "doc.md", "# Goals\n- ship it\n## Next Steps\n- launch"),
    ]);
    const result = await runTool(createReadFileTool(context), {
      nameOrId: "doc.md",
      section: "Goals",
    });
    expect(result.exists).toBe(true);
    expect(result.section).toBe("Goals");
    expect(result.content).toBe("# Goals\n- ship it");
  });

  it("reports an unknown section", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "doc.md", "# Goals\nbody")]);
    const result = await runTool(createReadFileTool(context), {
      nameOrId: "doc.md",
      section: "Nope",
    });
    expect(result.exists).toBe(false);
    expect(result.content).toContain('Section "Nope" not found');
  });
});

describe("writeFile", () => {
  it("creates a new file and detects its language", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createWriteFileTool(context), {
      name: "script.py",
      content: "print('hi')",
    });
    expect(result.action).toBe("created");
    expect(result.file.name).toBe("script.py");
    expect(result.file.language).toBe("python");
    expect(context.getCurrentFiles()).toHaveLength(1);
    expect(context.getCurrentFiles()[0].content).toBe("print('hi')");
  });

  it("replaces an existing file case-insensitively and reuses its id", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "notes.md", "old")]);
    const result = await runTool(createWriteFileTool(context), {
      name: "NOTES.MD",
      content: "new",
    });
    expect(result.action).toBe("replaced");
    expect(result.file.id).toBe("f1");
    expect(context.getCurrentFiles()).toHaveLength(1);
    expect(context.getCurrentFiles()[0].content).toBe("new");
  });

  it("honors an explicit language override", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createWriteFileTool(context), {
      name: "weird.xyz",
      content: "x",
      language: "json",
    });
    expect(result.file.language).toBe("json");
  });

  it("truncates content to the per-file character limit", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createWriteFileTool(context), {
      name: "big.txt",
      content: "a".repeat(MAX_FILE_CHARS + 2000),
    });
    expect(result.file.charCount).toBe(MAX_FILE_CHARS);
    expect(context.getCurrentFiles()[0].content).toHaveLength(MAX_FILE_CHARS);
  });

  it("keeps content that sits exactly at the per-file character limit", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createWriteFileTool(context), {
      name: "exact.txt",
      content: "a".repeat(MAX_FILE_CHARS),
    });
    expect(result.file.charCount).toBe(MAX_FILE_CHARS);
    expect(context.getCurrentFiles()[0].content).toHaveLength(MAX_FILE_CHARS);
  });

  it("rejects creating a file beyond the workspace file cap", async () => {
    const capFiles = Array.from({ length: MAX_FILES_PER_WORKSPACE }, (_, i) =>
      makeFile(`f${i + 1}`, `${i + 1}.md`, String(i + 1)),
    );
    const { context } = setupWorkspaceTools(capFiles);
    await expect(
      runTool(createWriteFileTool(context), { name: "d.md", content: "4" }),
    ).rejects.toThrow(/Maximum 3 files allowed/);
  });

  it("allows replacing an existing file at the workspace file cap", async () => {
    const capFiles = Array.from({ length: MAX_FILES_PER_WORKSPACE }, (_, i) =>
      makeFile(`f${i + 1}`, `${i + 1}.md`, String(i + 1)),
    );
    const { context } = setupWorkspaceTools(capFiles);
    const result = await runTool(createWriteFileTool(context), {
      name: "2.md",
      content: "replaced",
    });
    expect(result.action).toBe("replaced");
    expect(context.getCurrentFiles()).toHaveLength(MAX_FILES_PER_WORKSPACE);
  });

  it("streams a file-updated data-workspace event", async () => {
    const { context, writer } = setupWorkspaceTools();
    await runTool(createWriteFileTool(context), { name: "a.md", content: "hello" });
    expect(writer.write).toHaveBeenCalledWith({
      type: "data-workspace",
      data: expect.objectContaining({ event: "file-updated" }),
    });
  });
});

describe("editFile", () => {
  it("applies a surgical edit and reports the strategy", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "const x = 1;\nconst y = 2;")]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "bump constant",
      searchString: "const x = 1;",
      replaceString: "const x = 42;",
    });
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("exact");
    expect(context.getCurrentFiles()[0].content).toBe("const x = 42;\nconst y = 2;");
  });

  it("reports failure when the search string cannot be matched", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "const x = 1;")]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "nope",
      searchString: "const z = 9;",
      replaceString: "const z = 10;",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(context.getCurrentFiles()[0].content).toBe("const x = 1;");
  });

  it("rejects a missing target file", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "missing.md",
      explanation: "x",
      searchString: "a",
      replaceString: "b",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("rejects an edit whose result exceeds the per-file character limit", async () => {
    const content = "a".repeat(MAX_FILE_CHARS - 20) + "\nUNIQUE_TOKEN";
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", content)]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "inflate",
      searchString: "UNIQUE_TOKEN",
      replaceString: "UNIQUE_TOKEN" + "b".repeat(100),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("exceeds maximum allowed limit");
    expect(context.getCurrentFiles()[0].content).toBe(content);
  });

  it("rejects an edit that would exceed the total workspace character limit", async () => {
    // Client-supplied workspace files are not capped at MAX_FILE_CHARS, so a
    // single large file can push the combined total past the workspace cap.
    const { context } = setupWorkspaceTools([
      makeFile("f1", "a.md", "x".repeat(45000)),
      makeFile("f2", "b.md", "line1\nline2"),
    ]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "b.md",
      explanation: "grow b",
      searchString: "line1",
      replaceString: "line1" + "y".repeat(4990),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Total workspace content size");
    expect(context.getCurrentFiles()[0].content).toBe("x".repeat(45000));
  });

  it("allows an edit that lands exactly at the total workspace character limit", async () => {
    const { context } = setupWorkspaceTools([
      makeFile("f1", "a.md", "x".repeat(45000)),
      makeFile("f2", "b.md", "line1\nline2"),
    ]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "b.md",
      explanation: "grow b to the cap",
      searchString: "line1",
      replaceString: "line1" + "y".repeat(4989),
    });
    expect(result.success).toBe(true);
    expect(context.getCurrentFiles()[1].content).toHaveLength(5000);
  });

  it("streams a file-updated event on a successful edit", async () => {
    const { context, writer } = setupWorkspaceTools([makeFile("f1", "a.md", "const x = 1;")]);
    await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "bump",
      searchString: "const x = 1;",
      replaceString: "const x = 42;",
    });
    expect(writer.write).toHaveBeenCalledWith({
      type: "data-workspace",
      data: expect.objectContaining({ event: "file-updated" }),
    });
  });

  it("applies a whitespace-normalized edit through the tool", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "line1\r\nline2\r\nline3")]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "CRLF tolerance",
      searchString: "line1\nline2",
      replaceString: "X",
    });
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("whitespace-normalized");
    expect(context.getCurrentFiles()[0].content).toBe("X\nline3");
  });

  it("applies an anchor-matched edit through the tool", async () => {
    const { context } = setupWorkspaceTools([
      makeFile("f1", "a.md", "alpha\nbeta\nDRIFTED MIDDLE\nomega"),
    ]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "drifted middle",
      searchString: "alpha\noriginal middle\nomega",
      replaceString: "REPLACED",
    });
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("anchor-matched");
    expect(context.getCurrentFiles()[0].content).toBe("REPLACED");
  });

  it("does not mutate the file when every strategy fails", async () => {
    const original = "abc";
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", original)]);
    const result = await runTool(createEditFileTool(context), {
      nameOrId: "a.md",
      explanation: "nope",
      searchString: "xyz",
      replaceString: "q",
    });
    expect(result.success).toBe(false);
    expect(context.getCurrentFiles()[0].content).toBe(original);
  });
});

describe("renameFile", () => {
  it("renames a file and re-detects its language", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "old.md", "content")]);
    const result = await runTool(createRenameFileTool(context), {
      nameOrId: "old.md",
      newName: "app.py",
    });
    expect(result.success).toBe(true);
    expect(result.oldName).toBe("old.md");
    expect(result.newName).toBe("app.py");
    expect(result.file?.language).toBe("python");
    expect(context.getCurrentFiles()[0].name).toBe("app.py");
  });

  it("rejects a case-insensitive name collision", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "1"), makeFile("f2", "b.md", "2")]);
    const result = await runTool(createRenameFileTool(context), {
      nameOrId: "a.md",
      newName: "B.MD",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(context.getCurrentFiles()[0].name).toBe("a.md");
  });

  it("streams a file-updated event on a successful rename", async () => {
    const { context, writer } = setupWorkspaceTools([makeFile("f1", "old.md", "content")]);
    await runTool(createRenameFileTool(context), {
      nameOrId: "old.md",
      newName: "new.md",
    });
    expect(writer.write).toHaveBeenCalledWith({
      type: "data-workspace",
      data: expect.objectContaining({ event: "file-updated", file: expect.objectContaining({ name: "new.md" }) }),
    });
  });

  it("rejects renaming a missing file", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createRenameFileTool(context), {
      nameOrId: "missing.md",
      newName: "new.md",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteFile", () => {
  it("deletes a file by name and emits a file-deleted event", async () => {
    const { context, writer } = setupWorkspaceTools([makeFile("f1", "a.md", "content")]);
    const result = await runTool(createDeleteFileTool(context), { nameOrId: "a.md" });
    expect(result.deleted).toBe(true);
    expect(result.fileId).toBe("f1");
    expect(context.getCurrentFiles()).toHaveLength(0);
    expect(writer.write).toHaveBeenCalledWith({
      type: "data-workspace",
      data: { event: "file-deleted", fileId: "f1", name: "a.md" },
    });
  });

  it("deletes a file by id", async () => {
    const { context } = setupWorkspaceTools([makeFile("f1", "a.md", "content")]);
    const result = await runTool(createDeleteFileTool(context), { nameOrId: "f1" });
    expect(result.deleted).toBe(true);
    expect(context.getCurrentFiles()).toHaveLength(0);
  });

  it("reports failure for a missing file", async () => {
    const { context } = setupWorkspaceTools();
    const result = await runTool(createDeleteFileTool(context), { nameOrId: "missing.md" });
    expect(result.deleted).toBe(false);
    expect(result.error).toContain("not found");
  });
});


