import { Type, FunctionDeclaration } from "@google/genai";
import { Resume } from "../schemas";

export const setResumeMarkdownTool: FunctionDeclaration = {
  name: "setResumeMarkdown",
  description: "Set or update the full markdown content of the single chat resume.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the resume, e.g. 'John Doe — Senior Fullstack Engineer'" },
      markdownContent: { type: Type.STRING, description: "The complete formatted markdown string of the resume." },
    },
    required: ["markdownContent"],
  },
};

export const ALL_TOOLS: FunctionDeclaration[] = [setResumeMarkdownTool];

export function executeTool(
  name: string,
  args: any,
  resumes: Resume[]
): { result: any; updatedResumes: Resume[]; updated: boolean } {
  if (name === "setResumeMarkdown") {
    const existing = resumes.length > 0 ? resumes[0] : null;
    const now = new Date().toISOString();

    const updatedResume: Resume = {
      id: existing?.id || "chat-resume",
      title: args.title || existing?.title || "Chat Resume",
      markdownContent: args.markdownContent || "",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    return {
      result: {
        status: "success",
        message: "Updated resume markdown.",
        resume: updatedResume,
      },
      updatedResumes: [updatedResume],
      updated: true,
    };
  }

  return {
    result: { status: "error", message: `Unknown tool execution: ${name}` },
    updatedResumes: resumes,
    updated: false,
  };
}
