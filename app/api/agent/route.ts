import { google } from "@ai-sdk/google";
import {
  streamText,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
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
  let mutableFiles: WorkspaceFile[] = parsed.data.files || [];

  // Migration / fallback from legacy resumes
  if (mutableFiles.length === 0 && parsed.data.resumes && parsed.data.resumes.length > 0) {
    const legacy: Resume = parsed.data.resumes[0];
    if (legacy.markdownContent) {
      mutableFiles = [
        {
          id: legacy.id || "chat-file",
          name: `${legacy.title || "resume"}.md`,
          content: legacy.markdownContent,
          language: "markdown",
          createdAt: legacy.createdAt || new Date().toISOString(),
          updatedAt: legacy.updatedAt || new Date().toISOString(),
        },
      ];
    }
  }

  const result = streamText({
    model: google(model || "gemini-3.5-flash-lite"),
    system: buildSystemInstruction(mutableFiles),
    messages: await convertToModelMessages(messages),
    tools: createWorkspaceTools({
      getCurrentFiles: () => mutableFiles,
      onUpdateFile: (file: WorkspaceFile) => {
        const idx = mutableFiles.findIndex(f => f.id === file.id || f.name === file.name);
        if (idx >= 0) {
          mutableFiles[idx] = file;
        } else {
          mutableFiles.push(file);
        }
      },
      onDeleteFile: (fileId: string) => {
        mutableFiles = mutableFiles.filter(f => f.id !== fileId);
      },
    }),
    toolsContext: {
      listFiles: { workspaceFiles: mutableFiles },
      readFile: { workspaceFiles: mutableFiles },
      writeFile: { workspaceFiles: mutableFiles },
      // Legacy context mappings
      writeResume: { workspaceFiles: mutableFiles },
      readResume: { workspaceFiles: mutableFiles },
    },
    onStart() {
      console.log("[agent] Generation stream started.");
    },
    onStepEnd({ stepNumber, toolCalls }) {
      for (const tc of toolCalls || []) {
        const call = tc as any;
        const result = call.result;
        if (result?.file) {
          const idx = mutableFiles.findIndex(f => f.id === result.file.id || f.name === result.file.name);
          if (idx >= 0) {
            mutableFiles[idx] = result.file;
          } else {
            mutableFiles.push(result.file);
          }
        }
        if (result?.deleted && result?.fileId) {
          mutableFiles = mutableFiles.filter(f => f.id !== result.fileId);
        }
        if (call.toolName === "writeResume" && result?.resume?.markdownContent) {
          mutableFiles[0] = {
            id: result.resume.id || "chat-file",
            name: `${result.resume.title || "resume"}.md`,
            content: result.resume.markdownContent,
            language: "markdown",
            createdAt: result.resume.createdAt || new Date().toISOString(),
            updatedAt: result.resume.updatedAt || new Date().toISOString(),
          };
        }
      }
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
      console.error("[agent] Detailed error:", error);
    },
    stopWhen: isStepCount(10),
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
