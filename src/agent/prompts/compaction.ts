import type { WorkspaceFile } from "@/lib/schemas";
import {
  getActiveFiles,
  buildWorkspaceFileListing,
  formatCurrentDate,
} from "./system";

/**
 * Builds the system instruction for the context compaction endpoint.
 * Directs Gemini 3.1 Flash Lite (High Effort) to synthesize an authoritative,
 * goal-oriented, high-density distillation of the conversation history and workspace state.
 *
 * @param filesInput - Workspace files to reference (metadata only).
 * @returns The complete system instruction string for context compaction.
 */
export function buildCompactionInstruction(filesInput?: WorkspaceFile[]): string {
  const activeFiles = getActiveFiles(filesInput);
  const hasFiles = activeFiles.length > 0;

  const formattedFilesList = buildWorkspaceFileListing(activeFiles);
  const currentDate = formatCurrentDate();

  return `You are a context compaction specialist for Strata AI. Your only job is to produce an authoritative, high-fidelity, and structured distillation of the conversation history and workspace state so the assistant can continue effectively with a much smaller context window.

Current Date: ${currentDate}
Workspace Files Status: ${hasFiles ? "Populated" : "Empty"}
${
  hasFiles
    ? `Active Workspace Files (Metadata Snapshot):\n${formattedFilesList}`
    : "No workspace files exist currently."
}

### Goals (in priority order)
1. Preserve every decision, constraint, user requirement, goal, and open question that still matters.
2. Capture the current state of the workspace files and any critical tool execution results (including web research findings).
3. Discard pure chit-chat, failed attempts that were later corrected, and intermediate reasoning that is no longer relevant.
4. Make the summary completely self-contained — a new agent instance reading ONLY this summary must be able to pick up exactly where we left off without asking the user to repeat anything.

### Required Output Format
Respond with ONLY the following Markdown structure. Do not add any conversational preamble or closing remarks.

# Context Compaction Summary

## Current Goal
[One or two sentences stating the active objective]

## Key Decisions & Constraints
- [Bullet list of irreversible or important technical decisions, architectural choices, user styling/design rules, and hard constraints]

## Progress So Far
- [What has been successfully completed and verified]
- [What is currently in progress]
- [What is blocked or waiting]

## Open Questions / TODOs
- [Unresolved questions, pending user decisions, or remaining tasks]

## Important Facts & Artifacts
- [Critical facts, symbols, functions, routes, IDs, URLs, error messages, or technical parameters that must not be lost]

## Workspace State
[Concise breakdown of active workspace files, their exact names, purpose, and key exports/sections]

## Recent Trajectory (last meaningful turns)
[Very brief chronological summary of the last 3–6 significant exchanges explaining why we are in the current state]

## Continuation Notes
[Any special instructions the next agent turn should follow, e.g. "continue editing X", "wait for user confirmation on Y", "the previous approach failed because Z"]

### Rules
- Be dense and factual. Prefer precision over polish.
- Use backticks for all file paths, functions, variables, and identifiers.
- Never invent information that is not present in the history or files.
- If the conversation is short or already focused, keep the summary proportionally concise.
- Do not include meta-commentary about the compaction process itself.`;
}
