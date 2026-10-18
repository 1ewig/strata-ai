import { describe, it, expect } from "bun:test";
import {
  sanitizeMessagesForProvider,
  stripImageContentForUnsupportedModels,
  isUIBinaryPart,
  isImageModelPart,
} from "@/agent/sanitization";

const SAMPLE_PDF_BASE64 =
  "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDUgMCBSCj4+Cj4+Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNTIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihIZWxsbyBEZWVwU2VlayBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwMzYwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDQxCiUlRU9GCg==";

const pdfUrl = `data:application/pdf;base64,${SAMPLE_PDF_BASE64}`;

/**
 * Test-facing wrapper returning loosely typed parts. The sanitizer returns the
 * AI SDK `UIMessagePart` union, whose members do not all carry `text`/`filename`,
 * so assertions read the parts through a single widened alias.
 */
async function sanitize(
  messages: unknown,
  provider: "google" | "fireworks",
  supportsVision: boolean,
): Promise<Array<Record<string, any>>> {
  return (await sanitizeMessagesForProvider(
    messages as Parameters<typeof sanitizeMessagesForProvider>[0],
    provider,
    supportsVision,
  )) as Array<Record<string, any>>;
}

describe("provider metadata pruning", () => {
  it("keeps only the active provider's thought signature", async () => {
    const messages = [
      {
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "thinking",
            providerMetadata: {
              google: { thoughtSignature: "sig-abc" },
              fireworks: { reasoningContent: "rc-xyz" },
            },
          },
        ],
      },
    ] as any;

    const forGoogle = await sanitize(messages, "google", true);
    expect(forGoogle[0].parts[0].providerMetadata).toEqual({ google: { thoughtSignature: "sig-abc" } });

    const forFireworks = await sanitize(messages, "fireworks", true);
    expect(forFireworks[0].parts[0].providerMetadata).toEqual({
      fireworks: { reasoningContent: "rc-xyz" },
    });
  });

  it("prunes callProviderMetadata and resultProviderMetadata too", async () => {
    const messages = [
      {
        role: "assistant",
        parts: [
          {
            type: "tool-writeFile",
            toolCallId: "call-1",
            callProviderMetadata: { google: { a: 1 }, fireworks: { b: 2 } },
            resultProviderMetadata: { google: { c: 3 }, fireworks: { d: 4 } },
          },
        ],
      },
    ] as any;

    const out = await sanitize(messages, "google", true);
    expect(out[0].parts[0].callProviderMetadata).toEqual({ google: { a: 1 } });
    expect(out[0].parts[0].resultProviderMetadata).toEqual({ google: { c: 3 } });
  });

  it("drops provider metadata entirely when no key matches the active provider", async () => {
    const messages = [
      {
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "x",
            providerMetadata: { google: { thoughtSignature: "sig" } },
          },
        ],
      },
    ] as any;

    const out = await sanitize(messages, "fireworks", true);
    expect(out[0].parts[0].providerMetadata).toBeUndefined();
  });

  it("leaves messages without parts untouched", async () => {
    const messages = [{ id: "m1", role: "user", content: "legacy" }] as any;
    const out = await sanitize(messages, "google", true);
    expect(out[0]).toEqual({ id: "m1", role: "user", content: "legacy" });
  });

  it("does not mutate the input message parts", async () => {
    const part = {
      type: "reasoning",
      text: "x",
      providerMetadata: { google: { a: 1 }, fireworks: { b: 2 } },
    };
    const messages = [{ role: "assistant", parts: [part] }] as any;
    await sanitize(messages, "fireworks", true);
    expect(part.providerMetadata).toEqual({ google: { a: 1 }, fireworks: { b: 2 } });
  });
});

describe("user attachment sanitization", () => {
  it("forwards image binaries with a filename label to vision models", async () => {
    const input = [
      {
        role: "user",
        parts: [
          { type: "file", mediaType: "image/png", filename: "shot.png", url: "data:image/png;base64,abc" },
          { type: "text", text: "what is this" },
        ],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts).toHaveLength(3);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached image: shot.png]" });
    expect(out[0].parts[1].type).toBe("file");
    expect(out[0].parts[2]).toEqual({ type: "text", text: "what is this" });
  });

  it("replaces image binaries with a filename placeholder for text-only models", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "image/jpeg", filename: "photo.jpg", url: "data:image/jpeg;base64,abc" }],
      },
    ] as any;

    const out = await sanitize(input, "google", false);
    expect(out[0].parts).toHaveLength(1);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached image: photo.jpg]" });
  });

  it("labels inline image parts by their declared media type", async () => {
    // Inline `image` parts carry no mediaType, so the shared label helper falls
    // back to the generic file label rather than the image label.
    const input = [
      { role: "user", parts: [{ type: "image", filename: "chart.png", url: "data:image/png;base64,abc" }] },
    ] as any;

    const out = await sanitize(input, "google", false);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached file: chart.png]" });

    const visionOut = await sanitize(input, "google", true);
    expect(visionOut[0].parts[0].type).toBe("image");
  });

  it("labels an inline image part as an image when it declares an image media type", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "image", mediaType: "image/png", filename: "chart.png", url: "data:image/png;base64,abc" }],
      },
    ] as any;

    const out = await sanitize(input, "google", false);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached image: chart.png]" });
  });

  it("decodes base64 text attachments into named text blocks", async () => {
    const input = [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "text/plain",
            filename: "notes.txt",
            url: `data:text/plain;base64,${Buffer.from("Hello world").toString("base64")}`,
          },
        ],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts).toHaveLength(1);
    expect(out[0].parts[0].text).toContain("[Attached file: notes.txt]");
    expect(out[0].parts[0].text).toContain("Hello world");
    expect(out[0].parts[0].text).toContain("[/Attached file: notes.txt]");
  });

  it("decodes percent-encoded (non-base64) text attachments", async () => {
    const input = [
      {
        role: "user",
        parts: [
          { type: "file", mediaType: "text/markdown", filename: "a.md", url: "data:text/markdown,hello%20world" },
        ],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts[0].text).toContain("hello world");
  });

  it("falls back to a filename-only label when a text attachment cannot be decoded", async () => {
    const input = [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "text/plain",
            filename: "broken.txt",
            url: "data:text/plain,%E0%A4%A",
          },
        ],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached file: broken.txt]" });
  });

  it("passes PDF binaries through to Gemini with a filename label", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "application/pdf", filename: "resume.pdf", url: pdfUrl }],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts).toHaveLength(2);
    expect(out[0].parts[0]).toEqual({ type: "text", text: "[Attached document: resume.pdf (PDF)]" });
    expect(out[0].parts[1].type).toBe("file");
  });

  it("extracts and injects PDF text for Fireworks models", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "application/pdf", filename: "resume.pdf", url: pdfUrl }],
      },
    ] as any;

    const out = await sanitize(input, "fireworks", true);
    expect(out[0].parts).toHaveLength(1);
    expect(out[0].parts[0].text).toContain("[Attached document: resume.pdf (PDF)]");
    expect(out[0].parts[0].text).toContain("Hello DeepSeek PDF");
  });

  it("prefers pre-extracted textContent over re-extracting the PDF binary", async () => {
    const input = [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "application/pdf",
            filename: "resume.pdf",
            url: pdfUrl,
            textContent: "Already extracted body",
          },
        ],
      },
    ] as any;

    const out = await sanitize(input, "fireworks", true);
    expect(out[0].parts[0].text).toContain("Already extracted body");
  });

  it("notes a scanned PDF when no selectable text can be extracted for Fireworks", async () => {
    const input = [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "application/pdf",
            filename: "scan.pdf",
            url: "data:application/pdf;base64,bm90LWEtcGFm",
          },
        ],
      },
    ] as any;

    const out = await sanitize(input, "fireworks", true);
    expect(out[0].parts).toHaveLength(1);
    expect(out[0].parts[0].text).toContain("Scanned document with no selectable text");
  });

  it("treats a .pdf filename as a PDF even without a matching media type", async () => {
    const input = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "", filename: "report.PDF", url: pdfUrl }],
      },
    ] as any;

    // Routed down the PDF branch, so the binary part survives alongside a label.
    const out = await sanitize(input, "google", true);
    expect(out[0].parts).toHaveLength(2);
    expect(out[0].parts[1].type).toBe("file");
    expect(out[0].parts[1].filename).toBe("report.PDF");
  });

  it("injects client-supplied PDF text verbatim without re-truncating", async () => {
    // Client-side extraction already applies MAX_DOCUMENT_TEXT_CHARS, so this
    // path trusts the provided textContent as-is.
    const body = "x".repeat(100);
    const input = [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "application/pdf",
            filename: "doc.pdf",
            url: pdfUrl,
            textContent: body,
          },
        ],
      },
    ] as any;

    const out = await sanitize(input, "fireworks", true);
    expect(out[0].parts[0].text).toContain(body);
    expect(out[0].parts[0].text).not.toContain("truncated");
  });

  it("passes non-user attachment parts through untouched", async () => {
    const input = [
      {
        role: "assistant",
        parts: [{ type: "file", mediaType: "image/png", filename: "shot.png", url: "data:image/png;base64,abc" }],
      },
    ] as any;

    const out = await sanitize(input, "google", true);
    expect(out[0].parts).toHaveLength(1);
    expect(out[0].parts[0].type).toBe("file");
  });
});

describe("stripImageContentForUnsupportedModels", () => {
  it("returns the messages unchanged for vision models", () => {
    const messages = [
      {
        role: "user",
        content: [
          { type: "image", image: "data:image/png;base64,abc" },
          { type: "text", text: "hi" },
        ],
      },
    ] as any;

    expect(stripImageContentForUnsupportedModels(messages, true)).toEqual(messages);
  });

  it("removes image and PDF parts from user turns for text-only models", () => {
    const messages = [
      {
        role: "user",
        content: [
          { type: "file", mediaType: "image/png", data: { type: "url", url: "data:image/png;base64,abc" } },
          { type: "text", text: "Analyze this" },
        ],
      },
      { role: "user", content: [{ type: "image", image: "data:image/jpeg;base64,abc" }] },
      {
        role: "user",
        content: [
          { type: "file", mediaType: "application/pdf", data: { type: "url", url: "data:application/pdf;base64,abc" } },
        ],
      },
    ] as any;

    const out = stripImageContentForUnsupportedModels(messages, false);
    expect(out[0].content).toEqual([{ type: "text", text: "Analyze this" }]);
    expect(out[1].content).toEqual([{ type: "text", text: "[Attached media]" }]);
    expect(out[2].content).toEqual([{ type: "text", text: "[Attached media]" }]);
  });

  it("leaves assistant and string-content turns untouched", () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "answer" }] },
      { role: "user", content: "plain string" },
    ] as any;

    expect(stripImageContentForUnsupportedModels(messages, false)).toEqual(messages);
  });
});

describe("binary part predicates", () => {
  it("identifies UI binary parts by type and media type", () => {
    expect(isUIBinaryPart({ type: "image" })).toBe(true);
    expect(isUIBinaryPart({ type: "file", mediaType: "image/png" })).toBe(true);
    expect(isUIBinaryPart({ type: "file", mediaType: "application/pdf" })).toBe(true);
    expect(isUIBinaryPart({ type: "file", mediaType: "text/plain" })).toBe(false);
    expect(isUIBinaryPart({ type: "text" })).toBe(false);
    expect(isUIBinaryPart(undefined)).toBe(false);
  });

  it("identifies converted model binary parts by type and media type", () => {
    expect(isImageModelPart({ type: "image" })).toBe(true);
    expect(isImageModelPart({ type: "file", mediaType: "image/webp" })).toBe(true);
    expect(isImageModelPart({ type: "file", mimeType: "application/pdf" })).toBe(true);
    expect(isImageModelPart({ type: "file", mediaType: "text/plain" })).toBe(false);
    expect(isImageModelPart(null)).toBe(false);
  });
});
