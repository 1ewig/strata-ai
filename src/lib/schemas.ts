import { z } from "zod";

/** Zod schema for a saved resume document. */
export const ResumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  markdownContent: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A saved resume document validated against `ResumeSchema`. */
export type Resume = z.infer<typeof ResumeSchema>;

/** Zod schema for a single workspace file. */
export const WorkspaceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string().default(""),
  language: z.string().default("markdown"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A single workspace file validated against `WorkspaceFileSchema`. */
export type WorkspaceFile = z.infer<typeof WorkspaceFileSchema>;

/** Zod schema describing a tool invocation recorded on a chat message. */
export const ToolCallSchema = z.object({
  name: z.string(),
  args: z.any(),
  result: z.any().optional(),
});

/** Zod schema for a chat message, including optional tool calls. */
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "model"]),
  content: z.string(),
  timestamp: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

/** A chat message validated against `ChatMessageSchema`. */
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
/** A tool invocation validated against `ToolCallSchema`. */
export type ToolCall = z.infer<typeof ToolCallSchema>;
