import { z } from "zod";

export const ResumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  markdownContent: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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
