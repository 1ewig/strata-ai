import { agentRequestBodySchema } from "@/lib/schemas";
import { buildRateLimitErrorMessage } from "@/lib/limits";
import { runCompactionResponse } from "@/lib/ai/agent-runner";
import { auth } from "@/lib/auth";
import { checkAndIncrementRateLimit, refundRateLimit } from "@/lib/rate-limit";
import { sliceMessagesAfterCompaction } from "@/lib/ai/message-extractor";

/**
 * POST /api/agent/compact - streams a high-density context compaction summary
 * using the AI SDK UI message protocol. Requires an authenticated session and
 * consumes the user's rate-limit quota. Responds with JSON errors (401/400/429)
 * or a UI message stream carrying X-RateLimit-* headers.
 *
 * @param req - The incoming request with the chat session headers and body
 * @returns A streaming text/plain response or a JSON error response
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  // Reject unauthenticated requests before touching the model or quota.
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate the body shape before touching quota. Malformed JSON is a client error, not
  // a server fault, so surface it as a 400 rather than an unhandled 500 or wasted quota.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: { json: ["Request body is not valid JSON."] } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const parsed = agentRequestBodySchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages, files } = parsed.data;

  // Enforce the quota (10 messages / 5 hours, 50 / week) after validating request inputs.
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

  // Prune pre-compacted dialogue: if earlier compaction exists, slice from it to avoid re-summarizing old history.
  const effectiveMessages = sliceMessagesAfterCompaction(messages);

  // Delegate compaction streaming to the agent runner (uses dedicated Gemini 3.1 Flash Lite with high reasoning effort).
  try {
    return await runCompactionResponse({
      files: files || [],
      messages: effectiveMessages,
      signal: req.signal,
      remaining5h: rateLimit.remaining5h,
      remainingWeek: rateLimit.remainingWeek,
      onInferenceError: async () => {
        if (rateLimit.messageLogId) {
          await refundRateLimit(rateLimit.messageLogId);
        }
      },
    });
  } catch (error) {
    if (rateLimit.messageLogId) {
      await refundRateLimit(rateLimit.messageLogId);
    }
    throw error;
  }
}
