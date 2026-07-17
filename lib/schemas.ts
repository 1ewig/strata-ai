import { z } from "zod";

export const TaskStepSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  completed: z.boolean().default(false),
  createdAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(TaskStepSchema).default([]),
  createdAt: z.string(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;
export type Task = z.infer<typeof TaskSchema>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  toolCalls?: {
    name: string;
    args: any;
    result?: any;
  }[];
}
