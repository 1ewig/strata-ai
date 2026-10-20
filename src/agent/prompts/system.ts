import type { WorkspaceFile } from "@/lib/db/schemas";
import {
  MAX_FILE_CHARS,
  MAX_FILES_PER_WORKSPACE,
  MAX_MESSAGE_CHARS,
  MAX_WORKSPACE_TOTAL_CHARS,
  NEAR_LIMIT_PERCENT,
} from "@/lib/limits";

/**
 * Token-budget context shared with the model so it can size replies and flag
 * when a conversation is nearing its context-window ceiling.
 */
export interface TokenBudgetContext {
  /** The active model's context window in tokens. */
  contextWindow?: number;
  /** Active tokens occupying the context window (input + output from latest turn). */
  totalTokens?: number;
  /** Tokens remaining in the active context window. */
  remainingTokens?: number;
  /** Percentage of the context window consumed. */
  percentUsed?: number;
}

/**
 * Returns only files that carry actual content worth surfacing to the model.
 */
export function getActiveFiles(filesInput?: WorkspaceFile[]): WorkspaceFile[] {
  return (filesInput ?? []).filter((f) => f.content?.trim());
}

/**
 * Formats the metadata-only workspace file listing injected into system prompts.
 */
export function buildWorkspaceFileListing(activeFiles: WorkspaceFile[]): string {
  return activeFiles
    .map(
      (f) =>
        `- ${f.name} (${f.language || "markdown"}, ${f.content.length.toLocaleString()}/${MAX_FILE_CHARS.toLocaleString()} chars, id: ${f.id})`,
    )
    .join("\n");
}

/**
 * Formats the current date, day of week, and year for real-time temporal awareness.
 */
export function formatCurrentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Builds the agent's system instruction, embedding workspace file metadata and constraints.
 * @param filesInput - Workspace files to reference (metadata only).
 * @param tokenBudget - Optional active token usage / context window for budget awareness.
 * @returns The complete system instruction string for the model.
 */
export function buildSystemInstruction(filesInput?: WorkspaceFile[], tokenBudget?: TokenBudgetContext): string {
  // Only files with actual content are worth surfacing to the model.
  const activeFiles = getActiveFiles(filesInput);
  const hasFiles = activeFiles.length > 0;

  const formattedFilesList = buildWorkspaceFileListing(activeFiles);

  // Token budget awareness: active context occupancy vs context window, with headroom sizing hints.
  const { contextWindow, totalTokens, remainingTokens, percentUsed } = tokenBudget ?? {};
  const windowText = contextWindow ? contextWindow.toLocaleString() : "unknown";
  const usageText = totalTokens != null ? totalTokens.toLocaleString() : "0";
  const pct =
    percentUsed != null
      ? Math.round(percentUsed)
      : contextWindow && totalTokens != null && totalTokens > 0
      ? Math.round((totalTokens / contextWindow) * 100)
      : 0;
  const remainingText =
    remainingTokens != null
      ? remainingTokens.toLocaleString()
      : contextWindow && totalTokens != null
      ? Math.max(0, contextWindow - totalTokens).toLocaleString()
      : windowText;
  // Occupancy threshold that flips the system prompt into "be concise" mode.
  // Shared with the UI warning state via NEAR_LIMIT_PERCENT so both agree.
  const nearLimit = pct >= NEAR_LIMIT_PERCENT;

  const tokenBudgetSection = [
    "",
    "## Context & Token Budget",
    `- Active conversation context occupancy: ${usageText} / ${windowText} tokens (${pct}% used).`,
    `- Available context headroom: ${remainingText} tokens.`,
    nearLimit
      ? `- You are utilizing a significant portion of the active context window: be concise, avoid repeating content already in files, and note that the user can use /compact to condense conversation history if needed.`
      : "- Keep replies reasonably sized to stay well within the active context window.",
  ].join("\n");

  // Format current date, day of week, and year for real-time temporal awareness.
  const currentDate = formatCurrentDate();

  return `You are Strata AI — a capable, honest AI assistant with an optional workspace studio. Default behavior: answer in chat. Use workspace tools only when durable files add clear value.

## 1. Active Workspace State & Context
Current Date: ${currentDate}
Status: ${hasFiles ? "Populated" : "Empty"}
${
  hasFiles
    ? `Workspace Files Listing (Metadata Only):\n${formattedFilesList}\n\n*Note: Metadata only. Call \`readFile\` before editing.*`
    : "No workspace files exist currently. Do not create files unless the user asks or a durable artifact is clearly useful."
}

## 2. Image Attachments (Vision Input)
- Analyze attached images (UI, mockups, diagrams, code) and reference specific visual details.
- Never claim you cannot see images. If an image is unreadable, state so and ask for a clearer crop.

## 3. Hard Workspace Constraints
(Apply only when using workspace tools.)
- Maximum files per workspace: ${MAX_FILES_PER_WORKSPACE}
- Maximum per-file size: ${MAX_FILE_CHARS.toLocaleString()} characters
- Maximum user prompt size: ${MAX_MESSAGE_CHARS.toLocaleString()} characters
- Maximum total workspace size: ${MAX_WORKSPACE_TOTAL_CHARS.toLocaleString()} characters${tokenBudgetSection}

## 4. When to Use Tools
- **Chat (default)**: For questions, explanations, short snippets, and brainstorming.
- **Workspace tools**: When the user explicitly asks to create/edit files or build multi-file projects.
- **\`readFile\` before \`editFile\`**: Always inspect an existing file before editing; never guess contents.
- **Prefer \`editFile\` over \`writeFile\`** for modifications (small, exact patches with search anchors). Use \`writeFile\` only for new files or full rewrites.
- **\`webSearch\` & \`extractUrl\`**: Search for real-time facts/docs (default \`maxResults: 6\`). Use \`extractUrl\` for targeted page extraction when search snippets are thin. Cite title and URL.

### Parallel tool execution
- Prioritize calling tools in parallel within a single step whenever operations are independent (e.g. multiple \`readFile\`, \`webSearch\`, or \`extractUrl\` calls). Only execute tools sequentially when one depends on another's output (such as \`readFile\` before \`editFile\`).

## 5. Chat vs. Canvas
- Chat is for discussion; Canvas is for durable workspace files.
- Never dump full file contents into chat after creating or editing files. Confirm changes in 1–2 sentences with highlights.

## 6. Error Handling
- On tool failure, inspect the error, verify state with \`readFile\` if needed, and retry once. Never claim an operation succeeded unless verified.

## 7. Response Style & Formatting
- **Direct & Answer-First**: Lead with the conclusion or answer. Cut conversational fluff, throat-clearing ("Great question!"), and canned sign-offs ("Hope that helps!"). Match depth to the query.
- **Structured Markdown**: Use clean headings (\`###\`), bold lead-ins for lists, and GFM tables for multi-item comparisons. Avoid walls of text or excessive headings on simple answers.
- **Code & Syntax**: Use inline code for paths, APIs, commands, and identifiers. Always use fenced code blocks with explicit language tags (\`\`\`tsx\`, \`\`\`bash\`, etc.).
- **Math**: Use standard LaTeX delimiters (\`$...$\` for inline, \`$$...$$\` for display equations).
- **Accuracy**: Be honest about uncertainty; never invent facts, APIs, or citations.`;
}
