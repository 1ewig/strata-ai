import { mock } from "bun:test";
import type { WorkspaceFile } from "@/lib/schemas";
import { createMutableWorkspace } from "@/lib/ai/workspace";

/**
 * Builds a minimal valid workspace file for tests.
 */
export function makeFile(id: string, name: string, content = "", language = "markdown"): WorkspaceFile {
  return {
    id,
    name,
    content,
    language,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

// Harness: Tool.execute is typed for stream-time execution options; tests only
// pass the input argument and treat tool outputs as opaque.
type ToolWithExecute = { execute?: (input: any, options?: any) => any };

/**
 * Invokes a tool's execute with an empty options bag, returning the raw output.
 */
export async function runTool(
  tool: ToolWithExecute,
  input: unknown,
): Promise<any> {
  return (tool.execute as (input: unknown, options?: unknown) => Promise<any>)(input, {});
}

/**
 * Builds a workspace-tools context (mutable workspace + mocked writer) and
 * returns both so suites can assert on workspace mutations and SSE events.
 */
export function setupWorkspaceTools(initial: WorkspaceFile[] = []) {
  const writer = { write: mock() };
  const context = { ...createMutableWorkspace(initial), writer };
  return { context, writer };
}

/**
 * Runs a callback with an environment variable temporarily set, restoring the
 * previous value (or removing it) afterwards.
 */
export async function withEnv(
  key: string,
  value: string | undefined,
  fn: () => Promise<void> | void,
): Promise<void> {
  const previous = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    if (previous !== undefined) {
      process.env[key] = previous;
    } else {
      delete process.env[key];
    }
  }
}

/**
 * Builds a fake fetch Response from plain JSON data.
 */
export function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as unknown as Response;
}
