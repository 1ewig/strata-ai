import { z } from "zod";

export const ResumeSectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number(),
});

export const ResumeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  rawText: z.string(),
  sections: z.array(ResumeSectionSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ResumeSection = z.infer<typeof ResumeSectionSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

export const ToolCallSchema = z.object({
  name: z.string(),
  args: z.any(),
  result: z.any().optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "model"]),
  content: z.string(),
  timestamp: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
