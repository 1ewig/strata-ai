import { z } from "zod";
import { WorkspaceFile } from "@/lib/schemas";
import { runCompactionResponse } from "@/lib/ai/agent-runner";
import { auth } from "@/lib/auth";

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
 * using the AI SDK UI message protocol. Requires an authenticated session.
 *
 * @param req - The incoming request with the chat session headers and body
 * @returns A streaming text/plain response or a JSON error response
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  // Reject unauthenticated requests before touching the model.
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
  });
}
