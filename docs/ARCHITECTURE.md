# ResumeFlow — Architecture Guide

## 1. Project Overview

**ResumeFlow** is an AI-powered resume tailoring agent built on Google AI Studio. It helps users generate, edit, optimize, and ATS-format Markdown resumes through a conversational chat interface backed by Google Gemini models.

- **Hosting:** Google Cloud Run (via AI Studio)
- **GitHub:** https://github.com/anomalyco/ai-sdk-playground
- **Stack:** Next.js 16 App Router (standalone output) + Vercel AI SDK 7 + Dexie.js

## 2. Tech Stack

| Layer | Choice | Purpose |
|-------|--------|---------|
| Framework | Next.js 16.2.10 (App Router) | SSR, API routes, routing |
| Language | TypeScript 5.9.3 | Type safety |
| AI SDK | `ai@^7.0.0` | Unified LLM interface, streaming, tool calling |
| Google Provider | `@ai-sdk/google@^4.0.0` | Gemini model access |
| React AI | `@ai-sdk/react@^2.0.0` | `useChat` hook + UI stream primitives |
| Client DB | Dexie.js 4 + dexie-react-hooks | IndexedDB persistence (conversations + messages) |
| Styling | Tailwind CSS 4.1 | Utility-first CSS |
| Animation | `motion` (Framer Motion) | Drawer transitions |
| Markdown | `react-markdown` + `remark-gfm` | Resume preview, chat rendering |
| Schemas | `zod@^4.4.3` | Input validation, tool input/context schemas |
| Icons | `lucide-react` | UI iconography |
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
│   ├── ChatPanel.tsx             # Message list, empty state, loading indicators
│   ├── Sidebar.tsx               # Conversation list, new/delete
│   ├── chat/
│   │   ├── ChatBubble.tsx        # User/assistant message bubble
│   │   ├── ChatInput.tsx         # Auto-resize textarea with Enter-to-send
│   │   ├── ChatHeader.tsx        # Model selector + thinking level + resume drawer
│   │   ├── ToolCallCard.tsx      # Resume Workspace card (tool result display)
│   │   └── SuggestionChips.tsx   # [DEPRECATED] No longer rendered
│   └── resumes/
│       └── ResumeDrawer.tsx      # Slide-over panel: preview/edit/copy resume
├── hooks/
│   ├── useChatSession.ts         # Central orchestration hook (core logic)
│   └── use-mobile.ts             # Responsive breakpoint detection (768px)
├── lib/
│   ├── schemas.ts                # Zod types: Resume, ChatMessage, ToolCall
│   ├── models.ts                 # Model registry, thinking levels, localStorage
│   ├── id.ts                     # ID generation (crypto.randomUUID)
│   ├── db/
│   │   └── db.ts                 # Dexie schema v4, CRUD helpers
│   └── ai/
│       ├── index.ts              # Re-exports prompts + tools
│       ├── prompts.ts            # buildSystemInstruction() — system prompt
│       └── tools.ts              # writeResume, readResume, deleteResume tools (contextSchema)
├── assets/.aistudio/             # AI Studio metadata (gitignored)
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
  │  Body: { messages, model, thinkingLevel, resumes }
  │
  ▼
POST /api/agent (route.ts)
  ├── Parse request body with Zod
  ├── streamText({
  │     model: google(modelId),
  │     system: buildSystemInstruction(currentResume),
  │     messages: convertToModelMessages(messages),
  │     tools: { writeResume, readResume, deleteResume },
  │     toolsContext: { writeResume: { currentResume }, readResume: { currentResume }, deleteResume: { currentResume } },
  │     reasoning / providerOptions.thinkingConfig,
  │     stopWhen: isStepCount(5),
  │     onStart, onStepEnd, onEnd, onError
  │   })
  │
  ▼
createUIMessageStreamResponse(toUIMessageStream(result.stream))
  │  Returns SSE stream
  │
  ▼
useChat receives UI message stream
  │  chat.messages updates reactively
  │
  ▼
onFinish(message, allMessages)
  ├── Persist all messages to Dexie as native UIMessage objects
  ├── Extract resume from tool result in message parts
  └── Update conversation.resume in Dexie
```

### Key: Two persistence layers

| Layer | Data | Purpose |
|-------|------|---------|
| **Dexie (IndexedDB)** | Conversations + Messages | Client-side persistence across page refreshes |
| **Request body** | Current resume snapshot | Sent to API route so tool has context on each request |

The API route is **stateless** — every request receives the full message history + current resume. The tool returns the updated resume as a structured result, and the client persists it to Dexie in `onFinish`.

## 5. AI SDK Integration Patterns

### 5a. Streaming Agent Endpoint (`app/api/agent/route.ts`)

```typescript
const result = streamText({
  model: google(modelId),
  system: buildSystemInstruction(currentResume),
  messages: await convertToModelMessages(messages),
  tools: createResumeTools(),
  toolsContext: {
    writeResume: { currentResume },
    readResume: { currentResume },
    deleteResume: { currentResume },
  },
  onStart() { /* log */ },
  onStepEnd({ stepNumber, toolCalls }) { /* log */ },
  onEnd({ finishReason, usage }) { /* log */ },
  onError({ error }) { /* log */ },
  stopWhen: isStepCount(5),            // max 5 tool-calling steps
  providerOptions: {
    google: {
      thinkingConfig: { thinkingLevel, includeThoughts: true },
    },
  },
});

return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream }),
});
```

### 5b. Tool Definitions with contextSchema (`lib/ai/tools.ts`)

Three tools are registered in `createResumeTools()`:

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `writeResume` | `title?`, `markdownContent` | `{ resume }` | Create or fully replace the resume |
| `readResume` | `section?` | `{ exists, content, section? }` | Read full resume or a specific heading section |
| `deleteResume` | — | `{ deleted, resume: empty }` | Clear the resume canvas |

All three use `contextSchema: { currentResume: ResumeSchema.optional().nullable() }` and receive state through `toolsContext`.

```typescript
export const writeResume = tool({
  description: "Create or replace the entire resume markdown on the canvas.",
  inputSchema: z.object({
    title: z.string().optional(),
    markdownContent: z.string(),
  }),
  contextSchema: z.object({ currentResume: ResumeSchema.optional().nullable() }),
  execute: async ({ title, markdownContent }, { context }) => {
    const existing = context?.currentResume;
    const updatedResume: Resume = {
      id: existing?.id || "chat-resume",
      title: title || existing?.title || "Chat Resume",
      markdownContent,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return { resume: updatedResume };
  },
});
```

### 5c. Client-Side Chat Hook (`hooks/useChatSession.ts`)

```typescript
const transport = new DefaultChatTransport({
  api: '/api/agent',
  body: () => ({
    model: modelRef.current,
    thinkingLevel: thinkingLevelRef.current,
    resumes: resumeRef.current ? [resumeRef.current] : [],
  }),
});

const chat = useChat({
  id: chatId,
  transport,
  onFinish: async ({ message, messages: allMessages }) => {
    // Persist all messages to Dexie
    for (const msg of allMessages) {
      await db.messages.put({ ...msg, chatId, timestamp: ... });
    }
    // Extract resume from tool result
    for (const m of [message, ...allMessages].reverse()) {
      const updatedResume = extractResumeFromMessage(m);
      if (updatedResume) {
        await updateConversationResume(chatId, updatedResume);
        break;
      }
    }
  },
});
```

### 5d. Resume Extraction from UI Message Parts

The function is tool-name-agnostic — it scans all tool result parts for a `resume` key, handling `writeResume`, `deleteResume`, and future tools that return `{ resume }`.

```typescript
export function extractResumeFromMessage(msg: GenericUIMessage): Resume | null {
  if (!msg || !Array.isArray(msg.parts)) return null;
  for (const part of msg.parts) {
    const res =
      (part.result as { resume?: Resume })?.resume ||
      (part.output as { resume?: Resume })?.resume;
    if (res && typeof res.markdownContent === 'string') return res;
  }
  return null;
}
```

## 6. Database Schema (Dexie v4)

### Conversations Table

```
id:          string (PK)     — UUID, matches URL param /chat-id/:id
title:       string          — Auto-generated from first message or "New Chat"
model:       string          — Gemini model ID (e.g. "gemini-3.5-flash-lite")
thinkingLevel: string (opt)  — "minimal" | "low" | "medium" | "high"
resume:      Resume (JSON)   — Current resume object for this conversation
createdAt:   string (ISO)    — Creation timestamp
updatedAt:   string (ISO)    — Last activity timestamp
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
- v4: switched from custom ChatMessage to native UIMessage format (current)

## 7. Component Tree & Responsibilities

```
RootLayout (globals.css, metadata)
│
├── Home (app/page.tsx)
│     └── Redirects to /chat-id/:id (latest conversation or new UUID)
│
└── ChatIdPage (app/chat-id/[id]/page.tsx)
      │  90 lines — thin shell
      │
      ├── Sidebar (components/Sidebar.tsx)
      │     ├── Brand header with logo
      │     ├── "New Conversation" button → generates UUID, navigates
      │     └── Conversation list (Dexie live query, sorted by updatedAt desc)
      │           └── Per-item: Link + delete button
      │
      ├── ChatHeader (components/chat/ChatHeader.tsx)
      │     ├── Resume title display
      │     ├── Model dropdown (Gemini / Gemma 4 groups)
      │     ├── Thinking level dropdown (minimal/low/medium/high)
      │     └── "Resume Drawer" button
      │
      ├── ChatPanel (components/ChatPanel.tsx)
      │     ├── Empty state (branded prompt when no messages)
      │     ├── ChatBubble[] — message list
      │     └── Loading indicator (typing dots animation)
      │
      ├── ChatInput (components/chat/ChatInput.tsx)
      │     ├── Auto-resizing textarea (max 160px)
      │     ├── Enter to send, Shift+Enter for newline
      │     └── Submit button (ArrowUp icon)
      │
      └── ResumeDrawer (components/resumes/ResumeDrawer.tsx)
            ├── Slide-over panel (motion spring animation)
            ├── Preview mode: rendered markdown with custom prose styles
            ├── Edit mode: raw markdown textarea
            ├── Copy markdown to clipboard
            └── Empty state prompt when no resume exists
```

### ChatBubble Internals

```
ChatBubble
  ├── User message: plain text with User avatar
  └── Assistant message:
        ├── [Collapsible "Thought Process" accordion] — when reasoningText present
        ├── Markdown content rendered with react-markdown + GFM
        │     └── Custom components for h1-h3, code blocks (with copy), tables, blockquotes
        ├── Streaming cursor (pulsing emerald bar)
        └── ToolCallCard[] (for tool invocation results)
              ├── writeResume → "Resume Updated" (emerald, file summary + Open Drawer)
              ├── readResume → "Resume Read" (blue, section name + content preview)
              └── deleteResume → "Resume Deleted" (red, canvas cleared message)
```

### ToolCallCard Internals

```
ToolCallCard
  ├── Config map per tool: { icon, accent color, label, badge text }
  ├── writeResume:  Sparkles icon, emerald, "Resume Updated" + "Updated" badge
  │     └── Summary: file icon, title, char/section count + "Open Drawer" button
  ├── readResume:   Search icon, blue, "Resume Read" + "Read" badge
  │     └── Summary: section heading name + first 200 chars content preview
  ├── deleteResume: Trash2 icon, red, "Resume Deleted" + "Cleared" badge
  │     └── Summary: "Canvas cleared" message + start-fresh hint
  └── All: Collapsible "View Parameters" → raw JSON of args + result
```

## 8. Model Registry (`lib/models.ts`)

### Available Models

| ID | Label | Provider | Thinking Levels |
|----|-------|----------|-----------------|
| `gemini-3.5-flash` | Gemini 3.5 Flash | Gemini | minimal, low, medium, high |
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | Gemini | minimal, low, medium, high |
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

The `buildSystemInstruction(resume?)` function builds a structured system prompt with:

1. **Role definition** — "elite AI Career Strategist, Resume Architect, and ATS Optimization Specialist"
2. **Canvas status** — a one-line indicator (`populated` / `empty`); the model must call `readResume` to inspect content
3. **Markdown & ATS formatting rules** — heading levels, bolding, bullet lists, code blocks, ATS/PDF guardrails
4. **Tool execution protocol** — documents `readResume`, `writeResume`, and `deleteResume` with usage guidance
5. **Few-shot examples** — advisory response vs tool-execution response patterns

The resume markdown is **no longer injected** into the system prompt. This keeps prompt size small and forces the model to read the current state via `readResume`, avoiding stale data after writes.

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

### Why contextSchema instead of mutable workingResumes?
The `contextSchema` pattern (added in `eff20e7`) passes the current resume state through `toolsContext` rather than capturing a mutable array in a closure. This is more idiomatic AI SDK 7 and makes the tool execute function a pure function — it receives context, returns a result, with no side effects.

### Why streamText over generateText?
`streamText` enables real-time streaming of both text tokens and tool call invocations back to the client via `createUIMessageStreamResponse`. This gives the user immediate feedback while the agent iterates through multi-step tool calling loops.

### Why DefaultChatTransport?
`DefaultChatTransport` wraps the `useChat` ↔ API route communication, automatically handling message serialization, streaming via SSE, and reconnection. It's the standard AI SDK pattern for connecting `useChat` to a custom API endpoint.

## 13. Architectural Evolution (from git log)

```
Raw Google GenAI SDK  ──→  AI SDK 7 Migration  ──→  Native UIMessage  ──→  Decomposed & Polished
  (@google/genai)            (f3ff218)                (2f200e6)              (HEAD)
  - custom agent loop        - streamText + tool()    - DBMessage extends     - useChatSession hook
  - custom fetch/stream      - useChat + transport      UIMessage             - ChatHeader component
  - FunctionDeclaration      - createResumeTools()    - no more conversion    - contextSchema
  - GEMINI_API_KEY           - GOOGLE_GENERATIVE_..   - onFinish persistence  - lifecycle callbacks
                                                      - title auto-gen        - model sync to Dexie
                                                      - refresh fix
```

## 14. Notes for Future Agents

- **Adding a new model:** add entry to `MODELS` array in `lib/models.ts`, set `MODEL_DESCRIPTIONS` and optionally `MODEL_THINKING_LEVELS`
- **Adding a new tool:** define with `tool()` from `ai`, add `inputSchema`, optionally `contextSchema`, then register in `createResumeTools()` in `lib/ai/tools.ts` and update the system prompt in `lib/ai/prompts.ts`. If the tool returns a `{ resume }` object, `extractResumeFromMessage` in `useChatSession.ts` will auto-discover it — no filter update needed.
- **Adding a new provider:** add `@ai-sdk/<provider>` to `package.json`, set as `model` parameter in `streamText` (e.g., `anthropic("claude-4")`), add models to registry
- **Schema migrations:** increment the version number in `db.ts` constructor and define new `stores()` — Dexie handles the upgrade
- **The `app/api/jd` and `lib/data` directories are empty** — reserved for future job description extraction features
- **`contexts/` and `components/ui/` are empty** — available for shared state providers and base UI primitives
