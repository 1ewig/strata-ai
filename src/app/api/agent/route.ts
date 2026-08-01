import { google } from "@ai-sdk/google";
import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  smoothStream,
} from "ai";
import { z } from "zod";
import { Resume, WorkspaceFile } from "@/lib/schemas";
import { MAX_MESSAGE_CHARS } from "@/lib/limits";
import { buildSystemInstruction, createWorkspaceTools } from "@/lib/ai";

import { auth } from "@/lib/auth";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  messages: z.array(z.any()),
  files: z.array(z.any()).optional(),
  resumes: z.array(z.any()).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().optional(),
  maxSteps: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages, model, thinkingLevel, maxSteps } = parsed.data;

  // Validate latest user message character length
  const lastUserMsg = Array.isArray(messages) ? [...messages].reverse().find((m: { role?: string; content?: unknown }) => m?.role === "user") : null;
  if (lastUserMsg && typeof lastUserMsg.content === "string" && lastUserMsg.content.length > MAX_MESSAGE_CHARS) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds maximum character limit of ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const maxStepsLimit = Math.min(Math.max(maxSteps || 25, 1), 30);
  const mutableFiles: WorkspaceFile[] = parsed.data.files || [];

  // Migration / fallback from legacy resumes
  if (mutableFiles.length === 0 && parsed.data.resumes && parsed.data.resumes.length > 0) {
    const legacy: Resume = parsed.data.resumes[0];
    if (legacy.markdownContent) {
      mutableFiles.push({
        id: legacy.id || "chat-file",
        name: `${legacy.title || "resume"}.md`,
        content: legacy.markdownContent,
        language: "markdown",
        createdAt: legacy.createdAt || new Date().toISOString(),
        updatedAt: legacy.updatedAt || new Date().toISOString(),
      });
    }
  }

  const removeFileFromMutable = (fileIdOrName: string) => {
    const target = fileIdOrName.toLowerCase();
    for (let i = mutableFiles.length - 1; i >= 0; i--) {
      if (mutableFiles[i].id === fileIdOrName || mutableFiles[i].name.toLowerCase() === target) {
        mutableFiles.splice(i, 1);
      }
    }
  };

  const result = streamText({
    model: google(model || "gemini-3.5-flash-lite"),
    system: buildSystemInstruction(mutableFiles),
    messages: await convertToModelMessages(messages),
    tools: createWorkspaceTools({
      getCurrentFiles: () => mutableFiles,
      onUpdateFile: (file: WorkspaceFile) => {
        const idx = mutableFiles.findIndex(
          (f) => f.id === file.id || f.name.toLowerCase() === file.name.toLowerCase(),
        );
        if (idx >= 0) {
          mutableFiles[idx] = file;
        } else {
          mutableFiles.push(file);
        }
      },
      onDeleteFile: (fileIdOrName: string) => {
        removeFileFromMutable(fileIdOrName);
      },
    }),
    abortSignal: req.signal,
    experimental_transform: smoothStream({
      delayInMs: 15,
      chunking: "word",
    }),
    prepareStep: async ({ stepNumber }) => {
      console.log(`[agent] Preparing step ${stepNumber}. Active workspace files: ${mutableFiles.length}`);
      return {
        system: buildSystemInstruction(mutableFiles),
      };
    },
    onStart() {
      console.log("[agent] Generation stream started.");
    },
    onStepEnd({ stepNumber, toolCalls }) {
      console.log(
        `[agent] Step ${stepNumber} completed. Tool calls: ${toolCalls?.length || 0}`,
      );
    },
    onEnd({ finishReason, usage }) {
      console.log(
        `[agent] Stream finished (${finishReason}). Total token usage:`,
        usage,
      );
    },
    onError({ error }) {
      console.error("[agent] Stream error:", error);
    },
    stopWhen: isStepCount(maxStepsLimit),
    reasoning: thinkingLevel ? (thinkingLevel as any) : "provider-default",
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
    headers: {
      "X-RateLimit-Remaining-5h": String(rateLimit.remaining5h),
      "X-RateLimit-Remaining-Week": String(rateLimit.remainingWeek),
    },
  });
}

