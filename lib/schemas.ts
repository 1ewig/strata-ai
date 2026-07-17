import { z } from "zod";

export const TaskStepSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  completed: z.boolean().default(false),
  createdAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(TaskStepSchema).default([]),
  createdAt: z.string(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;
export type Task = z.infer<typeof TaskSchema>;

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
