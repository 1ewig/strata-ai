# Strata AI — Architecture Guide

## 1. Project Overview

**Strata AI** is an AI-powered agentic workspace studio. It lets users create, edit, analyze, and organize documents, code snippets, and markdown notes through a conversational chat interface backed by Google Gemini models. The agent has 6 general-purpose workspace file management tools and persists state client-side via IndexedDB.

- **GitHub:** https://github.com/1ewig/resume-flow
- **Stack:** Next.js 16 App Router + Vercel AI SDK 7 + Dexie.js

## 2. Tech Stack

| Layer | Choice | Purpose |
|-------|--------|---------|
| Framework | Next.js 16.2.10 (App Router) | SSR, API routes, routing |
| Language | TypeScript 5.9.3 | Type safety |
| AI SDK | `ai@^7.0.0` | Unified LLM interface, streaming, tool calling |
| Google Provider | `@ai-sdk/google@^4.0.0` | Gemini model access |
| React AI | `@ai-sdk/react@^2.0.0` | `useChat` hook + UI stream primitives |
| Client DB | Dexie.js 4 + dexie-react-hooks | IndexedDB persistence (conversations + messages + files) |
| Styling | Tailwind CSS 4.1 | Utility-first CSS |
| Animation | `motion` | Drawer transitions |
| Markdown | `react-markdown` + `remark-gfm` | Chat rendering, markdown display |
| Schemas | `zod@^4.4.3` | Input validation, tool schemas |
| Icons | `lucide-react` | UI iconography |
| Scroll | `use-stick-to-bottom` | ChatGPT-like auto-scroll (DOM observers, no effect races) |
| Runtime | Node.js 22+ | Required by AI SDK 7 (ESM + native fetch) |
| Package manager | bun | Dependency management |

## 3. Directory Structure

```
.
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout, <html>/<body>, metadata
│   ├── page.tsx                  # Home — redirects to latest or new chat
│   ├── not-found.tsx             # Custom 404 page
│   ├── globals.css               # Tailwind import, scrollbar, animations
│   ├── api/
│   │   └── agent/
│   │       └── route.ts          # POST /api/agent — AI agent streaming endpoint
│   └── chat-id/
│       └── [id]/
│           └── page.tsx          # Chat page (thin shell, delegates to hook)
├── components/
│   ├── Sidebar.tsx               # Conversation list, new/delete
│   ├── chat/
│   │   ├── ChatPanel.tsx         # Message list, empty state, loading indicators
│   │   ├── ChatBubble.tsx        # User/assistant message bubble
│   │   ├── ChatInput.tsx         # Auto-resize textarea with Enter-to-send
│   │   ├── ChatHeader.tsx        # Model selector + thinking level + workspace drawer
│   │   ├── ToolCallCard.tsx      # Minimal accordion card — receives ToolCardProps
│   │   ├── ThoughtAccordion.tsx  # Collapsible reasoning/thought display
│   │   └── tools/
│   │       └── resolver.tsx      # extractToolInfo + resolveToolDisplay → ToolCardProps, per-tool summary builders
│   ├── ui/                       # (empty — available for base UI primitives)
│   └── workspace/
│       └── WorkspaceDrawer.tsx   # Slide-over panel: file list, create, edit, delete
├── hooks/
│   ├── useChatSession.ts         # Central orchestration hook (core logic)
│   ├── useWorkspaceFiles.ts      # Workspace file CRUD + Dexie persistence
│   ├── useModelSettings.ts       # Model + thinking level state + localStorage
│   └── use-mobile.ts             # Responsive breakpoint detection (768px)
├── lib/
│   ├── schemas.ts                # Zod types: WorkspaceFile, Resume (legacy), ChatMessage, ToolCall
│   ├── models.ts                 # Model registry, thinking levels, localStorage
│   ├── id.ts                     # ID generation (crypto.randomUUID)
│   ├── edit-engine.ts            # ResumeEditEngine — 3-tier matching (exact / whitespace / anchor)
│   ├── db/
│   │   └── db.ts                 # Dexie schema v4, CRUD helpers
│   └── ai/
│       ├── index.ts              # Re-exports prompts + tools
│       ├── prompts.ts            # buildSystemInstruction() — system prompt
│       ├── tools.ts              # 6 workspace tool factories + createWorkspaceTools()
│       └── message-extractor.ts  # extractFilesFromMessage / extractDeletedFilesFromMessage
├── .env.example                  # Required env vars
├── next.config.ts                # Standalone output, motion transpilation
├── package.json                  # Dependencies + scripts
├── postcss.config.mjs
├── eslint.config.mjs
└── tsconfig.json
```

## 4. Core Data Flow

```
User types in ChatInput
  │
  ▼
ChatIdPage.handleSubmit(e)
  │
  ▼
useChatSession.handleSendMessage(text)
  ├── Auto-generate title from first message (if "New Chat")
  │
  ▼
chat.sendMessage({ text })    ← @ai-sdk/react useChat
  │
  ▼
DefaultChatTransport           ← wraps fetch to /api/agent
  │  Body: { messages, model, thinkingLevel, files }
  │
  ▼
POST /api/agent (route.ts)
  ├── Parse request body with Zod
  ├── let mutableFiles = parsed.data.files || []
  ├── streamText({
  │     model: google(modelId),
  │     system: buildSystemInstruction(mutableFiles),
  │     messages: convertToModelMessages(messages),
  │     tools: createWorkspaceTools({
  │       getCurrentFiles: () => mutableFiles,        ← closure for all tools
  │       onUpdateFile: (file) => { upserts into mutableFiles },
  │       onDeleteFile: (idOrName) => { removes from mutableFiles },
  │     }),
  │     abortSignal: req.signal,
  │     experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
  │     prepareStep: re-injects system prompt with current file state
  │     reasoning: thinkingLevel,
  │     stopWhen: isStepCount(10),
  │     onStepEnd: logs tool calls
  │     onStart, onEnd, onError
  │   })
  │
  ▼
createUIMessageStreamResponse(toUIMessageStream(result.stream))
  │  Returns SSE stream
  │
  ▼
useChat receives UI message stream
  │  chat.messages + chat.status update reactively
  │  status exposed as "streaming" | "submitted" | "ready" for scroll logic
  │
  ▼
onFinish(message, allMessages)
  ├── Persist all messages to Dexie as native UIMessage objects
  ├── Extract file updates from tool result parts via extractFilesFromMessage
  ├── Extract file deletions via extractDeletedFilesFromMessage
  ├── Merge updates/deletions into current conversation files array
  └── Persist merged files array to conversation.files in Dexie
```

### Key: Three persistence touchpoints

| Layer | Data | Purpose |
|-------|------|---------|
| **Dexie (IndexedDB)** | Conversations + Messages + Files | Client-side persistence across page reloads |
| **Request body** | `files` array (snapshot) | Sent to API route so tools have current workspace context |
| **API route mutableFiles[]** | Active workspace files | In-memory state mutated by tools during a single request; synced back to client via tool results in message parts |

The API route is **stateless** — every request receives the full message history + current workspace files. Tools mutate a local `mutableFiles` array via closure callbacks. After the stream ends, `onFinish` on the client extracts the final file state from tool result parts and persists it to Dexie, making it durable across page refreshes.

## 5. AI SDK Integration Patterns

### 5a. Streaming Agent Endpoint (`app/api/agent/route.ts`)

```typescript
const mutableFiles: WorkspaceFile[] = parsed.data.files || [];

const result = streamText({
  model: google(model || "gemini-3.5-flash-lite"),
  system: buildSystemInstruction(mutableFiles),
  messages: await convertToModelMessages(messages),
  tools: createWorkspaceTools({
    getCurrentFiles: () => mutableFiles,
    onUpdateFile: (file: WorkspaceFile) => {
      const idx = mutableFiles.findIndex(
        (f) => f.id === file.id || f.name.toLowerCase() === file.name.toLowerCase(),
      );
      if (idx >= 0) mutableFiles[idx] = file;
      else mutableFiles.push(file);
    },
    onDeleteFile: (fileIdOrName: string) => {
      // removes from mutableFiles by id or name
    },
  }),
  abortSignal: req.signal,
  experimental_transform: smoothStream({
    delayInMs: 15,
    chunking: "word",
  }),
  prepareStep: async ({ stepNumber }) => {
    // Re-inject system prompt with current file state each step
    return { system: buildSystemInstruction(mutableFiles) };
  },
  reasoning: thinkingLevel ? (thinkingLevel as any) : "provider-default",
  stopWhen: isStepCount(10),
  onStart() { /* log */ },
  onStepEnd({ stepNumber, toolCalls }) { /* log */ },
  onEnd({ finishReason, usage }) { /* log */ },
  onError({ error }) { /* log */ },
});

return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream }),
});
```

### 5b. Tool Definitions (`lib/ai/tools.ts`)

Six tools are registered via `createWorkspaceTools()`:

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `listFiles` | — | `{ count, files: [{ id, name, language, charCount }] }` | List all workspace files with metadata |
| `readFile` | `nameOrId`, `section?` | `{ exists, name, content?, section?, error? }` | Read full file or a specific heading section |
| `writeFile` | `name`, `content`, `language?` | `{ action: "created"|"replaced", file }` | Create or fully replace a file |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | `{ success, strategyUsed?, file?, error? }` | Surgical search-and-replace via `ResumeEditEngine` |
| `renameFile` | `nameOrId`, `newName` | `{ success, oldName, newName, file, error? }` | Rename a file (checks for name collision) |
| `deleteFile` | `nameOrId` | `{ deleted, fileId?, name?, error? }` | Delete a file from the workspace |

All six tools use the **closure pattern** via a shared `WorkspaceToolsContext`:

```typescript
export interface WorkspaceToolsContext {
  getCurrentFiles: () => WorkspaceFile[];
  onUpdateFile: (file: WorkspaceFile) => void;
  onDeleteFile: (fileIdOrName: string) => void;
}
```

No tools use `contextSchema` — every tool receives workspace state through closures captured at creation time in `createWorkspaceTools()`.

```typescript
// Example: createReadFileTool — closure pattern
export function createReadFileTool({ getCurrentFiles }: WorkspaceToolsContext) {
  return tool({
    description: "Read full content or a specific section of a workspace file...",
    inputSchema: z.object({
      nameOrId: z.string().describe("Filename or file ID to read."),
      section: z.string().optional(),
    }),
    outputSchema: z.object({
      exists: z.boolean(), name: z.string().optional(),
      content: z.string().optional(), error: z.string().optional(),
    }),
    execute: async ({ nameOrId, section }) => {
      const files = getCurrentFiles();
      // find file, return content
    },
  });
}

// Example: createEditFileTool — uses ResumeEditEngine
export function createEditFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
  return tool({
    description: "Surgically edit a specific block... Call readFile first to get the exact text.",
    inputSchema: z.object({ ... }),
    outputSchema: z.object({ success: z.boolean(), strategyUsed: z.string().optional(), ... }),
    execute: async ({ nameOrId, searchString, replaceString }) => {
      const targetFile = getCurrentFiles().find(...);
      const result = ResumeEditEngine.applyEdit(targetFile.content, searchString, replaceString);
      if (!result.success) return { success: false, error: result.error };
      onUpdateFile({ ...targetFile, content: result.newContent });
      return { success: true, strategyUsed: result.strategyUsed, file: updatedFile };
    },
  });
}
```

### 5c. Client-Side Chat Hook (`hooks/useChatSession.ts`)

```typescript
const transport = new DefaultChatTransport({
  api: '/api/agent',
  body: () => ({
    model: modelRef.current,
    thinkingLevel: thinkingLevelRef.current,
    files: filesRef.current,
  }),
});

const chat = useChat({
  id: chatId,
  transport: transport as any,
  // chat.status exposed as "streaming" | "submitted" | "ready" throughout the hook
  onFinish: async ({ message, messages: allMessages }) => {
    // Persist all messages to Dexie
    for (const msg of allMessages as any[]) {
      await db.messages.put({ ...msg, chatId, timestamp: ... });
    }

    // Process workspace file updates from the current assistant message
    const deletions = extractDeletedFilesFromMessage(message);
    const updatedFiles = extractFilesFromMessage(message);

    if (deletions.length > 0 || (updatedFiles?.length > 0)) {
      let currentFiles = getWorkspaceFiles(conv);

      // Apply deletions
      if (deletions.length > 0) {
        currentFiles = currentFiles.filter(f => /* not in deletions */);
      }

      // Apply creations or edits (merge by id or name)
      if (updatedFiles?.length > 0) {
        for (const newFile of updatedFiles) {
          const idx = currentFiles.findIndex(
            f => f.id === newFile.id || f.name.toLowerCase() === newFile.name.toLowerCase()
          );
          if (idx >= 0) currentFiles[idx] = newFile;
          else currentFiles.push(newFile);
        }
      }

      await updateConversationFiles(chatId, currentFiles);
    }
  },
});
```

### 5d. File Extraction from UI Message Parts

Two functions in `lib/ai/message-extractor.ts` scan tool result parts for workspace file state:

```typescript
// Extracts created/updated files (looks for `file`, `files`, or `resume` keys)
export function extractFilesFromMessage(msg): WorkspaceFile[] {
  for (const part of msg.parts) {
    const res = getToolOutput(part);
    if (res?.file && typeof res.file.content === 'string') files.push(res.file);
    if (Array.isArray(res?.files)) files.push(...res.files);
    if (res?.resume?.markdownContent) files.push(resumeToFile(res.resume));
  }
  return files;
}

// Extracts deleted file references (looks for `deleted: true` with `fileId` or `name`)
export function extractDeletedFilesFromMessage(msg): { fileId?: string; name?: string }[] {
  for (const part of msg.parts) {
    const res = getToolOutput(part);
    if (res?.deleted === true && (res.fileId || res.name)) {
      deletions.push({ fileId: res.fileId, name: res.name });
    }
  }
  return deletions;
}
```

This is tool-name-agnostic — any tool that returns `{ file: { ... } }`, `{ files: [...] }`, or `{ deleted: true, fileId }` in its result is automatically picked up. Adding a new file-mutating tool never requires changes to message extraction.

## 6. Database Schema (Dexie v4)

### Conversations Table

```
id:            string (PK)     — UUID, matches URL param /chat-id/:id
title:         string          — Auto-generated from first message or "New Chat"
model:         string          — Gemini model ID (e.g. "gemini-3.5-flash-lite")
thinkingLevel: string (opt)    — "minimal" | "low" | "medium" | "high"
files:         WorkspaceFile[] — Array of workspace file objects (current)
activeFileId:  string (opt)    — ID of the currently selected file
resume:        Resume (JSON)   — Legacy: single-resume object (migration fallback)
createdAt:     string (ISO)    — Creation timestamp
updatedAt:     string (ISO)    — Last activity timestamp
```

### Messages Table

Messages use the native AI SDK `UIMessage` type extended with `chatId` and `timestamp`:

```
id:          string (PK)     — Message ID from AI SDK
chatId:      string          — FK to conversations.id (indexed)
role:        "user" | "assistant"
content:     string (opt)    — Text content
parts:       MessagePart[]   — Array of text, tool-invocation, reasoning parts
timestamp:   string (ISO)    — Persistence timestamp
```

**Schema version history:**
- v1: initial custom ChatMessage schema
- v2: added thinkingLevel field
- v3: updated field types
- v4: switched from custom ChatMessage to native UIMessage format; added `files` and `activeFileId` to conversations (current)

## 7. Component Tree & Responsibilities

```
RootLayout (globals.css, metadata)
│
├── Home (app/page.tsx)
│     └── Redirects to /chat-id/:id (latest conversation or new UUID)
│
└── ChatIdPage (app/chat-id/[id]/page.tsx)
      │  107 lines — thin shell, delegates to useChatSession
      │
      ├── Sidebar (components/Sidebar.tsx)
      │     ├── Brand header with logo
      │     ├── "New Conversation" button → generates UUID, navigates
      │     └── Conversation list (Dexie live query, sorted by updatedAt desc)
      │           └── Per-item: Link + delete button
      │
      ├── ChatHeader (components/chat/ChatHeader.tsx)
      │     ├── Active file name display
      │     ├── Model dropdown (Gemini / Gemma 4 groups)
      │     ├── Thinking level dropdown (minimal/low/medium/high)
      │     └── "Workspace Files" dropdown → Open Drawer
      │
      ├── ChatPanel (components/chat/ChatPanel.tsx)
      │     ├── Empty state (branded prompt when no messages)
      │     ├── ChatBubble[] — message list
      │     ├── Loading indicator (typing dots animation)
      │     └── Wrapped in <StickToBottom> for auto-scroll (page.tsx)
      │
      ├── ChatInput (components/chat/ChatInput.tsx)
      │     ├── Auto-resizing textarea (max 160px)
      │     ├── Enter to send, Shift+Enter for newline
      │     └── Submit button (ArrowUp icon)
      │
      └── WorkspaceDrawer (components/workspace/WorkspaceDrawer.tsx)
            ├── Slide-over panel (motion spring animation)
            ├── File list with active file highlighting
            ├── Create new file (inline name input)
            ├── Edit active file (raw content textarea)
            ├── Delete file button
            └── Empty state when no files exist
```

### ChatBubble Internals

```
ChatBubble
  ├── User message: plain text with User avatar
  └── Assistant message:
        ├── Empty streaming state (bouncing dots before first tokens)
        ├── ThoughtAccordion [collapsible reasoning display] — when reasoning present
        ├── Markdown content rendered with react-markdown + GFM
        │     └── Custom components for h1-h3, code blocks (with copy), tables, blockquotes
        ├── Streaming cursor (thin emerald caret with shimmer overlay + glow shadow + fade-in)
        └── ToolCallCard[] (accordion-style cards for tool invocation results)
              ├── listFiles → "Workspace Files Listed" (blue, file count + names)
              ├── readFile → "File Read" (blue, section name + content preview + Open Drawer)
              ├── writeFile → "File Written" (emerald, file summary + char count + Open Drawer)
              ├── editFile → "File Edited" (amber, explanation + strategy + Open Drawer)
              ├── renameFile → "File Renamed" (violet, old name → new name)
              └── deleteFile → "File Deleted" (red, file name + cleared message)
```

### ToolCallCard (Minimal Accordion)

**`ToolCallCard.tsx`** is a minimal accordion card matching the `ThoughtAccordion` pattern. It receives `ToolCardProps` and renders only the chrome — no knowledge of tool names, icons, or result shapes.

```
ToolCallCard (ToolCardProps)
  ├── Header button (always visible): inline icon + label + status text + chevron
  │     └── Click toggles accordion open/closed
  ├── Expanded content:
  │     ├── summary: ReactNode     ← injected by resolver, tool-specific
  │     └── Collapsible raw args/result (same for all tools)
```

### resolver.tsx — Display Logic

`components/chat/tools/resolver.tsx` owns extraction, config, and summary building. `ChatBubble` calls `resolveToolDisplay(tc, onOpenDrawer)` once per tool invocation and spreads the result onto `<ToolCallCard>`.

```
resolveToolDisplay(toolCall, onOpenDrawer?) → ToolCardProps
  ├── extractToolInfo() → { name, args, result, state }
  ├── toolConfigs[name] → { icon, accent, label, badge }
  ├── listFiles:
  │     Label "Workspace Files Listed" / badge "Listed"
  │     Summary: Folder icon, file count + file name list
  ├── readFile:
  │     Label "File Read" / badge "Read"
  │     Summary: Search icon, section name + content preview + Open Drawer
  ├── writeFile:
  │     action === "created" → label "File Created" / badge "Created"
  │     action === "replaced" → label "File Replaced" / badge "Replaced"
  │     Summary: FileText icon, char count + Open Drawer
  ├── editFile:
  │     Label "File Edited" / badge "Applied"
  │     Summary: PencilLine icon, explanation, strategyUsed + Open Drawer
  ├── renameFile:
  │     Label "File Renamed" / badge "Renamed"
  │     Summary: PenLine icon, old name → new name
  ├── deleteFile:
  │     Label "File Deleted" / badge "Deleted"
  │     Summary: Trash2 icon, file name + cleared message
  └── generic (custom/unknown tools):
        Summary: Wrench icon, raw name, truncated JSON input
```

The resolver pattern means adding a new tool never touches `ToolCallCard.tsx` — just add a config entry + summary builder in `resolver.tsx`.

## 8. Model Registry (`lib/models.ts`)

### Available Models

| ID | Label | Provider | Thinking Levels |
|----|-------|----------|-----------------|
| `gemini-3.5-flash` | Gemini 3.5 Flash | Gemini | minimal, low, medium, high |
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | Gemini | minimal, low, medium, high |
| `gemini-3.6-flash` | Gemini 3.6 Flash | Gemini | minimal, low, medium, high |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | Gemini | minimal, high |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview | Gemini | minimal, low, medium, high |
| `gemma-4-31b-it` | Gemma 4 31B IT | Gemma 4 | — |
| `gemma-4-26b-a4b-it` | Gemma 4 26B A4B IT | Gemma 4 | — |

### Storage

Model preference and thinking level are persisted to `localStorage`:
- `selectedModel` — last chosen model ID
- `selectedThinkingLevel` — last chosen thinking level

On chat load, the conversation's stored `model` and `thinkingLevel` take priority over localStorage.

## 9. System Prompt Design (`lib/ai/prompts.ts`)

The `buildSystemInstruction(files)` function builds a structured 5-section system prompt:

1. **Goal** — concise role definition: "elite agentic workspace assistant", preference for putting content into files over chat
2. **Current Workspace** — metadata-only file listing (`name`, `language`, `charCount`, `id`) via `<workspace_files>`. No full content is injected — the model calls `readFile` to get content on demand. Empty workspace shows "No files yet. Offer to create a starting file when appropriate."
3. **Tool Rules (strict)** — 6 numbered rules covering:
   - Always `readFile` before editing
   - Prefer `editFile` over `writeFile` for existing files
   - Verbatim copy rule for `searchString` (from `readFile` output, not system prompt)
   - Anchor rule (include 1-2 surrounding lines)
   - Post-mutation response discipline: 1-3 sentence summary only, no content dump
   - Error recovery: retry once with corrected call, then ask user. Never invent success.
4. **Response Style** — conciseness, GFM markdown, fenced code blocks, tool-first for workspace state
5. **Edge Cases** — empty workspace (offer to create), ambiguous request (ask one clarifying question), off-topic (answer then redirect)

## 10. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | — | Gemini API key for `@ai-sdk/google` |
| `NEXT_PUBLIC_GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Default model ID |
| `APP_URL` | Yes | — | Cloud Run URL (injected by AI Studio) |

## 11. Scripts & Commands

| Command | Action |
|---------|--------|
| `bun run dev` | Start Next.js dev server |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run clean` | `next clean` |

## 12. Key Architectural Decisions

### Why Dexie (IndexedDB) instead of server-side DB?
The app is designed for Google AI Studio's ephemeral Cloud Run deployments with no persistent server-side storage. All conversation data lives in the browser's IndexedDB, making the app fully client-side persistent.

### Why native UIMessage format in Dexie?
After commit `2f200e6`, messages are stored in the native AI SDK `UIMessage` format (with `parts[]`) instead of a custom `ChatMessage` schema. This eliminates format conversion code and ensures compatibility with `useChat`'s message format. The `parts[]` array is the single source of truth for text, tool invocations, and reasoning content.

### Why closure pattern instead of contextSchema?
All six workspace tools use the **closure pattern** via `WorkspaceToolsContext` (`getCurrentFiles`, `onUpdateFile`, `onDeleteFile`). The API route creates a local `mutableFiles[]` array and passes closures that mutate it. This keeps the API route stateless at the HTTP layer while allowing multi-step tool calls within a single request to build on each other. The old `contextSchema` approach (used by the legacy resume tools) was dropped because it required separate context wiring per tool and couldn't handle multi-step mutations as cleanly.

### Why metadata-only workspace listing in the system prompt?
Full file content was previously injected into `<workspace_files>` tags for verbatim `searchString` anchoring. This bloated the context on every `prepareStep` — files with 10-50KB content were re-injected across potentially 10 steps. Current approach lists only `name`, `language`, `charCount`, and `id` in the system prompt. The model calls `readFile` to get the exact text needed for `editFile`'s `searchString`. This trades one extra tool call per edit for significantly smaller context per step.

### Why smoothStream?
`smoothStream` (`delayInMs: 15`, `chunking: "word"`) emits tokens at a controlled rate instead of dumping them as fast as the model produces them. This dramatically improves the perceived latency — the UI renders tokens smoothly rather than appearing stuck then suddenly receiving a wall of text. Essential for long responses where the generation time exceeds 5-10 seconds.

### Why streamText over generateText?
`streamText` enables real-time streaming of both text tokens and tool call invocations back to the client via `createUIMessageStreamResponse`. This gives the user immediate feedback while the agent iterates through multi-step tool calling loops.

### Why DefaultChatTransport?
`DefaultChatTransport` wraps the `useChat` ↔ API route communication, automatically handling message serialization, streaming via SSE, and reconnection. It's the standard AI SDK pattern for connecting `useChat` to a custom API endpoint.

### Why `use-stick-to-bottom` instead of manual `useEffect` scroll?
The initial scroll implementation used three `useEffect` hooks with `scrollIntoView` triggered by `displayMessages`, `status`, and `isAtBottom` state. This suffered from race conditions — React batches state updates from scroll events and streaming chunks unpredictably, so the user could never reliably "escape" the auto-scroll by scrolling up during streaming. `use-stick-to-bottom` replaces this with `ResizeObserver` and `MutationObserver` that intercept DOM mutations synchronously, making scroll decisions before React reconciles. The library also handles edge cases (scroll-to-bottom button visibility, instant/smooth/spring animations, preserve-scroll-position) that would require significant additional code to implement manually.

## 13. Architectural Evolution (from git log)

```
Raw Google GenAI SDK  ──→  AI SDK 7 Migration  ──→  Native UIMessage  ──→  General-Purpose Workspace
  (@google/genai)            (f3ff218)                (2f200e6)              (HEAD)
  - custom agent loop        - streamText + tool()    - DBMessage extends     - 6 workspace file tools
  - custom fetch/stream      - useChat + transport      UIMessage             - closure pattern for all tools
  - FunctionDeclaration      - createResumeTools()    - no more conversion    - metadata-only system prompt
  - GEMINI_API_KEY           - GOOGLE_GENERATIVE_..   - onFinish persistence  - constrained rules + edge cases
                                                       - title auto-gen        - smoothStream
                                                       - refresh fix           - multi-file WorkspaceDrawer
                                                                               - minimal accordion tool cards
```

## 14. Notes for Future Agents

- **Adding a new model:** add entry to `MODELS` array in `lib/models.ts`, set `MODEL_DESCRIPTIONS` and optionally `MODEL_THINKING_LEVELS`
- **Adding a new tool:** define with `tool()` from `ai`, add `inputSchema` and `outputSchema`, then register in `createWorkspaceTools()` in `lib/ai/tools.ts` and update `lib/ai/prompts.ts` (add to the `## Tool Rules` section, not a verbose re-description). If the tool returns a `{ file }` or `{ files }` object, `extractFilesFromMessage` in `lib/ai/message-extractor.ts` will auto-discover it — no filter update needed. Finally add a config entry + summary builder in `components/chat/tools/resolver.tsx` — `ToolCallCard.tsx` needs zero changes.
- **All tools use the closure pattern:** add the needed callback to `WorkspaceToolsContext` interface, pass it through `createWorkspaceTools()` in the route handler, and implement the callback in `useWorkspaceFiles.ts` if the operation needs Dexie persistence.
- **Output schemas:** always add `outputSchema` to new tools — they enable type-safe results and better UI-part inference in AI SDK 7's `useChat`.
- **Adding a new provider:** add `@ai-sdk/<provider>` to `package.json`, set as `model` parameter in `streamText` (e.g., `anthropic("claude-4")`), add models to registry
- **Schema migrations:** increment the version number in `db.ts` constructor and define new `stores()` — Dexie handles the upgrade
- **`contexts/` and `components/ui/` are empty** — available for shared state providers and base UI primitives
- **Auto-scroll is handled by `<StickToBottom>` in `page.tsx`** — not by manual `useEffect` in `ChatPanel`. The library wraps the message list and scroll-to-bottom button. If you need to customize scroll behavior, expose `StickToBottomContext` via a render function (`{(context) => ...}`) or `useStickToBottomContext()` in a child component.
- **Streaming UX lives in `ChatBubble.tsx` and `globals.css`** — the `animate-caret` and `animate-shimmer` keyframes are defined in the `@theme` block. The caret sits inside the prose div after `</ReactMarkdown>` to stay inline with the last text line. The shimmer overlay uses a `pointer-events-none` absolute div that sweeps across the last streaming segment.
