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
import { buildSystemInstruction, createWorkspaceTools } from "@/lib/ai";

const bodySchema = z.object({
  messages: z.array(z.any()),
  files: z.array(z.any()).optional(),
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
    stopWhen: isStepCount(10),
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
  });
}
