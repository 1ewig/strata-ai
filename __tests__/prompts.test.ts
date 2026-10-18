import { describe, it, expect } from "bun:test";
import {
  buildCompactionInstruction,
  buildSystemInstruction,
  buildWorkspaceFileListing,
  formatCurrentDate,
  getActiveFiles,
} from "@/agent/prompts";
import { NEAR_LIMIT_PERCENT } from "@/lib/limits";
import { makeFile } from "./helpers";

describe("getActiveFiles", () => {
  it("keeps only files with non-whitespace content", () => {
    const files = [
      makeFile("f1", "a.md", "content"),
      makeFile("f2", "b.md", "   "),
      makeFile("f3", "c.md", ""),
    ];
    expect(getActiveFiles(files).map((f) => f.id)).toEqual(["f1"]);
  });

  it("returns an empty list for missing or undefined input", () => {
    expect(getActiveFiles(undefined)).toEqual([]);
    expect(getActiveFiles([])).toEqual([]);
  });
});

describe("buildWorkspaceFileListing", () => {
  it("renders metadata-only entries with name, language, char count, and id", () => {
    const listing = buildWorkspaceFileListing([makeFile("f1", "notes.md", "hello", "markdown")]);
    expect(listing).toBe("- notes.md (markdown, 5/10,000 chars, id: f1)");
  });

  it("defaults a missing language to markdown", () => {
    const file = makeFile("f1", "a.txt", "x", "markdown");
    (file as { language?: string }).language = "" as unknown as string;
    expect(buildWorkspaceFileListing([file])).toContain("(markdown,");
  });

  it("returns an empty string for an empty file list", () => {
    expect(buildWorkspaceFileListing([])).toBe("");
  });
});

describe("formatCurrentDate", () => {
  it("includes the weekday, month, day, and year", () => {
    const formatted = formatCurrentDate();
    expect(formatted).toMatch(/\w+, \w+ \d{1,2}, \d{4}/);
  });
});

describe("buildSystemInstruction", () => {
  it("reports an empty workspace and tells the model not to create files", () => {
    const prompt = buildSystemInstruction();
    expect(prompt).toContain("Status: Empty");
    expect(prompt).toContain("No workspace files exist currently.");
  });

  it("lists only files that carry content and flags populated state", () => {
    const prompt = buildSystemInstruction([
      makeFile("f1", "notes.md", "hello"),
      makeFile("f2", "blank.md", "   "),
    ]);
    expect(prompt).toContain("Status: Populated");
    expect(prompt).toContain("- notes.md (markdown, 5/10,000 chars, id: f1)");
    expect(prompt).not.toContain("blank.md");
  });

  it("embeds the hard workspace constraint numbers", () => {
    const prompt = buildSystemInstruction();
    expect(prompt).toContain("Maximum files per workspace: 3");
    expect(prompt).toContain("characters");
    expect(prompt).toContain("## 3. Hard Workspace Constraints");
  });

  it("defaults the token budget section to a zero-occupancy readout", () => {
    const prompt = buildSystemInstruction();
    expect(prompt).toContain("## Context & Token Budget");
    expect(prompt).toContain("0 / unknown tokens (0% used)");
  });

  it("reports the provided token budget occupancy", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 131072,
      totalTokens: 13107,
      remainingTokens: 117965,
      percentUsed: 10,
    });
    expect(prompt).toContain("13,107 / 131,072 tokens (10% used)");
    expect(prompt).toContain("117,965 tokens");
  });

  it("stays in concise-advice mode below the near-limit threshold", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 131072,
      totalTokens: 1000,
      percentUsed: NEAR_LIMIT_PERCENT - 1,
    });
    expect(prompt).toContain("Keep replies reasonably sized");
    expect(prompt).not.toContain("/compact to condense conversation history");
  });

  it("switches to be-concise mode at the near-limit threshold", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 131072,
      totalTokens: 110000,
      percentUsed: NEAR_LIMIT_PERCENT,
    });
    expect(prompt).toContain("be concise");
    expect(prompt).toContain("/compact to condense conversation history");
  });

  it("derives occupancy from total and window when percentUsed is omitted", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 1000,
      totalTokens: 900,
    });
    expect(prompt).toContain("900 / 1,000 tokens (90% used)");
    expect(prompt).toContain("be concise");
  });

  it("derives remaining headroom when remainingTokens is omitted", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 1000,
      totalTokens: 400,
      percentUsed: 40,
    });
    expect(prompt).toContain("600 tokens");
  });

  it("never reports negative headroom when usage exceeds the window", () => {
    const prompt = buildSystemInstruction([], {
      contextWindow: 1000,
      totalTokens: 5000,
      percentUsed: 500,
    });
    expect(prompt).toContain("0 tokens");
  });

  it("instructs readFile before editFile", () => {
    expect(buildSystemInstruction()).toContain("readFile` before `editFile");
  });
});

describe("buildCompactionInstruction", () => {
  it("reports an empty workspace", () => {
    const prompt = buildCompactionInstruction();
    expect(prompt).toContain("Workspace Files Status: Empty");
    expect(prompt).toContain("No workspace files exist currently.");
  });

  it("snapshots active file metadata when populated", () => {
    const prompt = buildCompactionInstruction([
      makeFile("f1", "plan.md", "roadmap"),
      makeFile("f2", "empty.md", " "),
    ]);
    expect(prompt).toContain("Workspace Files Status: Populated");
    expect(prompt).toContain("Active Workspace Files (Metadata Snapshot)");
    expect(prompt).toContain("- plan.md (markdown, 7/10,000 chars, id: f1)");
    expect(prompt).not.toContain("empty.md");
  });

  it("requires the structured summary format", () => {
    const prompt = buildCompactionInstruction();
    expect(prompt).toContain("# Context Compaction Summary");
    expect(prompt).toContain("## Current Goal");
    expect(prompt).toContain("## Continuation Notes");
    expect(prompt).toContain("### Rules");
  });

  it("includes the current date for temporal awareness", () => {
    expect(buildCompactionInstruction()).toContain(`Current Date: ${formatCurrentDate()}`);
  });
});
