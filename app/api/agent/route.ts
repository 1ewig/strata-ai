import { google } from "@ai-sdk/google";
import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { Resume } from "@/lib/schemas";
import { buildSystemInstruction, createResumeTools } from "@/lib/ai";

const bodySchema = z.object({
  messages: z.array(z.any()),
  resumes: z.array(z.any()).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages, model, thinkingLevel } = parsed.data;
  const workingResumes: Resume[] = parsed.data.resumes || [];
  const currentResume = workingResumes.length > 0 ? workingResumes[0] : undefined;

  const result = streamText({
    model: google(model || "gemini-3.5-flash-lite"),
    system: buildSystemInstruction(currentResume),
    messages: await convertToModelMessages(messages),
    tools: createResumeTools(),
    toolsContext: {
      setResumeMarkdown: {
        currentResume,
      },
    },
    onStart() {
      console.log("[agent] Generation stream started.");
    },
    onStepEnd({ stepNumber, toolCalls }) {
      console.log(
        `[agent] Step ${stepNumber} completed. Executed tool calls: ${toolCalls?.length || 0}`,
      );
    },
    onEnd({ finishReason, usage }) {
      console.log(
        `[agent] Stream finished (${finishReason}). Total token usage:`,
        usage,
      );
    },
    onError({ error }) {
      console.error("[agent] Detailed error:", error);
    },
    stopWhen: isStepCount(5),
    providerOptions:
      thinkingLevel && thinkingLevel.length > 0
        ? {
            google: {
              thinkingConfig: {
                thinkingLevel: thinkingLevel as
                  | "minimal"
                  | "low"
                  | "medium"
                  | "high",
                includeThoughts: true,
              },
            },
          }
        : undefined,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
