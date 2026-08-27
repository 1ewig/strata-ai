import { convertToModelMessages, type ModelMessage } from "ai";
import { extractText } from "unpdf";
import { MAX_DOCUMENT_TEXT_CHARS } from "@/lib/limits";

/**
 * Attempts to decode a data URL containing text-based content into a UTF-8 string.
 */
function decodeTextDataUrl(url?: string): string | null {
  if (!url || typeof url !== "string" || !url.startsWith("data:")) return null;
  try {
    const commaIdx = url.indexOf(",");
    if (commaIdx === -1) return null;
    const meta = url.slice(5, commaIdx);
    const data = url.slice(commaIdx + 1);
    if (meta.includes(";base64")) {
      return Buffer.from(data, "base64").toString("utf-8");
    }
    return decodeURIComponent(data);
  } catch {
    return null;
  }
}

/**
 * Attempts to extract text from a base64 PDF data URL.
 */
async function extractPdfTextFromDataUrl(url?: string): Promise<string | null> {
  if (!url || typeof url !== "string" || !url.startsWith("data:")) return null;
  try {
    const commaIdx = url.indexOf(",");
    if (commaIdx === -1) return null;
    const meta = url.slice(5, commaIdx).toLowerCase();
    if (!meta.includes("application/pdf")) return null;
    const base64Data = url.slice(commaIdx + 1);
    const buf = Buffer.from(base64Data, "base64");
    const res = await extractText(new Uint8Array(buf), { mergePages: true });
    const textVal = res.text as unknown;
    const rawText = typeof textVal === "string"
      ? textVal.trim()
      : (Array.isArray(textVal) ? (textVal as string[]).join("\n\n").trim() : "");
    if (!rawText) return null;
    if (rawText.length > MAX_DOCUMENT_TEXT_CHARS) {
      return rawText.slice(0, MAX_DOCUMENT_TEXT_CHARS) +
        `\n\n[... Document text truncated at ${MAX_DOCUMENT_TEXT_CHARS.toLocaleString()} characters ...]`;
    }
    return rawText;
  } catch (err) {
    console.warn("[sanitization] Failed to extract text from PDF data URL:", err);
    return null;
  }
}

/**
 * Returns a human-readable attachment descriptor label including the filename.
 */
function formatAttachmentLabel(part: any): string {
  const filename = part?.filename || "file";
  const mediaType = String(part?.mediaType || part?.mimeType || "").toLowerCase();
  if (mediaType.startsWith("image/")) {
    return `[Attached image: ${filename}]`;
  }
  if (mediaType === "application/pdf") {
    return `[Attached document: ${filename} (PDF)]`;
  }
  return `[Attached file: ${filename}]`;
}

/**
 * Checks if a UI part represents a binary payload (image or PDF).
 */
export function isUIBinaryPart(part: any): boolean {
  if (!part) return false;
  if (part.type === "image") return true;
  if (part.type === "file") {
    const mediaType = String(part.mediaType || part.mimeType || "").toLowerCase();
    return mediaType.startsWith("image/") || mediaType === "application/pdf";
  }
  return false;
}

/**
 * Strips provider-specific metadata from conversation messages that belongs to a
 * provider other than the one serving the current request.
 *
 * Additionally:
 * 1. Decodes text-based document attachments into labeled text blocks with explicit
 *    filenames (`[Attached file: filename]...[/Attached file: filename]`) so all
 *    models (both Gemini and DeepSeek) can read their filenames and contents.
 * 2. Extracts and injects text from PDF attachments for text-only providers (DeepSeek)
 *    so DeepSeek can process resumes, documents, and reports from PDFs.
 * 3. Injects explicit filename labels (`[Attached document: filename]`, `[Attached image: filename]`)
 *    so multimodal Gemini is aware of binary file names, while text-only DeepSeek
 *    receives safe filename placeholders without crashing on binary image data URLs.
 *
 * @param messages - The UI message parts arriving in the request body.
 * @param provider - The active backend provider ('google' | 'fireworks').
 * @returns A shallow-copied message array with sanitized parts and filename context.
 */
export async function sanitizeMessagesForProvider(
  messages: Parameters<typeof convertToModelMessages>[0],
  provider: "google" | "fireworks",
): Promise<Parameters<typeof convertToModelMessages>[0]> {
  const prune = (metadata?: Record<string, unknown>) => {
    if (!metadata) {
      return undefined;
    }
    const pruned = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => key === provider),
    );
    return Object.keys(pruned).length > 0 ? pruned : undefined;
  };

  const sanitizedMessages = await Promise.all(
    messages.map(async (message) => {
      const parts = message.parts;
      if (!Array.isArray(parts)) {
        return message;
      }

      const nextParts: any[] = [];

      for (const part of parts) {
        const typedPart = part as {
          providerMetadata?: Record<string, unknown>;
          callProviderMetadata?: Record<string, unknown>;
          resultProviderMetadata?: Record<string, unknown>;
        };

        const sanitizedPart = {
          ...part,
          ...(typedPart.providerMetadata !== undefined
            ? { providerMetadata: prune(typedPart.providerMetadata) }
            : {}),
          ...(typedPart.callProviderMetadata !== undefined
            ? { callProviderMetadata: prune(typedPart.callProviderMetadata) }
            : {}),
          ...(typedPart.resultProviderMetadata !== undefined
            ? { resultProviderMetadata: prune(typedPart.resultProviderMetadata) }
            : {}),
        };

        if (message.role === "user" && sanitizedPart.type === "file") {
          const filename = (sanitizedPart as any).filename || "file";
          const mediaType = String((sanitizedPart as any).mediaType || (sanitizedPart as any).mimeType || "").toLowerCase();
          const isPdf = mediaType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
          const isImage = mediaType.startsWith("image/");

          if (isPdf) {
            if (provider === "fireworks") {
              // DeepSeek / text-only provider: extract PDF text and inject as document content block
              const rawText = (sanitizedPart as any).textContent || (await extractPdfTextFromDataUrl((sanitizedPart as any).url));
              if (rawText && rawText.trim()) {
                const docText = `[Attached document: ${filename} (PDF)]\n--- Document Text Content ---\n${rawText.trim()}\n--- End Document Content ---\n[/Attached document: ${filename} (PDF)]`;
                nextParts.push({ type: "text", text: docText });
              } else {
                nextParts.push({
                  type: "text",
                  text: `[Attached document: ${filename} (PDF - Scanned document with no selectable text. DeepSeek is text-only; please switch to a Gemini vision model to analyze scanned documents)]`,
                });
              }
            } else {
              // Multimodal provider (Gemini): include filename label annotation and binary part
              nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
              nextParts.push(sanitizedPart);
            }
          } else if (!isImage) {
            // Text-based code/doc attachment: decode and present as a named text file block
            const decoded = decodeTextDataUrl((sanitizedPart as any).url);
            const fileText = decoded !== null
              ? `[Attached file: ${filename}]\n${decoded}\n[/Attached file: ${filename}]`
              : `[Attached file: ${filename}]`;
            nextParts.push({ type: "text", text: fileText });
          } else if (provider === "fireworks") {
            // Text-only provider with image: replace binary part with explicit filename placeholder
            nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
          } else {
            // Multimodal provider (Gemini) with image: include filename label annotation and binary part
            nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
            nextParts.push(sanitizedPart);
          }
        } else if (message.role === "user" && (sanitizedPart as any).type === "image") {
          if (provider === "fireworks") {
            nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
          } else {
            nextParts.push(sanitizedPart);
          }
        } else {
          nextParts.push(sanitizedPart);
        }
      }

      return {
        ...message,
        parts: nextParts,
      };
    })
  );

  return sanitizedMessages as Parameters<typeof convertToModelMessages>[0];
}

/**
 * Checks if a part represents an image or binary document inside converted model messages.
 */
export function isImageModelPart(part: any): boolean {
  if (!part) return false;
  if (part.type === "image") return true;
  if (part.type === "file") {
    const mediaType = part.mediaType || part.mimeType;
    if (typeof mediaType === "string" && (mediaType.startsWith("image/") || mediaType === "application/pdf")) {
      return true;
    }
  }
  return false;
}

/**
 * Removes image and binary content parts from converted model messages when the active
 * provider cannot accept multimodal input (Fireworks-hosted DeepSeek).
 *
 * Conversations that once contained image/PDF attachments replay that history on
 * every request, so a text-only model would otherwise hard-fail forever on an
 * old binary attachment. The client attach gate prevents new attachments on text-only;
 * this strip keeps existing history usable and logs the drop.
 *
 * @param modelMessages - Messages converted by `convertToModelMessages`.
 * @param provider - The active backend provider.
 * @returns Messages with binary content removed (unchanged for Google).
 */
export function stripImageContentForTextOnlyProviders(
  modelMessages: ModelMessage[],
  provider: "google" | "fireworks",
): ModelMessage[] {
  if (provider !== "fireworks") {
    return modelMessages;
  }
  return modelMessages.map((message) => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      return message;
    }
    const filtered = message.content.filter((part) => !isImageModelPart(part));
    if (filtered.length === message.content.length) {
      return message;
    }
    console.log(
      `[agent] Stripped ${message.content.length - filtered.length} binary part(s) for text-only provider.`
    );
    return {
      ...message,
      content: filtered.length > 0 ? filtered : [{ type: "text" as const, text: "[Attached media]" }],
    };
  });
}
