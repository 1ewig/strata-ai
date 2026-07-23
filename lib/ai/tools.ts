import { tool } from "ai";
import { z } from "zod";
import { Resume, ResumeSchema } from "@/lib/schemas";
import { ResumeEditEngine } from "@/lib/edit-engine";

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

interface EditResumeContext {
  getCurrentResume: () => string;
  onUpdateResume: (newContent: string) => void;
}

export function createEditResumeTool({ getCurrentResume, onUpdateResume }: EditResumeContext) {
  return tool({
    description:
      "Surgically edit a specific block or section of the resume (e.g., update a bullet point, fix a typo, add a skill). Use searchString to specify the exact text to replace. Never output the full document — only the changed block.",
    inputSchema: z.object({
      explanation: z
        .string()
        .describe("Reason for this edit and brief overview of changes made."),
      searchString: z
        .string()
        .describe(
          "The EXACT block of text to replace, copied verbatim from `<workspace_resume>`. Include 1-2 surrounding context lines to make the match unique.",
        ),
      replaceString: z
        .string()
        .describe("The new markdown content to place in place of searchString."),
    }),
    execute: async ({ searchString, replaceString, explanation }) => {
      const currentMarkdown = getCurrentResume();

      const result = ResumeEditEngine.applyEdit(currentMarkdown, searchString, replaceString);

      if (!result.success || !result.newContent) {
        return {
          success: false,
          error: result.error,
        };
      }

      onUpdateResume(result.newContent);

      const now = new Date().toISOString();
      const updatedResume: Resume = {
        id: "chat-resume",
        title: "Chat Resume",
        markdownContent: result.newContent,
        createdAt: now,
        updatedAt: now,
      };

      return {
        success: true,
        explanation,
        strategyUsed: result.strategyUsed,
        message: "Resume section updated successfully.",
        resume: updatedResume,
      };
    },
  });
}

export function createResumeTools(editResumeContext?: EditResumeContext) {
  return {
    writeResume,
    readResume,
    deleteResume,
    ...(editResumeContext ? { editResume: createEditResumeTool(editResumeContext) } : {}),
  };
}
