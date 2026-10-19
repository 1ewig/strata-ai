import { describe, it, expect } from "bun:test";
import {
  normalizeLanguage,
  highlightSnippet,
  getCachedHighlight,
} from "@/lib/code/shiki-highlighter";

describe("shiki-highlighter", () => {
  describe("normalizeLanguage", () => {
    it("normalizes shorthand aliases to canonical grammar ids", () => {
      expect(normalizeLanguage("ts")).toBe("typescript");
      expect(normalizeLanguage("js")).toBe("javascript");
      expect(normalizeLanguage("py")).toBe("python");
      expect(normalizeLanguage("sh")).toBe("bash");
      expect(normalizeLanguage("shell")).toBe("bash");
      expect(normalizeLanguage("golang")).toBe("go");
      expect(normalizeLanguage("rs")).toBe("rust");
      expect(normalizeLanguage("yml")).toBe("yaml");
      expect(normalizeLanguage("md")).toBe("markdown");
    });

    it("preserves canonical languages verbatim", () => {
      expect(normalizeLanguage("typescript")).toBe("typescript");
      expect(normalizeLanguage("python")).toBe("python");
      expect(normalizeLanguage("json")).toBe("json");
      expect(normalizeLanguage("html")).toBe("html");
      expect(normalizeLanguage("css")).toBe("css");
      expect(normalizeLanguage("sql")).toBe("sql");
      expect(normalizeLanguage("diff")).toBe("diff");
    });

    it("falls back to text for undefined or unsupported languages", () => {
      expect(normalizeLanguage()).toBe("text");
      expect(normalizeLanguage("")).toBe("text");
      expect(normalizeLanguage("unknown_lang_xyz")).toBe("text");
    });
  });

  describe("highlightSnippet", () => {
    it("highlights typescript code into themed spans", async () => {
      const code = "const message: string = 'hello world';";
      const html = await highlightSnippet(code, "ts", "dark");
      expect(html).not.toBeNull();
      expect(html).toContain("const");
      expect(html).toContain("message");
      expect(html).toContain("hello world");
      // Inner HTML without outer <pre> wrapper
      expect(html).not.toMatch(/^<pre/);
    });

    it("synchronously caches highlighted output in memory", async () => {
      const code = "function add(a: number, b: number) { return a + b; }";
      const asyncHtml = await highlightSnippet(code, "typescript", "dark");
      expect(asyncHtml).not.toBeNull();

      const syncHtml = getCachedHighlight(code, "typescript", "dark");
      expect(syncHtml).toBe(asyncHtml);
    });

    it("returns null for plain text or unsupported languages", async () => {
      const result = await highlightSnippet("raw plain text content", "text", "dark");
      expect(result).toBeNull();
    });

    it("supports both dark and light themes", async () => {
      const code = "const isTest = true;";
      const darkHtml = await highlightSnippet(code, "ts", "dark");
      const lightHtml = await highlightSnippet(code, "ts", "light");
      expect(darkHtml).not.toBeNull();
      expect(lightHtml).not.toBeNull();
      expect(darkHtml).not.toBe(lightHtml);
    });
  });
});
