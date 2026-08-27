import { convertToModelMessages, type ModelMessage } from "ai";

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
 * 2. Injects explicit filename labels (`[Attached document: filename]`, `[Attached image: filename]`)
 *    so multimodal Gemini is aware of binary file names, while text-only DeepSeek
 *    receives safe filename placeholders without crashing on binary data URLs.
 *
 * @param messages - The UI message parts arriving in the request body.
 * @param provider - The active backend provider ('google' | 'fireworks').
 * @returns A shallow-copied message array with sanitized parts and filename context.
 */
export function sanitizeMessagesForProvider(
  messages: Parameters<typeof convertToModelMessages>[0],
  provider: "google" | "fireworks",
): Parameters<typeof convertToModelMessages>[0] {
  const prune = (metadata?: Record<string, unknown>) => {
    if (!metadata) {
      return undefined;
    }
    const pruned = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => key === provider),
    );
    return Object.keys(pruned).length > 0 ? pruned : undefined;
  };

  return messages.map((message) => {
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
        const isBinary = isUIBinaryPart(sanitizedPart);

        if (!isBinary) {
          // Text-based attachment: decode and present as a named text file block
          const decoded = decodeTextDataUrl((sanitizedPart as any).url);
          const fileText = decoded !== null
            ? `[Attached file: ${filename}]\n${decoded}\n[/Attached file: ${filename}]`
            : `[Attached file: ${filename}]`;
          nextParts.push({ type: "text", text: fileText });
        } else if (provider === "fireworks") {
          // Text-only provider: replace binary part with explicit filename placeholder
          nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
        } else {
          // Multimodal provider (Gemini): include filename label annotation and binary part
          nextParts.push({ type: "text", text: formatAttachmentLabel(sanitizedPart) });
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
  }) as Parameters<typeof convertToModelMessages>[0];
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
