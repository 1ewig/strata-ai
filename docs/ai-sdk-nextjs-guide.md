# Building Chatbots & Agentic AI with AI SDK 7 + Next.js 16

> The complete, beginner-to-advanced guide to building production-grade AI chat applications with the **Vercel AI SDK 7**, **Next.js 16**, and **bun**. Every technique in this guide is demonstrably shipped in **Strata AI**, the reference workspace-studio app that lives in this repository (`docs/SUMMARY.md` is the companion architecture guide). Where a concept comes from real Strata AI code, the source file is cited so you can read the production implementation.

## Table of Contents

- [Part 0 — Foundations: Why This Stack](#part-0-foundations-why-this-stack)
  - [0.1 What this guide is](#01-what-this-guide-is)
  - [0.2 The stack, in one picture](#02-the-stack-in-one-picture)
  - [0.3 Project setup](#03-project-setup)
  - [0.4 Core dependencies (from `package.json`)](#04-core-dependencies-from-packagejson)
  - [0.5 The server/client boundary in Next.js 16](#05-the-serverclient-boundary-in-nextjs-16)
- [Part 1 — Your First Chatbot](#part-1-your-first-chatbot)
  - [1.1 The chat protocol: a stream of UI messages](#11-the-chat-protocol-a-stream-of-ui-messages)
  - [1.2 The client: `useChat` + a transport](#12-the-client-usechat--a-transport)
  - [1.3 The server: `streamText` to the UI stream response](#13-the-server-streamtext-to-the-ui-stream-response)
  - [1.4 The components](#14-the-components)
  - [1.5 Sending, status, and stopping](#15-sending-status-and-stopping)
- [Part 2 — Streaming UX (the "non-glitchy" layer)](#part-2-streaming-ux-the-non-glitchy-layer)
  - [2.1 Word-pace the stream with `smoothStream`](#21-word-pace-the-stream-with-smoothstream)
  - [2.2 Status-driven chrome](#22-status-driven-chrome)
  - [2.3 Auto-scroll without a single `scrollIntoView`](#23-auto-scroll-without-a-single-scrollintoview)
  - [2.4 Reasoning / thinking streams](#24-reasoning--thinking-streams)
  - [2.5 Stream plain text, markdown late](#25-stream-plain-text-markdown-late)
  - [2.6 Group intermediate work, but only after it finishes](#26-group-intermediate-work-but-only-after-it-finishes)
- [Part 3 — Agentic AI: Tools & Loops](#part-3-agentic-ai-tools--loops)
  - [3.1 The atomic unit: `tool()` with schemas](#31-the-atomic-unit-tool-with-schemas)
  - [3.2 The closure-context pattern (stateless routes)](#32-the-closure-context-pattern-stateless-routes)
  - [3.3 Registering the tool suite](#33-registering-the-tool-suite)
  - [3.4 Step limits keep loops finite](#34-step-limits-keep-loops-finite)
  - [3.5 The auto-continuation loop](#35-the-auto-continuation-loop)
  - [3.6 Re-injecting the system prompt per step](#36-re-injecting-the-system-prompt-per-step)
  - [3.7 System-prompt discipline: metadata, not content](#37-system-prompt-discipline-metadata-not-content)
  - [3.8 Bonus technique: a surgical edit engine](#38-bonus-technique-a-surgical-edit-engine)
- [Part 4 — Architecture, Providers, & Persistence](#part-4-architecture-providers--persistence)
  - [4.1 The model registry](#41-the-model-registry)
  - [4.2 The provider resolver: one seam, many providers](#42-the-provider-resolver-one-seam-many-providers)
  - [4.3 Reasoning mapped per provider](#43-reasoning-mapped-per-provider)
  - [4.4 Persisting native UI messages (Dexie)](#44-persisting-native-ui-messages-dexie)
  - [4.5 The single onFinish reconciliation point](#45-the-single-onfinish-reconciliation-point)
  - [4.6 Tool-result file extraction](#46-tool-result-file-extraction)
  - [4.7 The refs-as-transport-bridge](#47-the-refs-as-transport-bridge)
  - [4.8 Quota via response headers](#48-quota-via-response-headers)
  - [4.9 Provider-accurate token accounting via `messageMetadata`](#49-provider-accurate-token-accounting-via-messagemetadata)
- [Part 5 — Performance Optimization Techniques](#part-5-performance-optimization-techniques)
  - [5.1 The streaming re-render audit](#51-the-streaming-re-render-audit)
  - [5.2 The key insight: only the in-flight message is re-created](#52-the-key-insight-only-the-in-flight-message-is-re-created)
  - [5.3 `React.memo` boundaries on hot surfaces](#53-reactmemo-boundaries-on-hot-surfaces)
  - [5.4 Custom comparators for streaming props](#54-custom-comparators-for-streaming-props)
  - [5.5 Stable handlers with `useCallback`](#55-stable-handlers-with-usecallback)
  - [5.6 Memoize resolved UI with `useMemo`](#56-memoize-resolved-ui-with-usememo)
  - [5.7 Plain-text segments while streaming](#57-plain-text-segments-while-streaming)
  - [5.8 Type-system styling discipline](#58-type-system-styling-discipline)
  - [5.9 Server-side tool input delta coalescing](#59-server-side-tool-input-delta-coalescing)
  - [5.10 Measure, don't guess](#510-measure-dont-guess)
- [Part 6 — Best Practices & Anti-Patterns](#part-6-best-practices--anti-patterns)
  - [6.1 The checklist](#61-the-checklist)
  - [6.2 Mistakes we actually made](#62-mistakes-we-actually-made)
  - [6.3 Where everything lives in Strata AI](#63-where-everything-lives-in-strata-ai)

---

## Part 0 — Foundations: Why This Stack

### 0.1 What this guide is

This is a complete, opinionated walkthrough of how to build a modern AI application: a plain text chatbot first, then a full multi-tool *agent*. It is intentionally built as a ladder — each part is a strict superset of the previous one:

1. **Part 1** streams a chat reply (chatbot).
2. **Part 2** makes it feel fast and smooth (streaming UX).
3. **Part 3** gives it tools and reasoning loops (agent).
4. **Part 4** teaches architecture, provider abstraction, and persistence (production agent).
5. **Part 5** shows the performance techniques that keep a long agentic session fluid (optimization).
6. **Part 6** is the running checklist of best practices and anti-patterns.

Everything maps to the real Strata AI codebase in this repository. Those file citations are the "answer key" — when an example here is abstracted, `src/...` shows the production version.

### 0.2 The stack, in one picture

```
┌────────────────────────── Client (Next.js 16 App Router, 'use client') ──────────────────────────┐
│                                                                                                   │
│  useChat({ id, transport, onError, onFinish })      <── @ai-sdk/react                               │
│      │                                                                                             │
│      │ DefaultChatTransport({ api: '/api/agent', body, fetch })                                     │
│      │   POST /api/agent  (SSE, UI message stream)                                                 │
└──────┼─────────────────────────────────────────────────────────────────────────────────────────────┘
       ▼
┌────────────────────────── Server (Route Handler) ─────────────────────────────────────────────────┐
│  auth → rate limit → zod body validation                                                          │
│  streamText({ model, system, messages, tools, stopWhen, experimental_transform })                 │
│      │                                                                                             │
│      └─ toUIMessageStream() ── createUIMessageStreamResponse({ stream, headers })                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Two facts make AI SDK 7 + Next.js 16 a great pair:

- **AI SDK 7 owns the "wire format".** Both sides speak a single protocol — a *stream of UI message deltas* (SSE). The client (`useChat`) and server (`streamText` + `toUIMessageStream`) are pieces of the same contract, so you never hand-write SSE parsing or message diffing.
- **Next.js 16 gives you one-button streaming endpoints.** Route Handlers can return a `ReadableStream` trivially, `abortSignal` propagates to the HTTP request, and App Router conventions (`use(params)`, `proxy.ts`) handle the shell around it.

### 0.3 Project setup

Initialize and install:

```bash
bun init -y
bun add next@16 react@19 react-dom@19
bun add ai @ai-sdk/react @ai-sdk/google
bun add zod
bun add -d @types/react @types/react-dom typescript tailwindcss @tailwindcss/postcss
```

Create `.env.local` (never commit keys):

```env
# Provider keys
GOOGLE_GENERATIVE_AI_API_KEY="..."
# Optional: a second provider (this guide uses Fireworks in Part 4)
FIREWORKS_API_KEY="..."
```

`package.json` scripts — this repo's exact commands:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "start": "next start"
  }
}
```

> Note the bun-only rule: never `npm install`/`yarn add` in this repo.

### 0.4 Core dependencies

From Strata AI's `package.json` — the exact versions this guide documents:

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.10 | App Router, streaming route handlers, `proxy.ts` |
| `ai` | ^7.0.0 | `streamText`, `tool`, `smoothStream`, `isStepCount`, UI-message helpers |
| `@ai-sdk/react` | ^2.0.0 | `useChat`, transports |
| `@ai-sdk/google` | ^4.0.0 | Gemini provider |
| `@ai-sdk/fireworks` | ^3.0.0 | Fireworks-hosted open-weight models |
| `zod` | ^4.4.3 | Schema validation for API bodies and every tool |
| `dexie` / `dexie-react-hooks` | ^4 | IndexedDB for local-first persistence |

### 0.5 The server/client boundary in Next.js 16

The App Router `src/` layout makes the boundary physical:

- **Server code:** `app/layout.tsx` (SSR), `app/api/**/route.ts` (Route Handlers), `proxy.ts` (middleware replacement), any file/server module imported only from server files.
- **Client code:** every interactive page is marked `'use client'`. The chat page (`app/chat-id/[id]/page.tsx`) is a deliberately *thin shell* — it unwraps async params, calls feature hooks, and threads everything to presentational components as props.

Two hard rules you'll see repeated:

1. **Server code never imports client DB clients** (Dexie); **client code never imports the server `pg` pool** or provider SDKs (`@ai-sdk/google`/`@ai-sdk/fireworks`). The shared seam is Zod schemas (`lib/schemas.ts`).
2. **Dynamic params are promises in Next 16** — client pages unwrap with `use(params)`:

```tsx
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // ...
}
```

Read it in `src/app/chat-id/[id]/page.tsx`.

---

## Part 1 — Your First Chatbot

### 1.1 The chat model: a stream of UI messages

AI SDK 7's chat model is a **user-interface message**: a container with `id`, `role`, `text content`, and — the important part — a **`parts` array**. Every piece of a message is a part:

- `{ type: 'text', text: '...' }`
- `{ type: 'reasoning', reasoning: '...' }` (thinking output)
- `{ type: 'tool-invocation', toolInvocation: { ... } }` (tool calls/results)

The server and the client both work on this shape. The server *produces* a stream of these; the client *consumes* it. No custom DTO, no manual parsing.

### 1.2 The client: `useChat` + a transport

In AI SDK 7 the way chat connects to a backend moved from a plain `fetch` option to dedicated **transports**. The default transport already wraps `fetch` for `/api/chat`; you subclass or wrap it when you need custom request bodies or response handling.

The exact production pattern in Strata AI (`src/hooks/useChatTransport.ts`):

```ts
import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';

export function useChatTransport() {
  return useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent',
        // body() is evaluated per request, so it can read live refs — see Part 4.7.
        body: () => ({
          model: 'gemini-3.5-flash-lite',
          thinkingLevel: 'medium',
          files: currentFilesRef.current,
        }),
        fetch: async (url, options) => {
          const res = await fetch(url, options);
          // Rate-limit headers come back on every response — Part 4.8.
          return res;
        },
      }),
    [],
  );
}
```

Then the session hook (abridged from `src/hooks/useChatSession.ts`):

```ts
'use client';
import { useChat } from '@ai-sdk/react';

export function useChatSession() {
  const chat = useChat({
    id: 'my-conversation-id',          // stable id => persisted continuation key
    transport: transport as any,
    onError: (err) => handle(error),
    onFinish: async ({ message, messages, finishReason }) => { /* Part 4.5 */ },
  });

  return {
    messages: chat.messages,
    status: chat.status,
    send: chat.sendMessage,
    stop: chat.stop,
  };
}
```

Notes on `useChat` state captures:

- `chat.messages` — the live, streaming message list (re-renders each delta).
- `chat.status` — `'ready' | 'submitted' | 'streaming'` (drives every visual state; never invent your own boolean).
- `chat.sendMessage({ text })` — the v7 replace for `append`. It returns a promise but you normally do not await it.
- `chat.stop()` — aborts the in-flight request server-side via `abortSignal`.

### 1.3 The server: `streamText` to the UI stream response

The other half of the contract. In Strata AI this lives in `src/lib/ai/agent-runner.ts` (`runAgentResponse`), and `src/app/api/agent/route.ts` stays a thin auth/quota/validation shell that only delegates to it (Part 3.2 shows the split). The core shape (abridged):

```ts
import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-3.5-flash-lite'),
    messages: await convertToModelMessages(messages), // UI messages -> model messages
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

Three non-obvious pieces you *must* keep:

1. **`convertToModelMessages`** — the wire shape the provider understands is not the `parts` shape. Convert both ways across the boundary.
2. **`toUIMessageStream(result.stream)`** — this re-emits the model stream as UI-message deltas (the same format `useChat` consumes).
3. **`createUIMessageStreamResponse`** — wraps that stream in the SSE `Content-Type: text/plain` response, with (optionally) extra headers (Strata AI attaches `X-RateLimit-*` quota headers here).
4. **`createUIMessageStream(({ writer }) => { ... })`** — wraps `streamText` to allow tools to emit live custom stream events (`writer.write({ type: "data-workspace", data: ... })`), which the client handles in real time via `useChat`'s `onData` callback. This is how workspace files appear/disappear live mid-stream, before the run finishes (Part 4.6).

`abortSignal: req.signal` is the server half of `chat.stop()`. Skip it and stop becomes a no-op that burns tokens.

### 1.4 The components

Keep the components **dumb**. A page shell calls the hook and passes props down:

```tsx
// app/chat/[id]/page.tsx (client)
const { messages, status, sendMessage, stop } = useChatSession();

return (
  <div className="flex flex-col h-dvh">
    <ChatPanel messages={messages} status={status} />
    <ChatInput status={status} onSend={sendMessage} onStop={stop} />
  </div>
);
```

`ChatPanel` just renders the list:

```tsx
export function ChatPanel({ messages, status }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {status === 'streaming' && <TypingDots />}
    </div>
  );
}
```

`MessageBubble` maps each part (see `src/components/chat/ChatBubble.tsx` for the full map):

```tsx
const byType = {
  text: (p) => <p className="text-body">{p.text}</p>,
  reasoning: (p) => <ThoughtAccordion text={p.reasoning} />,
  'tool-invocation': (p) => <ToolCallCard />,
};
```

`ChatInput` mirrors the send/stop morph (see Part 2.2).

**Overlays need a portal.** A modal confirmed inside a chat surface can be trapped by an ancestor with a CSS `transform` (e.g. the chat page's layout blocks), shrinking it or clipping it mid-viewport. Strata AI's `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) renders through `createPortal(dialog, document.body)` and drives open/close with `AnimatePresence`, so the dialog always spans the real viewport regardless of where it was mounted. Use the same escape hatch for any fixed-position overlay rendered from inside transformed/animated parents.

### 1.5 Sending, status, and stopping

A finished `ChatInput` flow:

- on submit: `chat.sendMessage({ text })`; `status` flips `ready → submitted → streaming`.
- While `streaming`: render the caret, disable send, show the stop control.
- `chat.stop()` → server aborts via `abortSignal`, `status → ready`.

Add a character cap (`MAX_MESSAGE_CHARS = 2000`) mirrored on the server with a Zod/HTTP 400 — do not trust the client-side `maxLength` alone.

---

## Part 2 — Streaming UX (the "non-glitchy" layer)

A working chatbot is not a *good* chatbot. The gap between "works" and "feels premium" is the streaming experience. This part is the checklist.

### 2.1 Word-pace the stream with `smoothStream`

Providers emit tokens in bursts. Without pacing, the text jumps in chunks and the UI reads as a glitchy typewriter. AI SDK 7 ships `smoothStream` as an **`experimental_transform`** that re-chunks the output for controlled delivery:

```ts
import { streamText, smoothStream } from 'ai';

const result = streamText({
  model,
  messages,
  // production values in Strata AI (src/lib/ai/agent-runner.ts):
  experimental_transform: [
    smoothStream({
      delayInMs: 25,     // ms between chunk emissions
      chunking: 'word',  // 'word' | 'character' | 'line' | 'token'
    }),
    coalesceToolInputDeltas(), // buffers tool-input-delta chunks to prevent AI SDK reducer partial-JSON re-parse freezes
  ],
});
```

`chunking: 'word'` makes the caret type at a natural reading pace; `'character'` feels more incremental but costs more re-renders (see Part 5). In Strata AI, server-side `smoothStream` (25ms delay) is paired on the client with `SmoothStreamText` (`src/components/chat/SmoothStreamText.tsx`) — a component that diffs incoming stream updates and animates newly appended token deltas with a smooth CSS opacity & blur fade-in (`animate-token-fade`, 750ms). `coalesceToolInputDeltas()` buffers `tool-input-delta` chunks server-side so the client AI SDK message reducer parses JSON once per tool call instead of $O(N \times \text{length})$ times on every token chunk.

### 2.2 Status-driven chrome

Drive the UI strictly off `chat.status` — there must be no hand-rolled "is thinking" flag. One boolean source of truth, derived:

```ts
export function ChatInput({ status, onSend, onStop }) {
  const isStreaming = status === 'streaming';
  return (
    <div className="relative">
      <textarea
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
            e.preventDefault();
            onSend(text);
          }
        }}
      />
      {/* Send button morphs into a stop button while streaming */}
      <button onClick={isStreaming ? onStop : () => onSend(text)}>
        {isStreaming ? <StopIcon /> : <SendIcon />}
      </button>
    </div>
  );
}
```

Add a **streaming caret + shimmer** to the in-flight text so users see where the stream is writing (Strata AI defines `caret`/`shimmer` keyframes in `globals.css`).

### 2.3 Auto-scroll without a single `scrollIntoView`

The reliable "stick to bottom with manual scroll override" behavior is hard to get right by hand. Use `use-stick-to-bottom` — a `ResizeObserver`/`MutationObserver` component that respects manual user scroll:

```tsx
import { StickToBottom } from 'use-stick-to-bottom';

<StickToBottom className="flex-1 min-h-0" resize="auto" initial="instant">
  {(context) => (
    <>
      <StickToBottom.Content>
        {/* message list */}
      </StickToBottom.Content>
      {!context.isAtBottom && (
        <button onClick={() => context.scrollToBottom()}>Scroll to bottom</button>
      )}
    </>
  )}
</StickToBottom>
```

Two rules Strata AI's architecture doc enforces:

- `resize="auto"` — stay pinned only when the user is already at the bottom.
- **Never** write a manual `useEffect` + `scrollIntoView` loop. It fights user scroll and double-fires during streaming. `StickToBottom` owns the DOM.

### 2.4 Reasoning / thinking streams

Open reasoning models emit their *thoughts* as a separate part type. The Strata AI UX rule:

1. **While reasoning is in progress**, show it inside a collapsible "Thought Process" accordion as **plain pre-wrapped text** (`font-mono whitespace-pre-wrap`) with a spinner.
2. **Only once thinking completes**, upgrade that block to styled `ReactMarkdown`.

Why two phases? Because a Markdown AST re-parse on every 15 ms delta is the #1 cause of stream jank — quantified in Part 5.7.

### 2.5 Stream plain text, markdown late

The active (in-flight) text part renders as cheap plain text; only *completed* parts go through `ReactMarkdown` with a memoized component map:

```tsx
{isActiveStreamingText
  ? <pre className="whitespace-pre-wrap font-sans">{text}</pre>
  : <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>}
```

When the whole bubble is finished, `React.memo` keeps it from ever re-rendering on later deltas (Part 5).

### 2.6 Group intermediate work, but only after it finishes

A multi-step agent produces a *scaffold* before the final answer: reasoning spans, tool-call cards, intermediate prose. Render it live, then collapse it the moment inference completes. Strata AI's `WorkGroupCard` (`src/components/chat/WorkGroupCard.tsx`) does exactly this:

1. **While streaming**, every part renders ungrouped and in place (`ChatBubble.tsx` returns the raw segment list) so thoughts, tool calls, and intermediate text stream chronologically with the spinner.
2. **On finish**, the bubble rebuilds its segment list and folds *all* pre-answer output — intermediate text + reasoning + tool calls — into a single collapsible "Worked for Xs" group card. Only the final text segment renders as the answer bubble.
3. The group header shows a **live elapsed timer** while working, then freezes at the larger of the measured or estimated duration (`toolCount * 1.5 + reasoningChars / 250`) for historical messages, and **auto-collapses** when the stream ends.

The two-phase memo (`isStreaming` flips the grouping decision) is the load-bearing idea: grouping is a *final render* transform, never a mid-stream one — re-flattening mid-stream would reorder parts and fight the stream.

```tsx
// ChatBubble.tsx — segment assembly
if (isStreaming) return rawSegments;                       // live, ungrouped
const workItems = hasFinalText ? rawSegments.slice(0, -1) : rawSegments;
if (workItems.length > 0) result.push({ type: 'work-group', items: workItems, key: 'work-group' });
if (hasFinalText) result.push(lastSegment);
```

> Note: this grouping only changes *layout*; the underlying message parts are untouched, so persistence (§4.4) and extraction (§4.6) stay oblivious.

---

## Part 3 — Agentic AI: Tools & Loops

The upgrade from "chatbot" to "agent": the model can **call tools**, inspect the **results**, and **loop**. Strata AI runs up to ~75 tool steps per user turn across an 8-tool workspace suite. This part builds that loop from the ground up.

### 3.1 The atomic unit: `tool()` with schemas

Every tool is `tool()` with an explicit Zod `inputSchema` and (recommended) `outputSchema`, plus an `execute` function. From `src/lib/ai/tools/workspace-tools.ts`:

```ts
import { tool } from 'ai';
import { z } from 'zod';

export function createReadFileTool({ getCurrentFiles }) {
  return tool({
    description:
      'Read full content or a specific section of a workspace file by name or ID. Always call this before making targeted edits.',
    inputSchema: z.object({
      nameOrId: z.string().describe("Filename (e.g. 'notes.md') or file ID to read."),
      section: z
        .string()
        .optional()
        .describe("Optional section heading to extract (e.g. 'Summary'). Omit to read full file."),
    }),
    outputSchema: z.object({
      exists: z.boolean(),
      name: z.string().optional(),
      content: z.string().optional(),
      error: z.string().optional(),
    }),
    execute: async ({ nameOrId, section }) => {
      const files = getCurrentFiles();
      // ... look up the file, extract section via regex, return { exists, name, content }
    },
  });
}
```

Schema discipline is what makes agents trustworthy:

- **Descriptions are instructions.** The model reads `description` and each `z.string().describe(...)` to decide how to call the tool. Write them like requirements docs.
- **`outputSchema` shapes what the model sees next.** Trimming outputs (metadata instead of full content, §3.7) shrinks the context window and steers behavior.
- **Errors go into the result, not thrown.** Return `{ exists: false, error: '...' }`; the model reads the error and retries. Throwing terminates the run.

### 3.2 The closure-context pattern (stateless routes)

The critical design question for multi-tool agents: *where does state live?* Strata AI's answer — **nowhere on the server**. The route is fully stateless:

- The client snapshots the workspace into the request body.
- The server clones it into a per-request mutable array via `createMutableWorkspace`.
- Tools receive **closures** over that array — never the array itself, never a database.
- The `writer` field (when present) lets file tools push live `data-workspace` events to the client.

```ts
// src/lib/ai/tools/types.ts
export interface WorkspaceToolsContext {
  getCurrentFiles: () => WorkspaceFile[];
  onUpdateFile: (file: WorkspaceFile) => void;
  onDeleteFile: (fileIdOrName: string) => void;
  writer?: {
    write: (part: { type: `data-${string}`; id?: string; data: any; transient?: boolean }) => void;
  };
}
```

The workspace factory lives in `src/lib/ai/workspace.ts` — it returns the `WorkspaceToolsContext` backed by one mutated array, and reuses `upsertFileIntoWorkspace` / `removeFileFromWorkspace` (also used by session-side persistence).

Wiring in the route (`src/app/api/agent/route.ts`):

```ts
// thin shell: auth -> quota -> zod -> clamp -> delegate
return runAgentResponse({
  workspace: createMutableWorkspace(parsed.data.files || []),
  messages: parsed.data.messages,
  modelId: parsed.data.model,
  thinkingLevel: parsed.data.thinkingLevel,
  maxSteps: clamp(parsed.data.maxSteps, 1, 30),
  signal: req.signal,
  remaining5h: rateLimit.remaining5h,
  remainingWeek: rateLimit.remainingWeek,
});
```

`runAgentResponse` (`src/lib/ai/agent-runner.ts`) owns every `streamText` config value — model resolution, `system` prompt, `messages`, `tools`, `abortSignal`, `smoothStream` transform, `prepareStep`, and `stopWhen` — then wraps the stream in `createUIMessageStream` (so tools can write `data-workspace` events via `writer`) and returns `createUIMessageStreamResponse` with the quota headers. It takes the `WorkspaceToolsContext` as the `workspace` param and layers a `writer` onto it.

Why this beats alternatives:

- **No `contextSchema`.** State flows through closures, so there is no cross-request persistence to reason about.
- **Scale = array ops.** Read, write, rename, delete, and cross-file invariants are all expressed as `findIndex`/`splice` over one array.
- **The request boundary is the durability boundary.** Whatever tools mutate during the stream ships back in the tool-result parts; the client reconciles (Part 4.5). Live `data-workspace` events also stream out in real time via `writer` (Part 4.6).

### 3.3 Registering the tool suite

One factory function returns the full record (barrel `src/lib/ai/tools.ts`):

```ts
export function createWorkspaceTools(context: WorkspaceToolsContext) {
  return {
    listFiles: createListFilesTool(context),
    readFile: createReadFileTool(context),
    writeFile: createWriteFileTool(context),
    editFile: createEditFileTool(context),
    renameFile: createRenameFileTool(context),
    deleteFile: createDeleteFileTool(context),
    webSearch: createWebSearchTool(),
    extractUrl: createExtractUrlTool(),
  };
}
```

Web tools (Tavily search/extract) take no context — stateless by nature. Keep tool factories split by domain: `workspace-tools.ts` vs `tavily-tools.ts`. Both share a `callTavilyApi` helper in `tavily-tools.ts` that hits the Tavily REST API directly (no SDK) with `Authorization: Bearer` header auth, per-endpoint fetch timeouts (30s search, 45s extract), and maps 401/429/432/433 responses to readable tool errors.

### 3.4 Step limits keep loops finite

A tool loop with no bound burns tokens forever. AI SDK 7's `isStepCount` stops the agent at N model-steps, and the finish reason tells the client why:

```ts
import { streamText, isStepCount } from 'ai';

const maxSteps = Math.min(Math.max(requestedMaxSteps || 25, 1), 30); // clamp 1-30

const result = streamText({
  model,
  tools,
  stopWhen: isStepCount(maxSteps),
});
```

When the limit fires, the stream ends with `finishReason === 'step-limit'` — the client sees the signal and decides what to do next (§3.5). (The old `maxSteps` option on `streamText` is gone; `stopWhen` is the v7 primitive.)

### 3.5 The auto-continuation loop

For genuinely long agent tasks, one capped run isn't enough. Strata AI chains up to **3 runs** (~75 steps) by auto-resuming: when `onFinish` reports `step-limit`, the client re-sends a continuation prompt. From `src/lib/ai/chat-reconciler.ts`:

```ts
const currentCount = continuationCountRef.current ?? 0;
if (finishReason === 'step-limit' && currentCount < 2) {
  continuationCountRef.current = currentCount + 1;
  setTimeout(() => {
    sendMessageRef.current?.({
      text: 'Please continue completing the task where you left off.',
    });
  }, 300);
} else {
  continuationCountRef.current = 0; // reset for the next user turn
}
```

Implementation notes:

- `sendMessageRef` is a ref to `chat.sendMessage` (stable, transport-safe — Part 4.7).
- The counter resets on every *user* send (`handleSendMessage` sets it to 0), so auto-continuation can never loop forever.
- The continuation text matters: "…where you left off" asks the agent to resume state from its own prior messages (the tools' closures were per-request, but the *conversation* — including the tool results — is in the message history).

### 3.6 Re-injecting the system prompt per step

Tools mutate the workspace *during* a run, but the system prompt was built *before* it. If the model's file-state view goes stale, it edits wrong files. `prepareStep` runs before every agent step and lets you rebuild the system prompt with live state (`src/lib/ai/agent-runner.ts`):

```ts
prepareStep: async ({ stepNumber }) => {
  console.log(`[agent] Preparing step ${stepNumber}. Active files: ${workspace.getCurrentFiles().length}`);
  return {
    system: buildSystemInstruction(workspace.getCurrentFiles()), // fresh metadata per step
  };
},
```

This single hook is the difference between an agent that "kind of works" and one that reliably chains `readFile → editFile → verify` across many steps.

### 3.7 System-prompt discipline: metadata, not content

Never dump file contents into the system prompt. Strata AI injects a metadata-only listing and forces the model to call `readFile` for content (`src/lib/ai/prompts.ts`):

```
Workspace Files Listing (Metadata Only):
- notes.md (markdown, 2,340/10,000 chars, id: abc123)

*Note: System prompts contain metadata only. Call `readFile` to inspect actual file contents before making edits.*
```

Costs and benefits:

- **Tokens:** a 10k-char file costs ~3k tokens if injected; its metadata costs ~20.
- **Correctness:** the model can't "hallucinate file contents from memory" if contents were never in context — it *must* read.
- **Prompt locality:** instruction weight stays high; the prompt doesn't drown in data.

The system prompt is also where **hard constraints** belong (max files, max sizes) and where the agent's **workflow protocol** is encoded (inspect → mutate → verify, as numbered directives). Give the model a numbered rule list, not prose.

Two more prompt sections Strata AI ships because the output is rendered client-side:

- **Strict GFM output rules.** Since chat replies render through `react-markdown` + `remark-gfm`, the prompt mandates valid GitHub-Flavored Markdown only — no HTML or pseudo-markdown, correct table alignment, fenced code blocks with language tags, proper task lists/strikethrough. Informing the model of the exact renderer keeps tables and lists structurally valid (§2.5's "markdown late" only works if the model emits real GFM).
- **Tone & communication section.** An explicit "be a genuinely helpful assistant" directive (`prompts.ts` §7) — name the persona, forbid vague hedging, and require honest admission of limits. Tone lives in the prompt, not in post-processing.

Both live in `src/lib/ai/prompts.ts` and are rebuilt per `prepareStep` along with the file metadata (§3.6).

### 3.8 Bonus technique: a surgical edit engine

Once agents *write*, the second-order problem appears: they clobber files. Strata AI's `ResumeEditEngine` (`src/lib/edit-engine.ts`) makes edits surgical with three escalating match strategies:

1. **Exact match** — `source.replace(searchString, replaceString)`; rejected as *ambiguous* if the search string appears more than once.
2. **Whitespace-normalized match** — line-by-line matching that ignores indentation/blank lines, tolerating drift.
3. **Anchor-matched** — matches only the first/last lines of the search within a bounded window (±5 lines), replacing the span between.

The `editFile` tool wraps the engine and reports `strategyUsed`, so the model learns *why* an edit failed and can adjust its `searchString` (the prompt mandates copying search strings verbatim from `readFile` output with 1-2 anchor lines). A surgical edit engine is the single highest-leverage quality investment for any document/code agent.

---

## Part 4 — Architecture, Providers, & Persistence

Production agents fail on three axes if you don't architect them: provider coupling, persistence shape, and request-scoped state. This part is the Strata AI answer to each.

### 4.1 The model registry

Models are data, not code. One catalog record per model (`src/lib/models.ts`):

```ts
export interface ModelOption {
  id: string;
  label: string;
  family: string;
  provider?: 'google' | 'fireworks'; // defaults to 'google'
  contextWindow: number;   // approximate context window in tokens (display metadata)
  maxOutput?: number;      // maximum output tokens when the provider publishes one
}

export const MODELS: ModelOption[] = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', family: 'Gemini 3.5', contextWindow: 131072, maxOutput: 65536 },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT', family: 'Gemma 4', contextWindow: 131072, maxOutput: 65536 },
  {
    id: 'accounts/fireworks/models/deepseek-v4-flash-0731',
    label: 'DeepSeek V4 Flash 0731',
    family: 'DeepSeek',
    provider: 'fireworks',
    contextWindow: 131072,
    maxOutput: 65536,
  },
];
```

Plus a per-model thinking-level config (`MODEL_THINKING_LEVELS`) and localStorage preference helpers. The catalog is the single source of truth that drives: the model picker UI, validation of stored preferences (`getInitialModel` only trusts ids still in the catalog), and — via the provider field — server routing.

### 4.2 The provider resolver: one seam, many providers

Rule (from AGENTS.md): **provider wiring lives ONLY in `lib/ai/providers.ts`**, imported solely by `/api/agent`. No `@ai-sdk/google`/`@ai-sdk/fireworks` import may ever reach client code.

```ts
// src/lib/ai/providers.ts
export function resolveAgentModel(modelId: string, thinkingLevel?: string): ResolvedAgentModel {
  if (getModelProvider(modelId) === 'fireworks') {
    return {
      model: fireworks(DEEPSEEK_V4_FLASH_MODEL),
      ...(effort ? { reasoning: effort } : {}),          // spread conditionally
      providerOptions: {
        fireworks: { thinking: { type: 'enabled' }, reasoningHistory: 'interleaved' },
      },
    };
  }
  return {
    model: google(modelId || DEFAULT_AGENT_MODEL),
    reasoning: thinkingLevel || 'provider-default',
    providerOptions: {
      google: { thinkingConfig: { includeThoughts: true } },
    },
  };
}
```

The agent runner consumes it generically (`src/lib/ai/agent-runner.ts`), inside the `createUIMessageStream` callback:

```ts
const resolved = resolveAgentModel(modelId, thinkingLevel);
const result = streamText({
  model: resolved.model,
  ...(resolved.reasoning !== undefined ? { reasoning: resolved.reasoning } : {}),
  ...(resolved.providerOptions ? { providerOptions: resolved.providerOptions } : {}),
  // ...
});
```

Why spread conditionally: providers reject unknown options (`Gemma models have no thinking levels — omitting the field is a hard requirement`). The resolver is the one place that knows; the route stays provider-agnostic.

### 4.3 Reasoning mapped per provider

The same app concept ("thinking level") maps differently per provider:

- **Google Gemini:** `reasoning: thinkingLevel` (values like `'minimal' | 'low' | 'medium' | 'high'`), plus `providerOptions.google.thinkingConfig.includeThoughts: true` to stream thoughts into reasoning parts.
- **Fireworks DeepSeek:** top-level `reasoning` maps to `reasoning_effort` (`low`/`high` — the model's `max` isn't expressible, so levels collapse), plus `thinking: { type: 'enabled' }` and `reasoningHistory: 'interleaved'` — the latter keeps reasoning across tool calls in agent loops.

All of this is invisible to the client, which just sends `{ model, thinkingLevel }`.

### 4.4 Persisting native UI messages (Dexie)

Persistence strategy: **store the wire format, verbatim.** Strata AI's `DBMessage` extends the SDK's `UIMessage` with only storage keys:

```ts
// src/lib/db/db.ts
export interface DBMessage extends UIMessage {
  chatId: string;
  userId?: string;   // per-user session isolation (indexed)
  timestamp: string; // ordering
}

export class ChatDatabase extends Dexie {
  constructor() {
    super('StrataAIChatDB');
    this.version(5).stores({
      conversations: 'id, userId, updatedAt, createdAt',
      messages: 'id, chatId, userId, timestamp',
    });
  }
}
```

No shape conversion, no DTOs — `messages` holds the same `parts` arrays the UI renders, so re-hydration is a one-liner: `chat.setMessages(dexieMessages)`.

Schema versioning notes:

- Every schema change is a **new `version(n)`** with a `stores()` string — IndexedDB migrates in place.
- Index only what you query (`chatId`, `userId`, `timestamp`); the workspace `files` array is embedded on the conversation row and rewritten wholesale (no per-file indexes).
- **Timestamps must be unique and ordered.** Messages persisted in a batch share an ISO-ms timestamp, so `sortBy('timestamp')` ties and falls back to random UUID order. Strata AI stamps each row with `new Date(base + idx).toISOString()` where `idx` is the message's position in the batch (`chat-reconciler.ts`), guaranteeing `sortBy('timestamp')` always reproduces true conversation order.

### 4.5 The single onFinish reconciliation point

All durable writes happen in **one place**, on `onFinish` — never during streaming. `src/lib/ai/chat-reconciler.ts`:

1. Map all messages to `DBMessage` rows (`chatId`, `userId`, `timestamp`).
2. Run a single atomic Dexie transaction:
   - `db.messages.bulkPut(allDbMessages)` — persist **every** message, not just the last;
   - bump `conversations.updatedAt`;
   - extract file deletions/updates from the **current** assistant message's tool parts (§4.6);
   - apply deletions, merge updates (replace by id or case-insensitive name, else append), write the merged array via `updateConversationFiles`.
3. Outside the transaction: the auto-continuation decision (§3.5).

Why single-point:

- **Atomicity.** If any write fails, nothing is half-persisted.
- **Determinism.** One function owns the entire filesystem-of-record merge; there's exactly one place bugs can live.
- **Separation.** Streaming UI stays ephemeral; persistence is a discrete event, not scattered effects.

### 4.6 Tool-result file extraction

The client can't trust the model's prose ("I created notes.md") — it trusts **tool results**. `src/lib/ai/message-extractor.ts` scans the tool parts of the finished message:

```ts
if (isToolUIPart(part) && part.state === 'output-available' && part.output) {
  // part.output is the tool's execute() return value
}
```

Convention: any tool returning `{ file }`, `{ files: [...] }`, or `{ deleted: true, fileId/name }` is auto-discovered. Adding a new file-mutating tool requires **zero changes** to extraction or reconciliation. This is the persistence contract — document it in your AGENTS.md.

**Live updates (separate from the replay contract):** the same tools also stream changes to the client *while* the run is still streaming. Server-side, the `writer` injected into `WorkspaceToolsContext` emits events — `writer.write({ type: "data-workspace", data: { event: "file-updated", file } })` / `{ event: "file-deleted", fileId }`. The client picks these up in `useChat`'s `onData` callback and applies them to the live workspace immediately (`src/hooks/useChatSession.ts`):

```ts
onData: (dataPart) => {
  if (dataPart?.type === 'data-workspace' && dataPart.data) {
    const { event, file, fileId } = dataPart.data;
    if (event === 'file-updated' && file) workspace.handleUpdateFile(file);
    else if (event === 'file-deleted' && fileId) workspace.handleDeleteFile(fileId);
  }
},
```

So the drawer reflects a file as *soon as* a tool writes it, rather than only after the whole inference finishes and `onFinish` reconciles. Durable persistence still happens once at `onFinish` (§4.5); the `data-workspace` events are a faster, ephemeral preview of that same state.

### 4.7 The refs-as-transport-bridge

The transport is memoized once (`useMemo` with an empty dependency list) because recreating it restarts the chat state machine. But its `body()` must read *current* model/thinking/files. The bridge: keep the live values in refs, updated by effects (`src/hooks/useChatSession.ts`):

```ts
const filesRef = useRef(workspace.files);
const modelRef = useRef(modelSettings.model);

useEffect(() => { filesRef.current = workspace.files; }, [workspace.files]);
useEffect(() => { modelRef.current = modelSettings.model; }, [modelSettings.model]);

const transport = useChatTransport({ filesRef, modelRef, /* ... */ });
// transport body(): ({ model: modelRef.current, files: filesRef.current, ... })
```

This is the canonical pattern for feeding live state into an AI SDK transport. Any new request-scoped value (a user id, a feature flag) joins the same bridge.

### 4.8 Quota via response headers

Server-enforced quotas belong on **every response**, not just failures. Strata AI returns `X-RateLimit-Remaining-5h` / `X-RateLimit-Remaining-Week` on success, and `Retry-After` + 429 on exhaustion. The transport's custom `fetch` reads them and pushes into a global quota context (`src/hooks/useChatTransport.ts`) — so the UI stays truthful in real time without polling. Patterns:

- Pre-check client-side (block send when remaining <= 0), then let the server be authoritative.
- On 429, stop the in-flight stream (`chatRef.current?.stop()`) and prune the empty trailing assistant bubble.
- The error path surfaces as a friendly assistant-style bubble, never a raw stack (Strata AI: `chat-error-handler.ts`).

### 4.9 Provider-accurate token accounting via `messageMetadata`

Rather than relying on character-based estimation heuristics, Strata AI captures real provider-reported usage attached to assistant messages via AI SDK 7's `messageMetadata` stream option (`src/lib/token-usage.ts`).

```ts
// src/lib/token-usage.ts
export interface ChatMetadata {
  usage?: LanguageModelUsage;
  modelId?: string;
}

export function computeCumulativeUsage(
  messages: Array<{ role?: string; metadata?: ChatMetadata }> | undefined
): CumulativeUsage | null {
  if (!messages || messages.length === 0) return null;
  let inputTokens = 0, outputTokens = 0, totalTokens = 0;

  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const usage = m.metadata?.usage;
    if (!usage) continue;
    inputTokens += usage.inputTokens ?? 0;
    outputTokens += usage.outputTokens ?? 0;
    totalTokens += usage.totalTokens ?? (usage.inputTokens + usage.outputTokens);
  }

  return totalTokens > 0 ? { inputTokens, outputTokens, totalTokens } : null;
}
```

The computed total is displayed in `ChatHeader.tsx` alongside the active model's context window limit (`formatTokens(totalTokens) / formatContextWindow(contextWindow) tokens (pct%)`).

---

## Part 5 — Performance Optimization Techniques

This is the payoff section: everything Strata AI learned the hard way about keeping a streaming agent session at 60 fps, even after thousands of words and dozens of tool calls.

### 5.1 The streaming re-render audit

Start with the question: **what re-renders on every stream delta, and does its cost scale with message length?**

On each 15 ms chunk, `useChat` updates `chat.messages`. Every component in the render tree that receives `messages` (or anything derived from it) re-renders. The audit checklist:

1. **Find every consumer of the messages array** (panel, bubbles, drawer, sidebar badges).
2. **Classify cost per consumer**: text render (cheap) vs `ReactMarkdown` AST parse (expensive) vs re-resolved tool UI (medium) vs Dexie `useLiveQuery` writes (only on finish — fine).
3. **Kill the quadratic term**: a length-N conversation must not do N expensive re-parses per delta.

### 5.2 The key insight: only the in-flight message is re-created

Why `React.memo` on message bubbles works at all: the AI SDK's `useChat` reducer `structuredClone`'s **only the message being updated** on each delta. Completed messages keep **reference identity** across updates.

Consequences:

- A `React.memo`'d bubble for a *finished* message sees identical `message` reference → skips entirely (O(1) cost per delta, not O(N)).
- Only the active bubble — the one actually streaming — pays per-delta render cost. That's the whole ballgame.

Verify this assumption after every SDK upgrade (the implementation detail lives in `node_modules/@ai-sdk/react/dist/index.js` — the `replaceMessage`/reducer logic). If the SDK ever clones all messages, the memo strategy breaks and you'll need selector-level memoization instead.

### 5.3 `React.memo` boundaries on hot surfaces

Wrap every hot chat surface in `React.memo`:

```tsx
export const WorkspaceDrawer = memo(function WorkspaceDrawer({ isOpen, files, ... }) { ... });
export const ChatInput = memo(function ChatInput({ onSendMessage, ... }) { ... });
export const ChatBubble = memo(function ChatBubble({ message, ... }) { ... });
export const Sidebar = memo(function Sidebar({ conversations, ... }) { ... });
```

The audit that motivated it (commit `e8eed55`): the unmemoized `WorkspaceDrawer` ran `ReactMarkdown` over the active file **on every 15 ms delta** — a length-scaled freeze hotspot. Memoizing the drawer (plus stable handlers, §5.5) made a long streaming session with an open drawer go from stutter to smooth.

**Caveat:** `React.memo` is only as good as its props' stability. If parents pass inline arrow functions, every memo dies — hence §5.5.

### 5.4 Custom comparators for streaming props

Tool-card props contain **multi-KB argument strings** (`writeFile` content) that legitimately change on every delta. A shallow prop compare fails fast and re-renders the card constantly. Strata AI's `ToolCallCard` passes a custom comparator that ignores argument identity unless the *state* transitioned:

```ts
// src/components/chat/ToolCallCard.tsx
export const areToolCallCardPropsEqual = (prev, next) => {
  if (prev.toolName !== next.toolName) return false;
  if (prev.status !== next.status) return false;
  // ignore args/result identity during streaming; only the status badge matters
  return true;
};

export const ToolCallCard = memo(function ToolCallCard(props) {
  // ...
}, areToolCallCardPropsEqual);
```

Rule of thumb: the comparator should encode **what the user sees change** (status badge, icon, summary), not what the model sent. Intermediate argument chunks are invisible — skip them.

### 5.5 Stable handlers with `useCallback`

Every `React.memo` in the app is paid for by `useCallback` at the source. The audit fixed the workspace + model handlers (`src/hooks/useWorkspaceFiles.ts`, `src/hooks/useModelSettings.ts`) and the page-level drawer/sidebar callbacks (`src/app/chat-id/[id]/page.tsx`):

```ts
const handleSelectFile = useCallback((fileId: string) => { ... }, [deps]);
const handleCloseDrawer = useCallback(() => setIsWorkspaceDrawerOpen(false), [setIsWorkspaceDrawerOpen]);
```

The pattern: hooks return stable callbacks; the page passes them straight down; presentational components memoize. No inline `onClick={() => ...}` in hot paths.

### 5.6 Memoize resolved UI with `useMemo`

Derived UI config should be computed once, not per render. The tool resolver (`src/components/chat/tools/resolver.tsx`) builds `ToolCardProps` (icon, label, accent, summary) **inside the card's own `useMemo`**, keyed on the parts that matter — so the parent list never pays for tool UI resolution:

```ts
const props = useMemo(
  () => resolveToolDisplay(part.toolInvocation),
  [part.toolInvocation.toolName, part.toolInvocation.state],
);
```

The counter-pattern that shipped first (and was removed): resolving tool display *in the parent list render* — re-resolving every card's UI for every card on every delta. Keep resolution local and memoized.

### 5.7 Plain-text segments while streaming

The single biggest per-frame win: **do not re-parse Markdown during streaming** (§2.4–2.5).

- Active text part → `<SmoothStreamText text={seg.content} isStreaming={true} />` (diffs stream updates and animates newly appended token deltas via 450ms `.animate-token-fade` CSS opacity & blur transition).
- Completed parts → `ReactMarkdown` with a **memoized components map**:

```tsx
const mdComponents = useMemo(() => ({
  h1: ({ children }) => <h1 className="text-title font-display">{children}</h1>,
  h2: ({ children }) => <h2 className="text-heading font-display">{children}</h2>,
  p: ({ children }) => <p className="text-body">{children}</p>,
  code: ({ children }) => <code className="text-micro font-mono">{children}</code>,
  // table, blockquote, li, pre-with-copy-button ...
}), []);
```

Rule: a components map passed to `ReactMarkdown` must be referentially stable (memoized), or every render re-creates the whole tree.

### 5.8 Type-system styling discipline

Tailwind's default size scale invites fragmentation (`text-[11px]` in 30 places). Strata AI defines a **semantic type scale** in `@theme` (`src/app/globals.css`):

```css
@theme {
  --text-micro: 0.6875rem;      /* 11px - eyebrows, inline code, badges */
  --text-caption: 0.75rem;      /* 12px - meta lines, tool cards, sidebar */
  --text-label: 0.875rem;       /* 14px - buttons, form labels, nav */
  --text-body: 1rem;            /* 16px - paragraphs, chat bubbles */
  --text-subheading: 1.125rem;  /* 18px - h3, section titles */
  --text-heading: 1.25rem;      /* 20px - h2, empty states */
  --text-title: 1.5rem;         /* 24px - h1 */
  --text-display: 2rem;         /* 32px - auth hero, 404 */
}
```

Conventions (documented in AGENTS.md): use tokens only; never raw size classes (`text-xs`/`text-sm`) or arbitrary `text-[10px]`; unify markdown hierarchy (h1→title, h2→heading, h3→subheading, p/li→body, code→micro, table/blockquote→caption); never attach `prose` (no typography plugin installed). Design tokens are a performance technique too — they make sweeping visual changes a two-line diff instead of a 30-file hunt.

### 5.9 Server-side tool input delta coalescing (`coalesceToolInputDeltas`)

When a model streams large tool arguments (e.g. multi-KB payloads for `writeFile` or `editFile`), AI SDK 7 emits high-frequency `tool-input-delta` SSE chunks. On the client, the SDK's message reducer executes `parsePartialJson` and `fixJson()` on *every single token chunk*. For a 5,000-character code block delivered across hundreds of chunks, this creates quadratic $\mathcal{O}(N \times L)$ parsing work that freezes the browser main thread.

Strata AI solves this by adding a custom `coalesceToolInputDeltas()` stream transform on the server (`src/lib/ai/agent-runner.ts`):

```ts
function coalesceToolInputDeltas() {
  return () => {
    const buffers = new Map<string, { delta: string; chunkCount: number; providerMetadata?: unknown }>();

    function flush(id: string, controller: TransformStreamDefaultController) {
      const entry = buffers.get(id);
      if (entry && entry.delta.length > 0) {
        controller.enqueue({
          type: "tool-input-delta",
          id,
          delta: entry.delta,
          ...(entry.providerMetadata ? { providerMetadata: entry.providerMetadata } : {}),
        });
        buffers.delete(id);
      }
    }

    return new TransformStream({
      async transform(chunk: any, controller) {
        if (chunk.type === "tool-input-delta") {
          const existing = buffers.get(chunk.id);
          if (existing) {
            existing.delta += chunk.delta;
            existing.chunkCount += 1;
          } else {
            buffers.set(chunk.id, { delta: chunk.delta, chunkCount: 1 });
          }
        } else {
          // Flush pending deltas before non-delta chunks (e.g. tool-call completion)
          if (chunk.type === "tool-call" && buffers.has(chunk.toolCallId)) {
            flush(chunk.toolCallId, controller);
          }
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        for (const id of buffers.keys()) {
          flush(id, controller);
        }
      },
    });
  };
}
```

By coalescing argument chunks per tool call before emitting SSE events, client-side partial JSON re-parsing is reduced to a single batch parse, keeping long multi-KB code streaming perfectly fluid.

### 5.10 Measure, don't guess

The full audit sequence Strata AI used (and that caught every "hotspot" claim):

1. **React DevTools Profiler** on a long streaming session — identify which components re-render per delta and their render durations. (Note: the profiler itself slows rendering; compare relative costs.)
2. **The scaling test** — a conversation with 1 vs 50 messages. Any component whose render cost grows with history is a quadratic suspect.
3. **Chrome Performance tab** — long tasks > 50 ms during streaming are frame drops; find the script that owns them.
4. **Sanity-check assumptions in the SDK source** — memo strategies live or die on implementation details like §5.2; re-verify on upgrades.

## Part 6 — Best Practices & Anti-Patterns

### 6.1 The checklist

**Server (agent route)**

- [ ] Thin route (auth → quota → zod → clamp) delegating all `streamText` config to `runAgentResponse` (`agent-runner.ts`).
- [ ] Stateless workspace via `createMutableWorkspace` closures; never persists server-side.
- [ ] Auth verified server-side (`getSession`), not just cookie-presence.
- [ ] Zod-validate the body; `maxSteps` clamped (1-30); message length enforced server-side.
- [ ] `abortSignal: req.signal` wired; `stopWhen: isStepCount` bounds the loop.
- [ ] `prepareStep` re-injects the system prompt with live state.
- [ ] Provider wiring confined to one resolver module; runner stays provider-agnostic.
- [ ] Tool errors returned in results (`{ error }`), not thrown.
- [ ] File tools stream live `data-workspace` events via injected `writer` (§4.6).

**Client**

- [ ] `useChat` status is the only source of truth for loading/streaming UI.
- [ ] `onData` handler applies live `data-workspace` file events to the workspace (§4.6).
- [ ] Memoized transport; live values via the refs bridge (§4.7).
- [ ] `React.memo` on every hot surface + stable `useCallback` handlers + custom comparators where props are large.
- [ ] Stream plain text, markdown late, memoized components map (§5.7).
- [ ] Group intermediate work only after inference finishes; render it ungrouped while streaming (§2.6).
- [ ] Auto-scroll owned by `StickToBottom`; zero manual `scrollIntoView`.
- [ ] All persistence in one `onFinish` reconciliation, atomic transaction, native `UIMessage` shape.
- [ ] Semantic design tokens only; no raw sizes/colors.

**Prompt & model**

- [ ] Metadata-only listings; the model must call `readFile` for content.
- [ ] Hard constraints and a numbered workflow protocol in the system prompt.
- [ ] `thinkingConfig.includeThoughts`-style reasoning enabled where supported; thoughts rendered per §2.4.

### 6.2 Mistakes we actually made

Every item below shipped to production and was later fixed. Learn from the receipts:

1. **Unmemoized drawer re-parsing Markdown per delta.** The classic quadratic: an open file drawer + long stream = main-thread meltdown. Fix: memo + stable handlers (commit `e8eed55`).
2. **Tool UI resolution in the parent render.** Every list delta re-resolved every card. Fix: resolve inside each card's `useMemo`, keyed on state transitions.
3. **Raw `text-[11px]` fragmentation.** 30+ spots, each a deliberate "small tweak". Fix: semantic type scale + audit greps (`text-\[1[01]px\]`) in verification.
4. **Dumping file contents into the system prompt.** Token-blowing and hallucination fuel. Fix: metadata-only listings + `readFile` discipline.
5. **`append()`-style sends on the old SDK.** Transports + `sendMessage` are the v7 way; mixing generations of the API is how subtle bugs creep in.
6. **Manual scroll effects.** Janky, fights the user, double-fires on stream start. Fix: `StickToBottom` owns the DOM, period.
7. **Trusting model prose over tool results.** "I updated notes.md" with no file change. Fix: persistence is driven by tool-result parts, never by narrative.

### 6.3 Where everything lives in Strata AI

| Concern | File |
|---------|------|
| Chat session orchestration (transport + chat + reconciler wiring) | `src/hooks/useChatSession.ts` |
| Custom transport + quota header parsing | `src/hooks/useChatTransport.ts` |
| Agent stream assembly (`runAgentResponse`: model, tools, transforms, stop cap, SSE + quota headers) | `src/lib/ai/agent-runner.ts` |
| Streaming agent route (thin auth/quota/validation shell) | `src/app/api/agent/route.ts` |
| Mutable workspace factory + file-merge helpers | `src/lib/ai/workspace.ts` |
| Provider resolver (the only provider seam) | `src/lib/ai/providers.ts` |
| Model catalog + thinking levels + context/output caps | `src/lib/models.ts` |
| Tool factories + barrel | `src/lib/ai/tools/` + `src/lib/ai/tools.ts` |
| System prompt builder (GFM rules, tone, metadata listings) | `src/lib/ai/prompts.ts` |
| Surgical edit engine | `src/lib/edit-engine.ts` |
| Dexie schema + CRUD | `src/lib/db/db.ts` |
| onFinish reconciliation | `src/lib/ai/chat-reconciler.ts` |
| Tool-result file extraction | `src/lib/ai/message-extractor.ts` |
| Memoized chat surfaces | `src/components/chat/*` (ChatBubble, SmoothStreamText, ChatInput, ToolCallCard, WorkGroupCard, resolver) |
| Confirm dialog (portal into `document.body`) | `src/components/ui/ConfirmDialog.tsx` |
| Design tokens (type scale, colors, shadows) | `src/app/globals.css` |
| Thin shell page + auto-scroll | `src/app/chat-id/[id]/page.tsx` |
| Architecture reference | `docs/SUMMARY.md` |

That's the full ladder: a streamed reply, a smooth UX, a bounded tool loop, a production architecture, and the performance discipline that keeps it all at 60 fps. Build well.
