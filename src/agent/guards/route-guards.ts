import { agentRequestBodySchema, type AgentRequestBody } from "./schemas";
import {
  MAX_MESSAGE_CHARS,
  MAX_HISTORY_CHARS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_FILES_PER_WORKSPACE,
  MAX_FILE_CHARS,
  MAX_WORKSPACE_TOTAL_CHARS,
  buildRateLimitErrorMessage,
} from "@/lib/limits";
import { findImagePartViolations } from "@/lib/attachments/images";
import { countTotalAttachmentParts, findDocumentPartViolations } from "@/lib/attachments/documents";
import { sliceMessagesAfterCompaction } from "../client/extractor";
import { auth } from "@/lib/auth/server";
import { checkAndIncrementRateLimit, refundRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { classifyProviderError } from "../core/error-classifier";

/**
 * Context passed to the route delegate after validation and rate-limiting have succeeded.
 */
export interface AgentRouteContext {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  body: AgentRequestBody;
  messages: AgentRequestBody["messages"];
  rateLimit: RateLimitResult;
  signal: AbortSignal;
}

/**
 * Asynchronously refunds the user's rate-limit log entry without blocking the response
 * or failing if the database encounters transient network congestion.
 * @param messageLogId - The database message_log row ID to delete.
 */
export function safeAsyncRefundRateLimit(messageLogId?: string): void {
  if (!messageLogId) return;
  refundRateLimit(messageLogId).catch((err) => {
    console.error("[rate-limit] Asynchronous refund failed:", err);
  });
}

/**
 * Counts the text characters carried by a single UI message, covering both
 * legacy string content and parts-based messages (`text` parts only). Used to
 * enforce message and history size bounds on client-supplied histories.
 */
function countMessageTextChars(message: unknown): number {
  if (!message || typeof message !== "object") return 0;
  const { content, parts } = message as { content?: unknown; parts?: unknown };
  if (typeof content === "string") return content.length;
  if (!Array.isArray(parts)) return 0;
  return parts.reduce((sum: number, part) => {
    if (part && typeof part === "object" && (part as { type?: unknown }).type === "text") {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return sum + text.length;
    }
    return sum;
  }, 0);
}

/**
 * Shared higher-order route guard for `/api/agent` and `/api/agent/compact`.
 *
 * Enforces the standardized pipeline:
 * 1. Authentication (401)
 * 2. JSON Body Parsing (400)
 * 3. Zod Schema Validation (400)
 * 4. Semantic Bounds (Message length & Attachment parts) (400)
 * 5. Rate-Limit Quota Reservation (429)
 * 6. Delegated Execution with Automated Refund on Failure
 *
 * @param req - The incoming HTTP Request.
 * @param handler - The route handler to invoke once guards pass.
 * @returns The streaming Response or JSON error Response.
 */
export async function withAgentRouteGuards(
  req: Request,
  handler: (ctx: AgentRouteContext) => Promise<Response>,
): Promise<Response> {
  // 1. Authentication check
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Request body JSON parsing
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: { json: ["Request body is not valid JSON."] },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. Zod schema validation
  const parsed = agentRequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Prune history before the latest successful compaction summary
  const messages = sliceMessagesAfterCompaction(parsed.data.messages);

  // 5. Semantic bounds (text length, history size, attachments, workspace files)
  const lastUserMsg = Array.isArray(messages)
    ? [...messages].reverse().find((m: { role?: string; content?: unknown }) => m?.role === "user")
    : null;

  // Per-message character limit — enforced on parts-based messages too, since
  // the legacy string-content check alone never fires for the real client.
  if (lastUserMsg && countMessageTextChars(lastUserMsg) > MAX_MESSAGE_CHARS) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds maximum character limit of ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Total replayed-history cap so a hostile client cannot inflate token spend
  // by forging arbitrarily large prior turns.
  const totalHistoryChars = Array.isArray(messages)
    ? messages.reduce((sum: number, m: unknown) => sum + countMessageTextChars(m), 0)
    : 0;
  if (totalHistoryChars > MAX_HISTORY_CHARS) {
    return new Response(
      JSON.stringify({
        error: `Conversation history exceeds the maximum size of ${MAX_HISTORY_CHARS.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Client-supplied workspace state is untrusted; apply the same file bounds
  // the local client enforces against its own Dexie workspace.
  const workspaceFiles = parsed.data.files;
  if (workspaceFiles) {
    if (workspaceFiles.length > MAX_FILES_PER_WORKSPACE) {
      return new Response(
        JSON.stringify({
          error: `Workspace exceeds the maximum of ${MAX_FILES_PER_WORKSPACE} files.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const oversizedFile = workspaceFiles.find((f) => f.content.length > MAX_FILE_CHARS);
    if (oversizedFile) {
      return new Response(
        JSON.stringify({
          error: `Workspace file "${oversizedFile.name}" exceeds the maximum size of ${MAX_FILE_CHARS.toLocaleString()} characters.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const totalFileChars = workspaceFiles.reduce((sum, f) => sum + f.content.length, 0);
    if (totalFileChars > MAX_WORKSPACE_TOTAL_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Workspace exceeds the maximum total size of ${MAX_WORKSPACE_TOTAL_CHARS.toLocaleString()} characters.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const lastUserParts = (lastUserMsg as { parts?: unknown[] } | null)?.parts;
  if (lastUserMsg && Array.isArray(lastUserParts)) {
    const totalAttachmentCount = countTotalAttachmentParts(lastUserParts);
    if (totalAttachmentCount > MAX_ATTACHMENTS_PER_MESSAGE) {
      return new Response(
        JSON.stringify({
          error: `Message exceeds maximum of ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const imageViolations = findImagePartViolations(lastUserParts);
    const docViolations = findDocumentPartViolations(lastUserParts);
    const allViolations = [...imageViolations, ...docViolations];
    if (allViolations.length > 0) {
      return new Response(
        JSON.stringify({
          error: allViolations.map((v) => v.reason).join(" "),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 6. Quota reservation (only after all input validations have passed)
  const rateLimit = await checkAndIncrementRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: buildRateLimitErrorMessage(rateLimit.retryAfter),
        retryAfter: rateLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Remaining-5h": "0",
          "X-RateLimit-Remaining-Week": String(rateLimit.remainingWeek),
          "X-RateLimit-Retry-After": String(rateLimit.retryAfter || 0),
        },
      },
    );
  }

  // 7. Execute handler with automatic non-blocking quota refund guard on failure
  try {
    return await handler({
      session,
      body: parsed.data,
      messages,
      rateLimit,
      signal: req.signal,
    });
  } catch (error) {
    // User-initiated aborts (stop button, tab close, disconnects) are not
    // provider failures — the user chose to cancel, so the reserved quota
    // slot is consumed rather than refunded.
    const classified = classifyProviderError(error);
    if (classified.code !== "ABORTED") {
      safeAsyncRefundRateLimit(rateLimit.messageLogId);
    }
    throw error;
  }
}
