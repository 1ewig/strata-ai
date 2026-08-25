import { runCompactionResponse } from "@/lib/ai/agent-runner";
import { withAgentRouteGuards, safeAsyncRefundRateLimit } from "@/lib/ai/route-guards";

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
  return withAgentRouteGuards(req, async ({ body, messages, rateLimit, signal }) => {
    return runCompactionResponse({
      files: body.files || [],
      messages,
      signal,
      remaining5h: rateLimit.remaining5h,
      remainingWeek: rateLimit.remainingWeek,
      onInferenceError: async () => {
        safeAsyncRefundRateLimit(rateLimit.messageLogId);
      },
    });
  });
}
