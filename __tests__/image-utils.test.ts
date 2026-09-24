import { describe, it, expect } from "bun:test";
import {
  validateImageFile,
  isAllowedImageType,
  countImageParts,
  findImagePartViolations,
} from "@/lib/image-utils";
import {
  MAX_IMAGE_DATA_URL_CHARS,
  MAX_IMAGE_INPUT_BYTES,
  MAX_IMAGES_PER_MESSAGE,
} from "@/lib/limits";

describe("validateImageFile", () => {
  it("accepts whitelisted image types within the size cap", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_INPUT_BYTES })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 1 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 1024 })).toBeNull();
  });

  it("rejects non-image and unlisted media types", () => {
    expect(validateImageFile({ type: "application/pdf", size: 10 })).toContain("Unsupported image type");
    expect(validateImageFile({ type: "image/svg+xml", size: 10 })).toContain("Unsupported image type");
    expect(validateImageFile({ type: "text/plain", size: 10 })).toContain("Unsupported image type");
  });

  it("rejects files over the input size cap", () => {
    const err = validateImageFile({ type: "image/png", size: MAX_IMAGE_INPUT_BYTES + 1 });
    expect(err).toContain("size limit");
  });
});

describe("isAllowedImageType", () => {
  it("matches only the whitelist entries", () => {
    expect(isAllowedImageType("image/jpeg")).toBe(true);
    expect(isAllowedImageType("image/png")).toBe(true);
    expect(isAllowedImageType("image/webp")).toBe(true);
    expect(isAllowedImageType("image/gif")).toBe(true);
    expect(isAllowedImageType("image/heic")).toBe(false);
    expect(isAllowedImageType("image/bmp")).toBe(false);
    expect(isAllowedImageType("")).toBe(false);
  });
});

describe("countImageParts", () => {
  it("counts file parts with image/* media types", () => {
    const parts = [
      { type: "file", mediaType: "image/png", url: "data:image/png;base64,x" },
      { type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,y" },
    ];
    expect(countImageParts(parts)).toBe(2);
  });

  it("ignores non-image file parts and non-file parts", () => {
    const parts = [
      { type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,z" },
      { type: "text", text: "hello" },
      { type: "custom", value: 1 },
    ];
    expect(countImageParts(parts)).toBe(0);
  });

  it("treats missing or malformed parts arrays as zero", () => {
    expect(countImageParts(undefined)).toBe(0);
    expect(countImageParts(null as unknown as unknown[])).toBe(0);
  });

  it("aligns with the per-message cap constant", () => {
    const parts = Array.from({ length: MAX_IMAGES_PER_MESSAGE }, () => ({
      type: "file",
      mediaType: "image/png",
      url: "data:image/png;base64,x",
    }));
    expect(countImageParts(parts)).toBe(MAX_IMAGES_PER_MESSAGE);
  });
});

describe("findImagePartViolations", () => {
  it("returns no violations for valid image parts", () => {
    const parts = [
      { type: "file", mediaType: "image/png", url: "data:image/png;base64,abc" },
      { type: "text", text: "what is this?" },
    ];
    expect(findImagePartViolations(parts)).toEqual([]);
  });

  it("flags disallowed image MIME types", () => {
    const parts = [{ type: "file", mediaType: "image/tiff", url: "data:image/tiff;base64,abc" }];
    const violations = findImagePartViolations(parts);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("Unsupported image type");
    expect(violations[0].index).toBe(0);
  });

  it("flags data URLs over the size gate", () => {
    const parts = [
      { type: "file", mediaType: "image/jpeg", url: `data:image/jpeg;base64,${"a".repeat(MAX_IMAGE_DATA_URL_CHARS + 1)}` },
    ];
    const violations = findImagePartViolations(parts);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("size limit");
  });

  it("ignores text parts and non-file parts", () => {
    const parts = [
      { type: "text", text: "ok" },
      { type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,z" },
      { type: "image", mediaType: "image/png", image: "data:image/png;base64,x" },
    ];
    expect(findImagePartViolations(parts)).toEqual([]);
  });

  it("handles missing parts arrays", () => {
    expect(findImagePartViolations(undefined)).toEqual([]);
  });
});

describe("sanitizeMessagesForProvider & stripImageContentForTextOnlyProviders", () => {
  const {
    sanitizeMessagesForProvider,
    stripImageContentForTextOnlyProviders,
  } = require("@/lib/ai/sanitization");

  it("annotates UI image file parts with filename labels for google and strips binary for fireworks", async () => {
    const input = [
      {
        role: "user",
        parts: [
          { type: "file", mediaType: "image/png", filename: "diagram.png", url: "data:image/png;base64,123" },
          { type: "text", text: "Explain this diagram" },
        ],
      },
    ];

    const googleOutput = await sanitizeMessagesForProvider(input, "google");
    expect(googleOutput[0].parts).toHaveLength(3);
    expect(googleOutput[0].parts[0]).toEqual({ type: "text", text: "[Attached image: diagram.png]" });
    expect(googleOutput[0].parts[1].type).toBe("file");
    expect(googleOutput[0].parts[2]).toEqual({ type: "text", text: "Explain this diagram" });

    const fireworksOutput = await sanitizeMessagesForProvider(input, "fireworks");
    expect(fireworksOutput[0].parts).toHaveLength(2);
    expect(fireworksOutput[0].parts[0]).toEqual({ type: "text", text: "[Attached image: diagram.png]" });
    expect(fireworksOutput[0].parts[1]).toEqual({ type: "text", text: "Explain this diagram" });
  });

  it("provides a filename-labeled text placeholder when an image-only user message is stripped", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "image/jpeg", filename: "photo.jpg", url: "data:image/jpeg;base64,123" }],
      },
    ];

    const fireworksOutput = await sanitizeMessagesForProvider(input, "fireworks");
    expect(fireworksOutput[0].parts).toHaveLength(1);
    expect(fireworksOutput[0].parts[0]).toEqual({ type: "text", text: "[Attached image: photo.jpg]" });
  });

  it("decodes text attachments into named text blocks for all providers", async () => {
    const textDataUrl = `data:text/plain;base64,${Buffer.from("Hello world").toString("base64")}`;
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "text/plain", filename: "notes.txt", url: textDataUrl }],
      },
    ];

    const googleOutput = await sanitizeMessagesForProvider(input, "google");
    expect(googleOutput[0].parts[0]).toEqual({
      type: "text",
      text: "[Attached file: notes.txt]\nHello world\n[/Attached file: notes.txt]",
    });

    const fireworksOutput = await sanitizeMessagesForProvider(input, "fireworks");
    expect(fireworksOutput[0].parts[0]).toEqual({
      type: "text",
      text: "[Attached file: notes.txt]\nHello world\n[/Attached file: notes.txt]",
    });
  });

  it("extracts and injects PDF text for Fireworks / DeepSeek and passes binary to Google / Gemini", async () => {
    const samplePdfBase64 =
      "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDUgMCBSCj4+Cj4+Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNTIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihIZWxsbyBEZWVwU2VlayBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwMzYwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDQxCiUlRU9GCg==";
    const pdfDataUrl = `data:application/pdf;base64,${samplePdfBase64}`;

    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "application/pdf", filename: "resume.pdf", url: pdfDataUrl }],
      },
    ];

    const fireworksOutput = await sanitizeMessagesForProvider(input, "fireworks");
    expect(fireworksOutput[0].parts).toHaveLength(1);
    expect((fireworksOutput[0].parts[0] as any).text).toContain("[Attached document: resume.pdf (PDF)]");
    expect((fireworksOutput[0].parts[0] as any).text).toContain("Hello DeepSeek PDF");

    const googleOutput = await sanitizeMessagesForProvider(input, "google");
    expect(googleOutput[0].parts).toHaveLength(2);
    expect(googleOutput[0].parts[0]).toEqual({ type: "text", text: "[Attached document: resume.pdf (PDF)]" });
    expect(googleOutput[0].parts[1].type).toBe("file");
  });

  it("strips model-converted file and image parts for Fireworks provider", () => {
    const modelMessages = [
      {
        role: "user",
        content: [
          { type: "file", mediaType: "image/png", data: { type: "url", url: "data:image/png;base64,123" } },
          { type: "text", text: "Analyze this image" },
        ],
      },
      {
        role: "user",
        content: [
          { type: "image", image: "data:image/jpeg;base64,123" },
        ],
      },
      {
        role: "user",
        content: [
          { type: "file", mediaType: "application/pdf", data: { type: "url", url: "data:application/pdf;base64,123" } },
        ],
      },
    ];

    const googleResult = stripImageContentForTextOnlyProviders(modelMessages, "google");
    expect(googleResult).toEqual(modelMessages);

    const fireworksResult = stripImageContentForTextOnlyProviders(modelMessages, "fireworks");
    expect(fireworksResult[0].content).toEqual([{ type: "text", text: "Analyze this image" }]);
    expect(fireworksResult[1].content).toEqual([{ type: "text", text: "[Attached media]" }]);
    expect(fireworksResult[2].content).toEqual([{ type: "text", text: "[Attached media]" }]);
  });
});