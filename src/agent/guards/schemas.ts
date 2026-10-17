import { z } from "zod";
import { WorkspaceFileSchema, type WorkspaceFile } from "@/lib/schemas";

export { WorkspaceFileSchema, type WorkspaceFile };

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
  chatId: z.string().optional(),
});

/** Request payload validated against `agentRequestBodySchema`. */
export type AgentRequestBody = z.infer<typeof agentRequestBodySchema>;
