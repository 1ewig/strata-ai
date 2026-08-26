import { createMutableWorkspace } from "@/lib/ai/workspace";
import { runAgentResponse } from "@/lib/ai/agent-runner";
import { withAgentRouteGuards, safeAsyncRefundRateLimit } from "@/lib/ai/route-guards";

/**
 * POST /api/agent - streams an agent reply using the AI SDK UI message
 * protocol. Requires an authenticated session and consumes the user's
 * rate-limit quota. Responds with JSON errors (401/400/429) or a UI message
 * stream carrying X-RateLimit-* headers.
 *
 * Enforces standardized authentication, JSON parsing, Zod validation,
 * message length & image constraints, and quota reservations via `withAgentRouteGuards`.
 *
 * @param req - The incoming request with the chat session headers and body
 * @returns A streaming text/plain response or a JSON error response
 */
export async function POST(req: Request) {
  return withAgentRouteGuards(req, async ({ session, body, messages, rateLimit, signal }) => {
    const { model, thinkingLevel, maxSteps, files, chatId } = body;

    // Clamp the requested step limit to the 1-30 range, defaulting to 25.
    const maxStepsLimit = Math.min(Math.max(maxSteps || 25, 1), 30);

    return runAgentResponse({
      workspace: createMutableWorkspace(files || []),
      messages,
      modelId: model,
      thinkingLevel,
      maxSteps: maxStepsLimit,
      signal,
      remaining5h: rateLimit.remaining5h,
      remainingWeek: rateLimit.remainingWeek,
      userId: session.user.id,
      sessionId: chatId || session.session?.id,
      onInferenceError: async () => {
        safeAsyncRefundRateLimit(rateLimit.messageLogId);
      },
    });
  });
}