import { convertToModelMessages, type ModelMessage } from "ai";

/**
 * Strips provider-specific metadata from conversation messages that belongs to a
 * provider other than the one serving the current request.
 *
 * Prevents cross-provider metadata leaks that break strict-schema providers.
 * The classic failure: a Gemini (Google) tool-call part carries a stored thought
 * signature (UI `callProviderMetadata.google.thoughtSignature`); when that
 * history is later replayed into a Fireworks/DeepSeek request,
 * `convertToModelMessages` re-emits it as `providerOptions` on the tool-call
 * part and the openai-compatible converter turns it into `extra_content`, which
 * Fireworks rejects with:
 * "Extra inputs are not permitted, field: 'messages[N].tool_calls[0].extra_content'".
 * Keeping the active provider's own keys is intentional so Google's thought
 * signatures still round-trip for Gemini requests.
 *
 * All three metadata field shapes are pruned: `providerMetadata` (text/reasoning
 * parts), `callProviderMetadata` / `resultProviderMetadata` (tool parts).
 *
 * @param messages - The UI message parts arriving in the request body.
 * @param provider - The active backend provider ('google' | 'fireworks').
 * @returns A shallow-copied message array with non-active provider metadata pruned.
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

  const isUIBinaryPart = (part: any) => {
    if (!part) return false;
    if (part.type === "image") return true;
    if (part.type === "file") {
      const mediaType = part.mediaType || part.mimeType;
      if (typeof mediaType === "string" && (mediaType.startsWith("image/") || mediaType === "application/pdf")) {
        return true;
      }
    }
    return false;
  };

  return messages.map((message) => {
    const parts = message.parts;
    if (!Array.isArray(parts)) {
      return message;
    }

    let nextParts = parts.map((part) => {
      const typedPart = part as {
        providerMetadata?: Record<string, unknown>;
        callProviderMetadata?: Record<string, unknown>;
        resultProviderMetadata?: Record<string, unknown>;
      };
      return {
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
    });

    if (provider === "fireworks" && message.role === "user") {
      const nonBinaryParts = nextParts.filter((part) => !isUIBinaryPart(part));
      if (nonBinaryParts.length !== nextParts.length) {
        nextParts = nonBinaryParts.length > 0
          ? nonBinaryParts
          : [{ type: "text", text: "[Attached media]" }];
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
