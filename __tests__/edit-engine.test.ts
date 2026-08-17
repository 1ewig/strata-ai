import { describe, it, expect } from "bun:test";
import { StringEditEngine } from "@/lib/edit-engine";

describe("StringEditEngine.applyEdit", () => {
  it("rejects an empty or whitespace-only search string", () => {
    const result = StringEditEngine.applyEdit("hello world", "   ", "x");
    expect(result.success).toBe(false);
    expect(result.error).toBe("searchString cannot be empty.");
  });

  it("applies an exact single-occurrence match", () => {
    const result = StringEditEngine.applyEdit(
      "const a = 1;\nconst b = 2;",
      "const a = 1;",
      "const a = 42;",
    );
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("exact");
    expect(result.newContent).toBe("const a = 42;\nconst b = 2;");
  });

  it("supports multi-line replacement blocks", () => {
    const result = StringEditEngine.applyEdit(
      "a\nb\nc",
      "b",
      "b1\nb2",
    );
    expect(result.success).toBe(true);
    expect(result.newContent).toBe("a\nb1\nb2\nc");
  });

  it("rejects ambiguous exact matches", () => {
    const result = StringEditEngine.applyEdit("dup\ndup", "dup", "x");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Ambiguous");
  });

  it("matches across CRLF sources via whitespace normalization", () => {
    const result = StringEditEngine.applyEdit(
      "line1\r\nline2\r\nline3",
      "line1\nline2",
      "X",
    );
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("whitespace-normalized");
    expect(result.newContent).toBe("X\nline3");
  });

  it("tolerates stray blank lines in the search string", () => {
    const result = StringEditEngine.applyEdit(
      "a\nb\nc",
      "\n\nb\n",
      "X",
    );
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("whitespace-normalized");
    expect(result.newContent).toBe("a\nX\nc");
  });

  it("rejects ambiguous matches under whitespace normalization", () => {
    const result = StringEditEngine.applyEdit(
      "a\r\nb\r\na\r\nb",
      "a\nb",
      "X",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Ambiguous");
  });

  it("uses anchor matching when the middle content has drifted", () => {
    const result = StringEditEngine.applyEdit(
      "alpha\nbeta\nDRIFTED MIDDLE\nomega",
      "alpha\noriginal middle\nomega",
      "REPLACED",
    );
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe("anchor-matched");
    expect(result.newContent).toBe("REPLACED");
  });

  it("rejects ambiguous anchor matches", () => {
    const result = StringEditEngine.applyEdit(
      "a\nx\nz\na\ny\nz",
      "a\nold\nz",
      "X",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Ambiguous");
  });

  it("reports a helpful failure when nothing matches", () => {
    const result = StringEditEngine.applyEdit("abc", "def", "ghi");
    expect(result.success).toBe(false);
    expect(result.error).toContain("could not be matched anywhere");
  });

  it("fails cleanly for single-line searches that cannot be matched", () => {
    const result = StringEditEngine.applyEdit("abc", "xyz", "q");
    expect(result.success).toBe(false);
    expect(result.newContent).toBeUndefined();
  });
});
