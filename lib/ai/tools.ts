import { tool } from "ai";
import { z } from "zod";
import { Resume, ResumeSchema } from "@/lib/schemas";

export const setResumeMarkdown = tool({
  description:
    "Set or update the full markdown content of the single chat resume.",
  inputSchema: z.object({
    title: z
      .string()
      .optional()
      .describe(
        "Title of the resume, e.g. 'John Doe — Senior Fullstack Engineer'",
      ),
    markdownContent: z
      .string()
      .describe(
        "The complete formatted markdown string of the resume.",
      ),
  }),
  contextSchema: z.object({
    currentResume: ResumeSchema.optional().nullable(),
  }),
  execute: async ({ title, markdownContent }, { context }) => {
    const existing = context?.currentResume || null;
    const now = new Date().toISOString();

    const updatedResume: Resume = {
      id: existing?.id || "chat-resume",
      title: title || existing?.title || "Chat Resume",
      markdownContent: markdownContent || "",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    return { resume: updatedResume };
  },
});

export function createResumeTools(workingResumes?: Resume[]) {
  return {
    setResumeMarkdown,
  };
}

