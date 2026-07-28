# Strata AI — Engineering Documentation

## 1. Project Overview

**Strata AI** (TaskFlow) is an AI-powered agentic workspace studio. Users create, edit, analyze, and organize documents, code snippets, and markdown notes through a conversational chat interface backed by Google Gemini models via the Vercel AI SDK v7. All state persists client-side using IndexedDB through Dexie.js.

The agent has six workspace file management tools (`listFiles`, `readFile`, `writeFile`, `editFile`, `renameFile`, `deleteFile`) with a constrained system prompt enforcing tool usage discipline, error recovery, and concise response formatting.

- **Repo:** https://github.com/1ewig/strata-ai
- **Stack:** Next.js 16 App Router + Vercel AI SDK 7 + Dexie.js + Tailwind CSS 4
- **Runtime:** bun
- **Deployment:** Google AI Studio Cloud Run (ephemeral, no persistent server-side storage)

---

## 2. Technology Stack

| Layer | Choice | Purpose |
|-------|--------|---------|
| Framework | Next.js 16.2.10 (App Router) | SSR, API routes, file-system routing |
| Language | TypeScript 5.9.3 | Type safety across the full stack |
| AI SDK Core | `ai@^7.0.0` | `streamText`, `tool()`, message types |
| Google Provider | `@ai-sdk/google@^4.0.0` | Gemini model access |
| React AI | `@ai-sdk/react@^2.0.0` | `useChat` hook, `DefaultChatTransport` |
| Client DB | `dexie@^4.4.4` + `dexie-react-hooks` | IndexedDB persistence |
| Styling | Tailwind CSS 4.1 | Utility-first CSS with custom theme tokens |
| Animation | `motion@^12.23.24` | Spring-based drawer transitions |
| Markdown | `react-markdown@^10` + `remark-gfm@^4` | Chat bubble and file rendering |
| Validation | `zod@^4.4.3` | API request parsing, tool schemas |
| Icons | `lucide-react@^0.553` | UI iconography |
| Scroll | `use-stick-to-bottom@^1.1.6` | DOM observer-based auto-scroll |

---

## 3. Directory Structure

```
├── app/
│   ├── layout.tsx              # Root layout — <html>, <body>, dark class, metadata
│   ├── page.tsx                 # Home — redirects to latest/new chat via UUID
│   ├── not-found.tsx            # Custom 404
│   ├── globals.css              # Tailwind 4 import, theme tokens, keyframe animations
│   ├── api/agent/route.ts       # POST /api/agent — AI streaming endpoint
│   └── chat-id/[id]/page.tsx    # Chat page — thin shell (~124 lines), delegates to hook
│
├── components/
│   ├── Sidebar.tsx              # Conversation list, new/delete, brand header
│   ├── chat/
│   │   ├── ChatPanel.tsx        # Message list, empty state, typing dots
│   │   ├── ChatBubble.tsx       # User/assistant message with segment splitting
│   │   ├── ChatInput.tsx        # Auto-resizing textarea, Enter-to-send
│   │   ├── ChatHeader.tsx       # Model selector, thinking level, files dropdown
│   │   ├── ToolCallCard.tsx     # Minimal accordion card (pure shell)
│   │   ├── ThoughtAccordion.tsx # Collapsible reasoning display
│   │   ├── SuggestionChips.tsx  # Suggested prompt chips
│   │   └── tools/resolver.tsx   # Tool display resolver (425 lines — extraction + config + summaries)
│   └── workspace/
│       └── WorkspaceDrawer.tsx  # Slide-over panel: file list, create, edit, delete
│
├── hooks/
│   ├── useChatSession.ts        # Central orchestrator — useChat + Dexie + files + models
│   ├── useWorkspaceFiles.ts     # File CRUD + Dexie persistence
│   ├── useModelSettings.ts      # Model/thinking state + localStorage
│   └── use-mobile.ts            # Responsive breakpoint detection (768px)
│
├── lib/
│   ├── schemas.ts               # Zod types: WorkspaceFile, Resume (legacy), ChatMessage, ToolCall
│   ├── models.ts                # Model registry, thinking levels, localStorage helpers
│   ├── id.ts                    # crypto.randomUUID with fallback
│   ├── edit-engine.ts           # 3-tier string matching (exact / whitespace / anchor)
│   ├── db/db.ts                 # Dexie schema v4, CRUD helpers, migration fallback
│   └── ai/
│       ├── index.ts             # Re-exports prompts + tools
│       ├── prompts.ts           # buildSystemInstruction() — dynamic system prompt
│       ├── tools.ts             # 6 workspace tool factories + aggregator
│       └── message-extractor.ts # extractFilesFromMessage / extractDeletedFilesFromMessage
│
├── docs/ARCHITECTURE.md         # Existing architecture guide
├── .env.example                 # Required env vars
├── next.config.ts               # Standalone output, motion transpilation
├── postcss.config.mjs           # @tailwindcss/postcss + autoprefixer
├── eslint.config.mjs            # ESLint 9 flat config
└── tsconfig.json                # ES2017 target, bundler resolution, @/* alias
```

Total application source: ~3,300 lines across 29 files.

---

## 4. Core Data Flow

### 4.1 End-to-End Request Lifecycle

```
User types in ChatInput → handleSubmit → useChatSession.handleSendMessage(text)
  └── Auto-generates title if "New Chat" (truncates first msg to 40 chars)
  └── chat.sendMessage({ text }) via @ai-sdk/react useChat
       └── DefaultChatTransport wraps fetch POST /api/agent
            Body: { messages, model, thinkingLevel, files }

POST /api/agent (route.ts):
  1. Parse body with Zod bodySchema — returns 400 on failure
  2. Init mutableFiles[] from files array (legacy migration from resumes)
  3. Call streamText() with:
     - model: google(modelId)
     - system: buildSystemInstruction(mutableFiles)
     - messages: convertToModelMessages(messages)
     - tools: createWorkspaceTools({ getCurrentFiles, onUpdateFile, onDeleteFile })
     - smoothStream({ delayInMs: 15, chunking: "word" })
     - prepareStep: re-injects system prompt with current mutableFiles state
     - reasoning: thinkingLevel
     - stopWhen: isStepCount(25)
  4. Return SSE stream via createUIMessageStreamResponse()

onFinish(message, allMessages):
  1. Persist all messages to Dexie as DBMessage (extends UIMessage)
  2. Extract file updates from tool results via extractFilesFromMessage()
  3. Extract deletions via extractDeletedFilesFromMessage()
  4. Merge into conversation.files and persist to Dexie
```

### 4.2 Three Persistence Touchpoints

| Layer | Data | Purpose |
|-------|------|---------|
| **Dexie (IndexedDB)** | Conversations + Messages + Files | Survives page reloads |
| **Request body** | `files` snapshot | Gives API route current workspace context |
| **API mutableFiles[]** | In-memory per-request | Mutated by tools across steps; synced via tool result parts |

The API route is **stateless** across requests. Every POST receives full message history + current files. Tools mutate `mutableFiles` via closure callbacks. `onFinish` extracts final file state from tool results and persists to Dexie.

---

## 5. AI SDK Integration Patterns

### 5.1 Streaming Agent Endpoint (`app/api/agent/route.ts`)

Uses `streamText` with the Google provider. Key patterns:

```typescript
const bodySchema = z.object({
  messages: z.array(z.any()),
  files: z.array(z.any()).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response({ ... }, { status: 400 });

  const mutableFiles: WorkspaceFile[] = parsed.data.files || [];

  const result = streamText({
    model: google(model || "gemini-3.5-flash-lite"),
    system: buildSystemInstruction(mutableFiles),
    messages: await convertToModelMessages(messages),
    tools: createWorkspaceTools({
      getCurrentFiles: () => mutableFiles,
      onUpdateFile: (file) => { /* upserts into mutableFiles */ },
      onDeleteFile: (idOrName) => { /* removes from mutableFiles */ },
    }),
    experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
    prepareStep: () => ({ system: buildSystemInstruction(mutableFiles) }),
    reasoning: thinkingLevel || "provider-default",
    stopWhen: isStepCount(25),
    providerOptions: { google: { thinkingConfig: { includeThoughts: true } } },
    onStart: () => console.log("[agent] Stream started"),
    onStepEnd: ({ stepNumber, toolCalls }) => console.log(`Step ${stepNumber} done`),
    onEnd: ({ finishReason, usage }) => console.log(`Finished: ${finishReason}`),
    onError: ({ error }) => console.error(error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

**smoothStream** (`delayInMs: 15`, `chunking: "word"`) controls token emission rate to improve perceived latency — tokens appear smoothly rather than in bursts.

### 5.2 Tool Definitions (`lib/ai/tools.ts`)

All six tools share a closure context interface:

```typescript
export interface WorkspaceToolsContext {
  getCurrentFiles: () => WorkspaceFile[];
  onUpdateFile: (file: WorkspaceFile) => void;
  onDeleteFile: (fileIdOrName: string) => void;
}
```

The tool-creation pattern is consistent across all six. Here are the two most representative:

**listFiles** — Read-only, returns metadata:

```typescript
export function createListFilesTool({ getCurrentFiles }: WorkspaceToolsContext) {
  return tool({
    description: "List all existing files with metadata.",
    inputSchema: z.object({}),
    outputSchema: z.object({ count: z.number(), files: z.array(fileMetadataSchema) }),
    execute: async () => {
      const files = getCurrentFiles();
      return {
        count: files.length,
        files: files.map(f => ({
          id: f.id, name: f.name, language: f.language || "markdown",
          charCount: f.content?.length || 0,
        })),
      };
    },
  });
}
```

**editFile** — Uses the 3-tier `ResumeEditEngine` for surgical changes:

```typescript
export function createEditFileTool({ getCurrentFiles, onUpdateFile }: WorkspaceToolsContext) {
  return tool({
    description: "Surgically edit a specific block. Call readFile first for exact text.",
    inputSchema: z.object({
      nameOrId: z.string(),
      explanation: z.string(),
      searchString: z.string().describe("EXACT block to replace, copied from readFile result"),
      replaceString: z.string(),
    }),
    execute: async ({ nameOrId, searchString, replaceString, explanation }) => {
      const targetFile = getCurrentFiles().find(/* by id or name */);
      if (!targetFile) return { success: false, error: `File not found.` };
      const result = ResumeEditEngine.applyEdit(targetFile.content, searchString, replaceString);
      if (!result.success) return { success: false, error: result.error };
      onUpdateFile({ ...targetFile, content: result.newContent, updatedAt: new Date().toISOString() });
      return { success: true, explanation, strategyUsed: result.strategyUsed, file: updatedFile };
    },
  });
}
```

**Summary of all six tools:**

| Tool | Inputs | Output | Behavior |
|------|--------|--------|----------|
| `listFiles` | — | `{ count, files: [{id,name,language,charCount}] }` | Metadata-only listing |
| `readFile` | `nameOrId`, `section?` | `{ exists, name, content?, error? }` | Reads full file or heading section via regex |
| `writeFile` | `name`, `content`, `language?` | `{ action: "created"|"replaced", file }` | Creates new or full-replaces existing |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | `{ success, strategyUsed?, file?, error? }` | Surgical edit via 3-tier engine |
| `renameFile` | `nameOrId`, `newName` | `{ success, oldName, newName, file?, error? }` | Renames with collision detection |
| `deleteFile` | `nameOrId` | `{ deleted, fileId?, name?, error? }` | Removes from workspace array |

No tools use `contextSchema` — all receive workspace state through closures captured at creation time in `createWorkspaceTools()`.

### 5.3 Client-Side Chat Hook (`hooks/useChatSession.ts`)

Uses refs to avoid stale closures in the transport's `body()`:

```typescript
const filesRef = useRef(workspace.files);
const modelRef = useRef(modelSettings.model);
const thinkingLevelRef = useRef(modelSettings.thinkingLevel);

useEffect(() => { filesRef.current = workspace.files; }, [workspace.files]);
useEffect(() => { modelRef.current = modelSettings.model; }, [modelSettings.model]);
useEffect(() => { thinkingLevelRef.current = modelSettings.thinkingLevel; }, [modelSettings.thinkingLevel]);

const transport = useMemo(() => new DefaultChatTransport({
  api: '/api/agent',
  body: () => ({ model: modelRef.current, thinkingLevel: thinkingLevelRef.current, files: filesRef.current }),
}), []);

const chat = useChat({ id: chatId, transport: transport as any, onFinish: ... });
```

**Message hydration on chat switch:** A `loadedChatIdRef` guard ensures persisted Dexie messages are only injected once per chat-switch, preventing re-hydration loops:

```typescript
useEffect(() => {
  if (loadedChatIdRef.current !== chatId) loadedChatIdRef.current = null;
  if (dexieMessages !== undefined && loadedChatIdRef.current === null) {
    loadedChatIdRef.current = chatId;
    chat.setMessages(dexieMessages as any);
  }
}, [chatId, dexieMessages, chat]);
```

### 5.4 File Extraction from UI Parts (`lib/ai/message-extractor.ts`)

Tool-name-agnostic extraction — any tool returning `{ file }`, `{ files }`, or `{ deleted: true, fileId }` is auto-discovered:

```typescript
export function extractFilesFromMessage(msg): WorkspaceFile[] {
  for (const part of msg.parts) {
    const res = getToolOutput(part); // handles both modern typed parts and legacy
    if (res?.file?.content) { ... push file }
    if (Array.isArray(res?.files)) { ... push each }
    if (res?.resume?.markdownContent) { ... convert legacy resume }
  }
}

export function extractDeletedFilesFromMessage(msg): { fileId?, name? }[] {
  for (const part of msg.parts) {
    const res = getToolOutput(part);
    if (res?.deleted && (res.fileId || res.name)) { ... push deletion }
  }
}
```

---

## 6. Database Schema (Dexie v4)

### 6.1 Class Definition

```typescript
export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<DBMessage, string>;

  constructor() {
    super('ResumeFlowChatDB');
    this.version(4).stores({
      conversations: 'id, updatedAt, createdAt',
      messages: 'id, chatId, timestamp',
    });
  }
}
export const db = new ChatDatabase();
```

### 6.2 Conversations Table

```
id:            string (PK)     — UUID matches /chat-id/:id
title:         string          — Auto-generated or "New Chat"
model:         string          — Gemini model ID
thinkingLevel: string (opt)    — "minimal"|"low"|"medium"|"high"
files:         WorkspaceFile[] — Current workspace files
activeFileId:  string (opt)    — Currently selected file
resume:        Resume (JSON)   — Legacy single-resume (migration fallback)
createdAt:     string (ISO)
updatedAt:     string (ISO)
```

### 6.3 Messages Table

```
id:          string (PK)     — AI SDK message ID
chatId:      string          — FK to conversations.id (indexed)
role:        "user"|"assistant"
content:     string (opt)    — Text content
parts:       MessagePart[]   — Text, tool-invocation, reasoning parts
timestamp:   string (ISO)    — Persistence timestamp
```

Messages use the native `UIMessage` type extended with `chatId` and `timestamp`. This eliminates format conversion code between Dexie and `useChat`.

### 6.4 CRUD Helpers

| Function | Description |
|----------|-------------|
| `createConversation(id, title?, model?, thinkingLevel?)` | Creates and puts a new conversation |
| `getConversation(id)` | Returns conversation or undefined |
| `deleteConversation(id)` | Transaction: deletes conversation + all its messages |
| `updateConversationTitle(id, title)` | Updates title + updatedAt |
| `updateConversationModel(id, model, thinkingLevel?)` | Updates model config |
| `updateConversationFiles(id, files, activeFileId?)` | Replaces file array |
| `saveWorkspaceFile(chatId, file)` | Upserts file in conversation.files |
| `deleteWorkspaceFile(chatId, fileId)` | Removes file, updates activeFileId |
| `saveMessage(chatId, message)` | Puts DBMessage + updates conv.updatedAt |
| `getChatMessages(chatId)` | Returns UIMessage[] sorted by timestamp |
| `getWorkspaceFiles(conv?)` | Returns files from conv.files, with resume migration fallback |

### Schema Version History

- **v1:** Custom ChatMessage schema with separate fields
- **v2:** Added `thinkingLevel` to conversations
- **v3:** Updated field types
- **v4:** Switched to native UIMessage; added `files` and `activeFileId`; legacy `resume` retained as fallback

---

## 7. Component Architecture

### 7.1 Component Tree

```
RootLayout
  └── Home (app/page.tsx) — redirects to /chat-id/:id
  └── ChatIdPage (app/chat-id/[id]/page.tsx)
        ├── Sidebar — brand header + new chat button + conversation list (useLiveQuery)
        ├── [main flex column]
        │     ├── ChatHeader — model dropdown + thinking level select + files dropdown
        │     ├── <StickToBottom>
        │     │     └── ChatPanel
        │     │           ├── Empty state (branded hero)
        │     │           ├── ChatBubble[] (user/assistant messages)
        │     │           └── Typing dots loader
        │     └── ChatInput (absolute bottom with gradient bg)
        └── WorkspaceDrawer — animated slide-over (motion spring)
```

### 7.2 ChatBubble Segment Splitting

Messages are split into typed segments for modular rendering:

```
For assistant messages, iterate message.parts[] and classify:
  - reasoning/thought/thinking type → ThoughtAccordion (collapsible)
  - tool-invocation/dynamic-tool type → ToolCallCard (via resolver)
  - text type → accumulated, then rendered as markdown block

Streaming states:
  - No tokens yet: bouncing dots in glassmorphic bubble
  - Last streaming text segment: caret cursor, shimmer overlay, glow shadow
  - Streaming avatar: spinning BrainCircuit + ping ring
```

**Code blocks** in markdown have a dark header with "CODE SNIPPET" label and a copy-to-clipboard button that briefly shows "Copied" via `setTimeout`.

### 7.3 ToolCallCard & Resolver Pattern

**ToolCallCard** is a pure presentation component — zero knowledge of tool names, icons, or results. It receives fully resolved `ToolCardProps`:

```typescript
export interface ToolCardProps {
  label, badge, icon: LucideIcon,
  accent, accentBg, accentBorder, accentText: string,
  status: 'loading' | 'success' | 'error',
  summary: ReactNode,
  rawArgs, rawResult: unknown,
}
```

**resolver.tsx** owns all tool-display logic through four functions:

1. **`normalizeToolName(raw)`** — Normalizes by lowercasing/stripping separators, maps legacy aliases (`writeResume` → `writeFile`)
2. **`extractToolInfo(toolCall)`** — Extracts `{ name, rawName, args, result, state }` from any invocation format
3. **`toolConfigs` registry** — Maps canonical names to visual configs (icon, accent color, label, badge)
4. **Per-tool summary builders** — Each tool renders a rich ReactNode summary with action buttons (e.g., "Open Drawer" for write/read/edit)

The resolver adds `action` awareness for `writeFile` — badge changes from "Updated" to "Created" or "Replaced" based on result. Adding a new tool requires changes only in `resolver.tsx`; `ToolCallCard.tsx` never needs modification.

### 7.4 WorkspaceDrawer States

- **Empty (no files):** Dashed border, FileText icon, "Create New File" CTA
- **File with no content:** "Edit File" button
- **Markdown file:** Rendered via `react-markdown` + `remark-gfm` with custom component overrides (h1: 2xl+border, h2: small+uppercase+emerald, h3: xs, code blocks, tables, blockquotes)
- **Text file:** `whitespace-pre-wrap` monospace rendering
- **Edit mode:** Filename input + full-size textarea (min-height 450px)
- **Create mode:** Inline form with filename input + Create/Cancel

### 7.5 Sidebar

Pinned `w-64` column with brand header (gradient emerald icon + "Strata AI" + "WORKSPACE" badge), "New Conversation" emerald button (generates UUID, router.push), and `useLiveQuery`-driven conversation list sorted by `updatedAt` desc. Each item shows active state highlighting and a hover-reveal delete button with route-aware redirection.

---

## 8. Custom Hooks

### 8.1 `useChatSession` — Central Orchestrator

Wires together `useChat`, Dexie persistence, workspace files, and model settings.

**Input:** `chatId: string`

**Internal state:** `inputValue`, `dexieMessages` (useLiveQuery), `currentConv` (useLiveQuery), `modelSettings` (from `useModelSettings`), `workspace` (from `useWorkspaceFiles`), refs for stale-closure-safe transport body.

**Behaviors:**
- Auto-creates conversation in Dexie if absent
- Hydrates `useChat` from persisted Dexie messages on mount/chat switch
- Auto-generates title from first user message
- Persists messages + file state on `onFinish`
- Exposes `isLoading` as `chat.status !== 'ready'`

### 8.2 `useWorkspaceFiles` — File CRUD

```typescript
export function useWorkspaceFiles(chatId: string, currentConv?: Conversation) {
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const files = useMemo(() => getWorkspaceFiles(currentConv), [currentConv]);
```

Operations: `handleSelectFile` (sets active + opens drawer), `handleCreateFile` (generates UUID, saves to Dexie), `handleUpdateFile` (upserts to Dexie), `handleDeleteFile` (removes + updates activeFileId). Name auto-appends `.md` if no extension given.

### 8.3 `useModelSettings`

Manages model + thinking level with localStorage persistence and conversation-level overrides:

```typescript
// On mount: reads localStorage via getInitialModel()
// On conversation change: overrides from currentConv.model/thinkingLevel
handleModelSelect(id) → saves to localStorage, validates thinking level, persists to Dexie
handleThinkingLevelChange(level) → saves to localStorage and Dexie
```

### 8.4 `useIsMobile`

```typescript
const MOBILE_BREAKPOINT = 768;
// Uses window.matchMedia listener + setTimeout for SSR safety
```

---

## 9. Model Registry (`lib/models.ts`)

### Available Models

| ID | Label | Thinking Levels |
|----|-------|-----------------|
| `gemini-3.6-flash` | Gemini 3.6 Flash | minimal, low, medium, high |
| `gemini-3.5-flash` | Gemini 3.5 Flash | minimal, low, medium, high |
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | minimal, low, medium, high |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | minimal, high |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview | minimal, low, medium, high |
| `gemma-4-31b-it` | Gemma 4 31B IT | — |
| `gemma-4-26b-a4b-it` | Gemma 4 26B A4B IT | — |

### Persistence

Model preference and thinking level stored in `localStorage` (`selectedModel`, `selectedThinkingLevel`). Conversation-level values take priority on chat load.

---

## 10. System Prompt Design (`lib/ai/prompts.ts`)

`buildSystemInstruction(files)` generates a 5-section prompt:

1. **Goal** — "elite agentic workspace assistant", prefer files over chat
2. **Current Workspace** — Metadata-only listing (`name`, `language`, `charCount`, `id`). No full content injected — model calls `readFile` on demand. Empty workspace: "Offer to create a starting file."
3. **Tool Rules (6 strict):**
   - Always `readFile` before editing
   - Prefer `editFile` over `writeFile` for existing files
   - Copy `searchString` verbatim from `readFile` with 1-2 anchor lines
   - Post-mutation: 1-3 sentence confirmation only, no content dump
   - Error recovery: retry once, then ask user
   - Never claim success unless tool actually succeeded
4. **Response Style** — Concise, GFM markdown, fenced code blocks, tool-first
5. **Edge Cases** — Empty workspace, ambiguous request (one clarifying question), off-topic (answer then redirect)

---

## 11. ResumeEditEngine (`lib/edit-engine.ts`)

3-tier matching for surgical file editing:

### Tier 1 — Exact Match
Splits source on `searchString`; rejects if 0 matches, errors if >1 (ambiguous). Uses `String.replace()` for the single-match case.

### Tier 2 — Whitespace-Normalized Match
Normalizes both source and search (`\r\n` → `\n`, collapse whitespace, trim). Performs line-by-line trimmed comparison. Detects ambiguity across multiple line groups.

### Tier 3 — Anchor Match
When full search can't be matched, extracts first and last non-empty lines as anchor lines. Finds a source range bounded by first anchor...last anchor (within searchLines.length + 5 range). Replaces the entire range.

```typescript
static applyEdit(source: string, searchString: string, replaceString: string): EditResult {
  const exact = this.applyExactMatch(source, searchString, replaceString);
  if (exact.success) return exact;
  const normalized = this.applyNormalizedMatch(source, searchString, replaceString);
  if (normalized.success) return normalized;
  const anchor = this.applyAnchorMatch(source, searchString, replaceString);
  if (anchor.success) return anchor;
  return { success: false, error: "searchString could not be matched. Include more context lines." };
}
```

---

## 12. Styling & Animation System (`app/globals.css`)

### Custom Theme (Tailwind CSS 4)

5-layer surface system (`base #14161c → raised #1c1f26 → overlay #242830 → elevated #2c3038 → hover #343840`), 5 text opacities (`bright → primary → secondary → muted → faint`), 3 edge opacities (`default → raised → hover`).

### Key Animations

- **Typing dots** (`blink`): 3 staggered dots, opacity oscillation, animation-delay cascade
- **Fade-in** (`fadeIn`): `translateY(4px) → 0` + `opacity: 0 → 1`, 250ms
- **Shimmer** (`shimmer`): `translateX(-100%) → 100%`, 2.8s ease-in-out infinite, applied to streaming message overlay
- **Caret** (`caret`): `opacity: 1 → 0.15`, 1.1s, inline after streaming text
- **Ping ring**: On streaming avatar, 2px emerald ring

### Ambient Background

```css
body::before {
  background:
    radial-gradient(ellipse 100% 60% at 50% -20%, rgba(52,211,153,0.04), transparent),
    radial-gradient(ellipse 80% 50% at 80% 80%, rgba(96,165,250,0.03), transparent);
  pointer-events: none;
}
```

---

## 13. Key Architectural Decisions

### Why Dexie Over Server-Side DB?

Designed for Google AI Studio's ephemeral Cloud Run — no persistent server-side storage. All data lives in IndexedDB, making the app fully client-side persistent.

### Why Native UIMessage Format in Dexie?

Eliminates format conversion code between `useChat` and persistence. The `parts[]` array is the single source of truth for text, tool invocations, and reasoning content.

### Why Closures Instead of contextSchema?

Keeps the API route stateless at the HTTP layer while allowing multi-step tool calls to build on each other within a single request. Previous `contextSchema` approach required separate wiring per tool and couldn't handle multi-step mutations cleanly.

### Why Metadata-Only System Prompt?

Full file content previously bloated context across 10 `prepareStep` re-injections. Now only `name`, `language`, `charCount`, and `id` are listed. Model calls `readFile` on demand — trades one extra tool call per edit for significantly smaller context per step.

### Why use-stick-to-bottom Over Manual useEffect?

Previous `scrollIntoView` approach with 3 `useEffects` suffered from React batch race conditions — users couldn't reliably escape auto-scroll during streaming. `use-stick-to-bottom` uses synchronous `ResizeObserver`/`MutationObserver` before React reconciliation.

---

## 14. Environment Configuration

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | — | Gemini API key for `@ai-sdk/google` |
| `NEXT_PUBLIC_GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Default model ID |
| `APP_URL` | Yes | — | Cloud Run URL injected by AI Studio |

---

## 15. Architectural Evolution

```
Raw Google GenAI SDK → AI SDK 7 Migration → Native UIMessage → General-Purpose Workspace
  (@google/genai)        (AI SDK 7)               (Native UIMessage)     (HEAD)
  custom agent loop      streamText + tool()  DBMessage extends   6 workspace file tools
  custom fetch/stream    useChat + transport    UIMessage         closure pattern
  FunctionDeclaration    createResumeTools()   no more conversion  metadata-only prompt
  GEMINI_API_KEY         GOOGLE_GENERATIVE..   onFinish persistence constrained rules
                                               title auto-gen      smoothStream
                                               refresh fix         WorkspaceDrawer
                                                                   resolver tool cards
```

---

## 16. Extension Guide

### Adding a New Model

Add entry to `MODELS` array in `lib/models.ts`, set `MODEL_DESCRIPTIONS`, optionally set `MODEL_THINKING_LEVELS`.

### Adding a New Tool

1. Define with `tool()` from `ai` in `lib/ai/tools.ts` — include `inputSchema` and `outputSchema`
2. Add factory function using `WorkspaceToolsContext` callbacks
3. Register in `createWorkspaceTools()` aggregator
4. Update `lib/ai/prompts.ts` — add rule in `## Tool Rules`
5. Add config entry + summary builder in `components/chat/tools/resolver.tsx` — `ToolCallCard.tsx` needs zero changes
6. If tool returns `{ file }` or `{ files }`, `extractFilesFromMessage` auto-discovers it

### Adding a New Provider

Add `@ai-sdk/<provider>` to `package.json`, set as `model` in `streamText`, add models to registry.

### Closure Pattern

Extend `WorkspaceToolsContext` if new callbacks are needed, pass through `createWorkspaceTools()` in the route handler, implement in `useWorkspaceFiles.ts` for Dexie persistence.

### Schema Migrations

Increment version in `db.ts` constructor, define new `stores()` — Dexie handles IndexedDB versioning upgrades automatically.