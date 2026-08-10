import { z } from "zod";
import { WorkspaceFile } from "@/lib/schemas";
import { runCompactionResponse } from "@/lib/ai/agent-runner";
import { auth } from "@/lib/auth";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";

/**
 * Schema for the compaction request body: conversation messages plus optional
 * workspace files and model configuration.
 */
const compactionBodySchema = z.object({
  messages: z.array(z.any()),
  files: z.array(z.any()).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().optional(),
});

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

  // Enforce the quota (10 messages / 5 hours, 50 / week) before streaming.
  const rateLimit = await checkAndIncrementRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `Max 10 messages per 5 hours, 50 per week. Try again in ${Math.ceil(rateLimit.retryAfter! / 60)} min.`,
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
  const parsed = compactionBodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages, files, model, thinkingLevel } = parsed.data;

  // Delegate compaction streaming to the agent runner.
  return runCompactionResponse({
    files: (files as WorkspaceFile[]) || [],
    messages,
    modelId: model,
    thinkingLevel,
    signal: req.signal,
    remaining5h: rateLimit.remaining5h,
    remainingWeek: rateLimit.remainingWeek,
  });
}
