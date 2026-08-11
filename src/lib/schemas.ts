import { z } from "zod";

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

/**
 * Shared request body schema for the agent and compaction endpoints.
 * Messages are AI SDK UI-message parts and are intentionally left loose, but
 * workspace files are validated against `WorkspaceFileSchema` so the API can
 * guarantee the shape the tool closures rely on.
 */
export const agentRequestBodySchema = z.object({
  messages: z.array(z.any()),
  files: z.array(WorkspaceFileSchema).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().optional(),
  maxSteps: z.number().optional(),
});
