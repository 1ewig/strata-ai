import { describe, it, expect } from "bun:test";
import { stripMarkdown } from "@/lib/clipboard";
import { generateId } from "@/lib/id";

describe("stripMarkdown", () => {
  it("strips fenced code blocks down to their contents", () => {
    expect(stripMarkdown("before\n```ts\nconst x = 1;\n```\nafter")).toBe("before\nconst x = 1;\n\nafter");
  });

  it("strips inline code backticks", () => {
    expect(stripMarkdown("run `bun test` now")).toBe("run bun test now");
  });

  it("flattens links to their label and images to their alt text", () => {
    expect(stripMarkdown("see [the docs](https://example.com)")).toBe("see the docs");
    expect(stripMarkdown("![a diagram](https://example.com/a.png)")).toBe("a diagram");
  });

  it("removes heading markers", () => {
    expect(stripMarkdown("# Title")).toBe("Title");
    expect(stripMarkdown("### Deep heading")).toBe("Deep heading");
  });

  it("removes bold and italic emphasis", () => {
    expect(stripMarkdown("**bold** and *italic*")).toBe("bold and italic");
    expect(stripMarkdown("__strong__ and _em_")).toBe("strong and em");
  });

  it("removes strikethrough markers", () => {
    expect(stripMarkdown("~~gone~~")).toBe("gone");
  });

  it("removes blockquote, list, and horizontal-rule markers", () => {
    expect(stripMarkdown("> quoted")).toBe("quoted");
    expect(stripMarkdown("- one\n* two\n+ three")).toBe("one\ntwo\nthree");
    expect(stripMarkdown("1. first\n2. second")).toBe("first\nsecond");
    expect(stripMarkdown("---\n")).toBe("");
  });

  it("strips inline HTML tags", () => {
    expect(stripMarkdown("<div>hello</div>")).toBe("hello");
  });

  it("collapses runs of three or more newlines into a blank line", () => {
    expect(stripMarkdown("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims surrounding whitespace", () => {
    expect(stripMarkdown("   \n\n hello \n\n  ")).toBe("hello");
  });

  it("returns an empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("leaves plain prose untouched", () => {
    expect(stripMarkdown("just a sentence")).toBe("just a sentence");
  });

  it("cleans inline and block LaTeX math formulas", () => {
    expect(stripMarkdown("Formula: $E=mc^2$ is famous")).toBe("Formula: E=mc^2 is famous");
    expect(stripMarkdown("Equation:\n$$\n\\frac{a}{b} = c\n$$\nDone")).toBe("Equation:\n\\frac{a}{b} = c\nDone");
  });

  it("handles GFM task lists while preserving checkbox status", () => {
    expect(stripMarkdown("- [x] Done task\n- [ ] Pending task")).toBe("[x] Done task\n[ ] Pending task");
  });

  it("decodes common HTML entities cleanly", () => {
    expect(stripMarkdown("&lt;div&gt; &amp; &quot;hello&quot;")).toBe("<div> & \"hello\"");
  });
});

describe("generateId", () => {
  it("returns a UUID-shaped identifier", () => {
    expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns a distinct identifier on each call", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  it("falls back to a timestamp-random id when randomUUID is unavailable", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { ...original, randomUUID: undefined },
    });
    try {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]{9}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: original });
    }
  });
});
