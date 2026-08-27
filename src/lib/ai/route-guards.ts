import { agentRequestBodySchema, AgentRequestBody } from "@/lib/schemas";
import {
  MAX_MESSAGE_CHARS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  buildRateLimitErrorMessage,
} from "@/lib/limits";
import { findImagePartViolations } from "@/lib/image-utils";
import { countTotalAttachmentParts, findDocumentPartViolations } from "@/lib/document-utils";
import { sliceMessagesAfterCompaction } from "@/lib/ai/message-extractor";
import { auth } from "@/lib/auth";
import { checkAndIncrementRateLimit, refundRateLimit, RateLimitResult } from "@/lib/rate-limit";

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

  // 5. Message length and attachment part validation
  const lastUserMsg = Array.isArray(messages)
    ? [...messages].reverse().find((m: { role?: string; content?: unknown }) => m?.role === "user")
    : null;

  if (
    lastUserMsg &&
    typeof lastUserMsg.content === "string" &&
    lastUserMsg.content.length > MAX_MESSAGE_CHARS
  ) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds maximum character limit of ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
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
    safeAsyncRefundRateLimit(rateLimit.messageLogId);
    throw error;
  }
}
