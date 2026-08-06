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
