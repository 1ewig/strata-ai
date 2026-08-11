import { agentRequestBodySchema } from "@/lib/schemas";
import { MAX_MESSAGE_CHARS, buildRateLimitErrorMessage } from "@/lib/limits";
import { createMutableWorkspace } from "@/lib/ai/workspace";
import { runAgentResponse } from "@/lib/ai/agent-runner";
import { sliceMessagesAfterCompaction } from "@/lib/ai/message-extractor";

import { auth } from "@/lib/auth";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/agent - streams an agent reply using the AI SDK UI message
 * protocol. Requires an authenticated session and consumes the user's
 * rate-limit quota. Responds with JSON errors (401/400/429) or a UI message
 * stream carrying X-RateLimit-* headers.
 *
 * This route is a thin HTTP/security/validation shell: authentication,
 * quota enforcement, body validation, and step clamping live here, while the
 * model/stream/tool configuration lives in `runAgentResponse`.
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

  // Enforce the quota (10 messages / 5 hours, 50 / week) before streaming.
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

  // Validate the body shape before use.
  const parsed = agentRequestBodySchema.safeParse(await req.json());

  // Return zod validation failures as a 400 with flattened details.
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { model, thinkingLevel, maxSteps } = parsed.data;

  // Prune history before the latest compaction summary so the model receives
  // [Compacted Summary, ...newMessages] without context blowup.
  const messages = sliceMessagesAfterCompaction(parsed.data.messages);

  // Validate latest user message character length.
  const lastUserMsg = Array.isArray(messages)
    ? [...messages].reverse().find((m: { role?: string; content?: unknown }) => m?.role === "user")
    : null;
  if (lastUserMsg && typeof lastUserMsg.content === "string" && lastUserMsg.content.length > MAX_MESSAGE_CHARS) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds maximum character limit of ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Clamp the requested step limit to the 1-30 range, defaulting to 25.
  const maxStepsLimit = Math.min(Math.max(maxSteps || 25, 1), 30);

  // Delegate model streaming, tool wiring, and SSE wrapping to the agent runner.
  return runAgentResponse({
    workspace: createMutableWorkspace(parsed.data.files || []),
    messages,
    modelId: model,
    thinkingLevel,
    maxSteps: maxStepsLimit,
    signal: req.signal,
    remaining5h: rateLimit.remaining5h,
    remainingWeek: rateLimit.remainingWeek,
  });
}