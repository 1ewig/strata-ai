import { describe, it, expect } from "bun:test";
import {
  validateDocumentFile,
  hasAllowedDocumentExtension,
  isAllowedDocumentMime,
  resolveDocumentMediaType,
  formatFileSize,
  countDocumentParts,
  countTotalAttachmentParts,
  findDocumentPartViolations,
} from "@/lib/document-utils";
import {
  MAX_DOCUMENT_DATA_URL_CHARS,
  MAX_DOCUMENT_INPUT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/limits";

describe("validateDocumentFile", () => {
  it("accepts whitelisted document types within the size cap", () => {
    expect(validateDocumentFile({ name: "notes.pdf", type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateDocumentFile({ name: "summary.md", type: "text/markdown", size: 2048 })).toBeNull();
    expect(validateDocumentFile({ name: "data.csv", type: "text/csv", size: 500 })).toBeNull();
    expect(validateDocumentFile({ name: "config.json", type: "application/json", size: 120 })).toBeNull();
    expect(validateDocumentFile({ name: "script.py", type: "text/x-python", size: 400 })).toBeNull();
    expect(validateDocumentFile({ name: "app.ts", type: "", size: 400 })).toBeNull();
  });

  it("rejects unsupported extensions and media types", () => {
    expect(validateDocumentFile({ name: "installer.exe", type: "application/x-msdownload", size: 10 })).toContain(
      "Unsupported document format"
    );
    expect(validateDocumentFile({ name: "archive.zip", type: "application/zip", size: 10 })).toContain(
      "Unsupported document format"
    );
  });

  it("rejects document files exceeding the size limit", () => {
    const err = validateDocumentFile({
      name: "large.pdf",
      type: "application/pdf",
      size: MAX_DOCUMENT_INPUT_BYTES + 1,
    });
    expect(err).toContain("size limit");
  });
});

describe("hasAllowedDocumentExtension & isAllowedDocumentMime", () => {
  it("validates extensions accurately", () => {
    expect(hasAllowedDocumentExtension("doc.pdf")).toBe(true);
    expect(hasAllowedDocumentExtension("DOC.PDF")).toBe(true);
    expect(hasAllowedDocumentExtension("report.md")).toBe(true);
    expect(hasAllowedDocumentExtension("table.csv")).toBe(true);
    expect(hasAllowedDocumentExtension("index.ts")).toBe(true);
    expect(hasAllowedDocumentExtension("script.py")).toBe(true);
    expect(hasAllowedDocumentExtension("image.png")).toBe(false);
    expect(hasAllowedDocumentExtension("malicious.exe")).toBe(false);
  });

  it("validates media types accurately", () => {
    expect(isAllowedDocumentMime("application/pdf")).toBe(true);
    expect(isAllowedDocumentMime("text/plain")).toBe(true);
    expect(isAllowedDocumentMime("text/markdown")).toBe(true);
    expect(isAllowedDocumentMime("text/csv")).toBe(true);
    expect(isAllowedDocumentMime("application/json")).toBe(true);
    expect(isAllowedDocumentMime("image/png")).toBe(false);
    expect(isAllowedDocumentMime("video/mp4")).toBe(false);
  });
});

describe("resolveDocumentMediaType", () => {
  it("resolves media type from explicit MIME or filename fallback", () => {
    expect(resolveDocumentMediaType({ name: "doc.pdf", type: "application/pdf" })).toBe("application/pdf");
    expect(resolveDocumentMediaType({ name: "data.csv" })).toBe("text/csv");
    expect(resolveDocumentMediaType({ name: "notes.md" })).toBe("text/markdown");
    expect(resolveDocumentMediaType({ name: "app.tsx" })).toBe("text/javascript");
    expect(resolveDocumentMediaType({ name: "main.py" })).toBe("text/x-python");
    expect(resolveDocumentMediaType({ name: "schema.sql" })).toBe("application/sql");
    expect(resolveDocumentMediaType({ name: "unknown.xyz" })).toBe("text/plain");
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes, and megabytes accurately", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1500000)).toBe("1.4 MB");
  });
});

describe("countDocumentParts & countTotalAttachmentParts", () => {
  it("counts document file parts correctly", () => {
    const parts = [
      { type: "file", mediaType: "application/pdf", url: "data:..." },
      { type: "file", mediaType: "text/markdown", url: "data:..." },
      { type: "file", mediaType: "image/png", url: "data:..." },
      { type: "text", text: "Hello" },
    ];
    expect(countDocumentParts(parts)).toBe(2);
    expect(countTotalAttachmentParts(parts)).toBe(3);
  });

  it("handles empty or missing parts arrays", () => {
    expect(countDocumentParts(undefined)).toBe(0);
    expect(countTotalAttachmentParts(undefined)).toBe(0);
  });

  it("matches attachment cap constants", () => {
    const parts = Array.from({ length: MAX_ATTACHMENTS_PER_MESSAGE }, () => ({
      type: "file",
      mediaType: "application/pdf",
      url: "data:...",
    }));
    expect(countTotalAttachmentParts(parts)).toBe(MAX_ATTACHMENTS_PER_MESSAGE);
  });
});

describe("findDocumentPartViolations", () => {
  it("returns empty array for valid document parts", () => {
    const parts = [
      { type: "file", mediaType: "application/pdf", filename: "doc.pdf", url: "data:application/pdf;base64,123" },
      { type: "file", mediaType: "text/plain", filename: "notes.txt", url: "data:text/plain;base64,123" },
    ];
    expect(findDocumentPartViolations(parts)).toEqual([]);
  });

  it("flags disallowed document formats", () => {
    const parts = [
      { type: "file", mediaType: "application/x-dosexec", filename: "setup.exe", url: "data:..." },
    ];
    const violations = findDocumentPartViolations(parts);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("Unsupported document format");
  });

  it("flags oversized data URLs", () => {
    const parts = [
      {
        type: "file",
        mediaType: "application/pdf",
        filename: "huge.pdf",
        url: `data:application/pdf;base64,${"a".repeat(MAX_DOCUMENT_DATA_URL_CHARS + 1)}`,
      },
    ];
    const violations = findDocumentPartViolations(parts);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("exceeds the size limit");
  });
});
