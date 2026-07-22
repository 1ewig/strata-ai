import { tool } from "ai";
import { z } from "zod";
import { Resume } from "@/lib/schemas";

export function createResumeTools(workingResumes: Resume[]) {
  return {
    setResumeMarkdown: tool({
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
      execute: async ({ title, markdownContent }) => {
        const existing = workingResumes.length > 0 ? workingResumes[0] : null;
        const now = new Date().toISOString();

        const updatedResume: Resume = {
          id: existing?.id || "chat-resume",
          title: title || existing?.title || "Chat Resume",
          markdownContent: markdownContent || "",
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };

        workingResumes[0] = updatedResume;

        return { resume: updatedResume };
      },
    }),
  };
}
