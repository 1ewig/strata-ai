import { agentRequestBodySchema } from "@/lib/schemas";
import { MAX_MESSAGE_CHARS, MAX_IMAGES_PER_MESSAGE, buildRateLimitErrorMessage } from "@/lib/limits";
import { countImageParts, findImagePartViolations } from "@/lib/image-utils";
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

  // Validate the body shape before use. Malformed JSON is a client error, not
  // a server fault, so surface it as a 400 rather than an unhandled 500.
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

  // Validate image attachments on the latest user message: per-message count,
  // MIME whitelist, and data-URL size gate (client compresses before sending,
  // this is the server-side backstop).
  const lastUserParts = (lastUserMsg as { parts?: unknown[] } | null)?.parts;
  if (lastUserMsg && Array.isArray(lastUserParts)) {
    const imageCount = countImageParts(lastUserParts);
    if (imageCount > MAX_IMAGES_PER_MESSAGE) {
      return new Response(
        JSON.stringify({
          error: `Message exceeds maximum of ${MAX_IMAGES_PER_MESSAGE} images per message.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const violations = findImagePartViolations(lastUserParts);
    if (violations.length > 0) {
      return new Response(
        JSON.stringify({
          error: violations.map((v) => v.reason).join(" "),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
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