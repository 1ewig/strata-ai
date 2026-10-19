import { describe, it, expect } from "bun:test";
import { cleanExtractedMarkdown, truncateSnippetAtWordBoundary } from "@/agent/tools/markdown-cleaner";

describe("markdown-cleaner", () => {
  it("strips markdown images but preserves text", () => {
    const input = "Here is some text ![An image](https://example.com/pic.png) and more text.";
    expect(cleanExtractedMarkdown(input)).toBe("Here is some text  and more text.");
  });

  it("strips HTML comments", () => {
    const input = "Content before <!-- navigation banner --> Content after";
    expect(cleanExtractedMarkdown(input)).toBe("Content before  Content after");
  });

  it("collapses cascades of three or more newlines into two", () => {
    const input = "Paragraph 1\n\n\n\n\nParagraph 2\n\n\nParagraph 3";
    expect(cleanExtractedMarkdown(input)).toBe("Paragraph 1\n\nParagraph 2\n\nParagraph 3");
  });

  it("trims trailing whitespace on lines and isolated bullet lines", () => {
    const input = "Line with trailing spaces   \n-\nValid content\n•\n|";
    const cleaned = cleanExtractedMarkdown(input);
    expect(cleaned).toContain("Line with trailing spaces");
    expect(cleaned).toContain("Valid content");
    expect(cleaned).not.toMatch(/^[-•|]$/m);
  });

  describe("truncateSnippetAtWordBoundary", () => {
    it("returns text unmodified if under the limit", () => {
      const text = "Short snippet text";
      expect(truncateSnippetAtWordBoundary(text, 50)).toBe(text);
    });

    it("truncates at word boundary with ellipsis", () => {
      const text = "The quick brown fox jumps over the lazy dog near the riverbank";
      const truncated = truncateSnippetAtWordBoundary(text, 25);
      expect(truncated).toBe("The quick brown fox...");
      expect(truncated.length).toBeLessThanOrEqual(25);
    });
  });
});
