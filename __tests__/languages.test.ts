import { describe, it, expect } from "bun:test";
import {
  detectLanguage,
  getLanguageMeta,
  getLanguageLabel,
  getPrismGrammarName,
  isMarkdownFile,
} from "@/lib/languages";

describe("detectLanguage", () => {
  it("detects languages from file extensions", () => {
    expect(detectLanguage("index.html")).toBe("html");
    expect(detectLanguage("app.ts")).toBe("typescript");
    expect(detectLanguage("app.js")).toBe("javascript");
    expect(detectLanguage("styles.css")).toBe("css");
    expect(detectLanguage("styles.scss")).toBe("scss");
    expect(detectLanguage("data.json")).toBe("json");
    expect(detectLanguage("main.py")).toBe("python");
    expect(detectLanguage("query.sql")).toBe("sql");
    expect(detectLanguage("deploy.sh")).toBe("shell");
    expect(detectLanguage("config.yml")).toBe("yaml");
    expect(detectLanguage("README.md")).toBe("markdown");
    expect(detectLanguage("main.go")).toBe("go");
    expect(detectLanguage("main.rs")).toBe("rust");
    expect(detectLanguage("component.jsx")).toBe("jsx");
    expect(detectLanguage("page.tsx")).toBe("tsx");
    expect(detectLanguage("Main.java")).toBe("java");
    expect(detectLanguage("script.rb")).toBe("ruby");
    expect(detectLanguage("App.swift")).toBe("swift");
  });

  it("resolves shorthand aliases", () => {
    expect(detectLanguage("ts")).toBe("typescript");
    expect(detectLanguage("js")).toBe("javascript");
    expect(detectLanguage("py")).toBe("python");
    expect(detectLanguage("md")).toBe("markdown");
    expect(detectLanguage("golang")).toBe("go");
    expect(detectLanguage("yml")).toBe("yaml");
    expect(detectLanguage("env")).toBe("text");
  });

  it("matches canonical language ids", () => {
    expect(detectLanguage("typescript")).toBe("typescript");
    expect(detectLanguage("html")).toBe("html");
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
  });

  it("is case-insensitive", () => {
    expect(detectLanguage("README.MD")).toBe("markdown");
    expect(detectLanguage("APP.TS")).toBe("typescript");
  });

  it("detects dotfiles", () => {
    expect(detectLanguage(".env")).toBe("text");
  });

  it("falls back for unknown extensions", () => {
    expect(detectLanguage("notes.unknownext")).toBe("markdown");
    expect(detectLanguage("")).toBe("markdown");
    expect(detectLanguage("file.xyz_unknown")).toBe("markdown");
  });

  it("honors a custom fallback", () => {
    expect(detectLanguage("notes.unknownext", "text")).toBe("text");
    expect(detectLanguage("", "text")).toBe("text");
  });
});

describe("getLanguageMeta", () => {
  it("resolves metadata for a language id", () => {
    const meta = getLanguageMeta("typescript");
    expect(meta.label).toBe("TypeScript");
    expect(meta.prismGrammar).toBe("typescript");
  });

  it("resolves metadata from a filename", () => {
    expect(getLanguageMeta("app.ts").label).toBe("TypeScript");
  });

  it("falls back to plain-text metadata for unknown languages", () => {
    expect(getLanguageMeta("unknown").prismGrammar).toBe("plain");
  });
});

describe("getLanguageLabel", () => {
  it("returns the human-readable label", () => {
    expect(getLanguageLabel("app.py")).toBe("Python");
    expect(getLanguageLabel("index.html")).toBe("HTML");
  });
});

describe("getPrismGrammarName", () => {
  it("maps languages to their prism grammar key", () => {
    expect(getPrismGrammarName("main.py")).toBe("python");
    expect(getPrismGrammarName("component.jsx")).toBe("jsx");
  });
});

describe("isMarkdownFile", () => {
  it("detects markdown from filenames", () => {
    expect(isMarkdownFile("README.md")).toBe(true);
    expect(isMarkdownFile("notes.txt")).toBe(false);
  });

  it("defers to an explicit markdown language", () => {
    expect(isMarkdownFile("notes.txt", "markdown")).toBe(true);
  });

  it("treats no arguments as markdown", () => {
    expect(isMarkdownFile()).toBe(true);
  });

  it("treats unknown extensions as non-markdown when no language is given", () => {
    expect(isMarkdownFile("data.bin")).toBe(false);
  });
});