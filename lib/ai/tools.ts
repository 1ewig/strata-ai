import { tool } from "ai";
import { z } from "zod";
import { Resume, ResumeSchema } from "@/lib/schemas";

export const writeResume = tool({
  description:
    "Create or replace the entire resume markdown on the canvas. Use for initial creation or full rewrites. Always call readResume first to inspect the current state.",
  inputSchema: z.object({
    title: z
      .string()
      .optional()
      .describe(
        "Title of the resume, e.g. 'John Doe — Senior Fullstack Engineer'",
      ),
    markdownContent: z
      .string()
      .describe("The complete formatted markdown string of the resume."),
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

export const readResume = tool({
  description:
    "Read the full resume or a specific section from the resume canvas. Always call this before making changes.",
  inputSchema: z.object({
    section: z
      .string()
      .optional()
      .describe(
        "Optional section heading to read (e.g. 'Professional Summary', 'Work Experience'). Omit to read the full resume.",
      ),
  }),
  contextSchema: z.object({
    currentResume: ResumeSchema.optional().nullable(),
  }),
  execute: async ({ section }, { context }) => {
    const resume = context?.currentResume;
    if (!resume?.markdownContent?.trim()) {
      return { exists: false, content: "The resume canvas is empty." };
    }

    if (section) {
      const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(
        `##\\s*${escaped}[\\s\\S]*?(?=\\n##\\s|\\n$)`,
        "i",
      );
      const match = resume.markdownContent.match(regex);
      if (match) {
        return { exists: true, section, content: match[0].trim() };
      }
      return {
        exists: false,
        section,
        content: `Section "${section}" not found.`,
      };
    }

    return { exists: true, content: resume.markdownContent.trim() };
  },
});

export const deleteResume = tool({
  description:
    "Clear the resume canvas entirely. Only use when the user explicitly asks to start over or delete their resume.",
  inputSchema: z.object({}),
  contextSchema: z.object({
    currentResume: ResumeSchema.optional().nullable(),
  }),
  execute: async (_, { context }) => {
    const existing = context?.currentResume;
    const now = new Date().toISOString();
    const emptyResume: Resume = {
      id: existing?.id || "chat-resume",
      title: existing?.title || "Chat Resume",
      markdownContent: "",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return { deleted: true, resume: emptyResume };
  },
});

export function createResumeTools(workingResumes?: Resume[]) {
  return {
    writeResume,
    readResume,
    deleteResume,
  };
}
