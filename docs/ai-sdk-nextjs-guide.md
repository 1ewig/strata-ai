# Building Chatbots & Agentic AI with AI SDK 7 + Next.js 16

> The complete, beginner-to-advanced guide to building production-grade AI chat applications with the **Vercel AI SDK 7**, **Next.js 16**, and **bun**. Every technique in this guide is demonstrably shipped in **Strata AI**, the reference workspace-studio app in this repository. This guide is written against the *current* source state — the snippets are extracted verbatim from the files they cite, so they double as a grounded reference. `docs/SUMMARY.md` is the companion system-context & architecture guide; this file is the *how/why*, that one is the *what/when/where*.
>
> **Read order:** each Part is a strict superset of the last — stream a reply (Part 1), make it feel premium (Part 2), give it tools & loops (Part 3), architecture & persistence (Part 4), performance (Part 5), then keep discipline (Part 6).

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
  - [4.5 The single onFinish reconciliation point](#45-the-single-on-finish-reconciliation-point)
  - [4.6 Tool-result extraction & live `data-workspace` events](#46-tool-result-extraction--live-data-workspace-events)
  - [4.7 The refs-as-transport-bridge](#47-the-refs-as-transport-bridge)
  - [4.8 Quota via response headers](#48-quota-via-response-headers)
  - [4.9 Provider-accurate token accounting, cost tracking, & the context-window guard](#49-provider-accurate-token-accounting-cost-tracking--the-context-window-guard)
  - [4.10 SSR rate-limit hydration](#410-ssr-rate-limit-hydration)
  - [4.11 The three persistence touchpoints](#411-the-three-persistence-touchpoints)
  - [4.12 Context compaction: distill, prune, and reset the window](#412-context-compaction-distill-prune-and-reset-the-window)
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

This is a complete, opinionated walkthrough of how to build a modern AI application: a plain-text chatbot first, then a full multi-tool *agent*, then a *production* agent with a real persistence layer. It is intentionally built as a ladder — each part is a strict superset of the previous one:

1. **Part 1** streams a chat reply (chatbot).
2. **Part 2** makes it feel fast and smooth (streaming UX).
3. **Part 3** gives it tools and reasoning loops (agent).
4. **Part 4** teaches architecture, provider abstraction, and persistence (production agent).
5. **Part 5** shows the performance techniques that keep a long agentic session fluid (optimization).
6. **Part 6** is the running checklist of best practices and anti-patterns.

Everything maps to the real Strata AI codebase in this repository. Those file citations are the "answer key" — when an example here is abstracted, `src/...` shows the production version. If a snippet and the source ever disagree, **the source wins** — this is a guide over a living codebase.

### 0.2 The stack, in one picture

```
┌────────────────────────── Client (Next.js 16 App Router, 'use client') ──────────────────────────┐
│                                                                                                   │
│  useChat({ id, transport, onData, onError, onFinish })      <── @ai-sdk/react                       │
│      │                                                                                             │
│      │ DefaultChatTransport({ api: '/api/agent', body, fetch })                                     │
│      │   POST /api/agent  (SSE, UI message stream)                                                 │
└──────┼─────────────────────────────────────────────────────────────────────────────────────────────┘
       ▼
┌────────────────────────── Edge / proxy (Next.js 16 proxy.ts) ─────────────────────────────────────┐
│  config.matcher = ['/', '/chat-id/:path*', '/api/agent', '/api/agent/:path*']                     │
│  session-cookie presence check + security headers                                                  │
└──────┼─────────────────────────────────────────────────────────────────────────────────────────────┘
       ▼
┌────────────────────────── Server (Route Handler) ─────────────────────────────────────────────────┐
│  auth.api.getSession → checkAndIncrementRateLimit → zod body validation → clamp maxSteps           │
│  runAgentResponse():  resolveAgentModel → buildSystemInstruction(files)                           │
│     streamText({ model, system, messages, tools, stopWhen, experimental_transform, prepareStep })  │
│      │                                                                                             │
│      └─ createUIMessageStream({ writer }) ── toUIMessageStream() ── createUIMessageStreamResponse()  │
│             writer.write({ type: "data-workspace", ... })  → live file events                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Two facts make AI SDK 7 + Next.js 16 a great pair:

- **AI SDK 7 owns the "wire format".** Both sides speak a single protocol — a *stream of UI message deltas* (SSE). The client (`useChat`) and server (`streamText` + `toUIMessageStream`) are pieces of the same contract, so you never hand-write SSE parsing or message diffing.
- **Next.js 16 gives you one-button streaming endpoints.** Route Handlers return a `ReadableStream` trivially, `abortSignal` propagates to the HTTP request, the `proxy` export supplies middleware-style guards, and dynamic `params` are first-class promises.

### 0.3 Project setup

Initialize and install:

```
bun init -y
bun add next@16 react@19 react-dom@19
bun add ai @ai-sdk/react @ai-sdk/google
bun add zod
bun add -d @types/react @types/react-dom typescript tailwindcss @tailwindcss/postcss
bun add dexie dexie-react-hooks react-markdown remark-gfm lucide-react motion use-stick-to-bottom @supabase/supabase-js better-auth pg @ai-sdk/fireworks
```

Create `.env.local` (never commit keys; `.env.example` is the authoritative reference):

```env
# Provider keys
GOOGLE_GENERATIVE_AI_API_KEY="..."
FIREWORKS_API_KEY="..."            # required for Fireworks-hosted models (DeepSeek V4 Flash)
TAVILY_API_KEY="..."               # optional — enables the webSearch / extractUrl agent tools

# Supabase Postgres pooler (auth + rate limiting)
DATABASE_URL="postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres"

# Better Auth
BETTER_AUTH_SECRET="..."           # min 32 chars
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional default model override
NEXT_PUBLIC_GEMINI_MODEL="gemini-3.5-flash-lite"
```

This repo's exact `package.json` scripts (bun only — never `npm`/`yarn`/`npx`):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "node .next/standalone/server.js",
    "lint": "eslint .",
    "clean": "next clean",
    "db:migrate": "bun run scripts/migrate-better-auth-schema.ts",
    "db:test": "bun run scripts/test-db.ts"
  }
}
```

### 0.4 Core dependencies

From Strata AI's `package.json` — the exact versions this guide documents:

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.10 | App Router, streaming route handlers, `proxy.ts`, standalone build |
| `ai` | ^7.0.0 | `streamText`, `tool`, `smoothStream`, `isStepCount`, `convertToModelMessages`, UI-message helpers (`createUIMessageStream`, `toUIMessageStream`, `createUIMessageStreamResponse`) |
| `@ai-sdk/react` | ^2.0.0 | `useChat`, `DefaultChatTransport` |
| `@ai-sdk/google` | ^4.0.0 | Gemini + Gemma provider |
| `@ai-sdk/fireworks` | ^3.0.22 | Fireworks-hosted open-weight models (DeepSeek V4 Flash) |
| `zod` | ^4.4.3 | Schema validation for API bodies and every tool input/output |
| `dexie` / `dexie-react-hooks` | ^4 | IndexedDB for local-first persistence |
| `better-auth` | ^1.6 | Email/password sessions |
| `react-markdown` + `remark-gfm` | ^10 / ^4 | Markdown rendering in bubbles & drawer |

### 0.5 The server/client boundary in Next.js 16

The App Router `src/` layout makes the boundary physical:

- **Server code:** `app/layout.tsx` (SSR), `app/api/**/route.ts` (Route Handlers), `proxy.ts` (the Next 16 middleware replacement), and any module imported only from server files.
- **Client code:** every interactive page is marked `'use client'`. The chat page (`app/chat-id/[id]/page.tsx`) is a deliberately *thin shell* — it unwraps async params with `use(params)`, calls feature hooks, and threads everything to presentational components as props.

Two hard architectural rules (see §9 of `docs/SUMMARY.md`):

1. **Never import a client DB client (Dexie) into server code, and never import the server `pg` pool or the LLM provider SDKs (`@ai-sdk/google`/`@ai-sdk/fireworks`) into client code.** The shared seam is Zod schemas (`src/lib/schemas.ts` + the tool `types.ts`).
2. **Dynamic params are promises in Next 16.** A client page unwraps them with the `use()` React hook:

```tsx
// src/app/chat-id/[id]/page.tsx (client)
export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  // ...
}
```

Note the proxy specifically: Next 16 has replaced `middleware.ts` with **`proxy.ts`** exporting a `proxy` function plus a `config.matcher` array. Strata AI's matcher targets only the app shell and the agent API, and the proxy does a **fast cookie-presence check** (via `better-auth/cookies`' `getSessionCookie`), never a full server-side session verification (that happens, authoritatively, inside the Route Handlers):

```ts
// src/proxy.ts
export const config = {
  matcher: ["/", "/chat-id/:path*", "/api/agent", "/api/agent/:path*"],  // :path* covers /api/agent/compact
};
```

---

## Part 1 — Your First Chatbot

### 1.1 The chat model: a stream of UI messages

AI SDK 7's chat model is a **user-interface message**: a container with `id`, `role`, `text content`, and — the important part — a **`parts` array**. Every piece of a message is a part:

- `{ type: 'text', text: '...' }` — displayed text.
- `{ type: 'reasoning', reasoning: '...' }` — thinking output (§2.4).
- `{ type: 'tool-invocation', toolInvocation: { ... } }` — a tool call and/or its result (§3, §4.6).

The server and the client both work on this shape. The server *produces* a stream of these; the client *consumes* it. No custom DTO, no manual parsing, and — critically for persistence — this exact shape is stored **verbatim** in the offline database (§4.4).

### 1.2 The client: `useChat` + a transport

In AI SDK 7 the way chat connects to a backend moved from a plain `fetch` option to dedicated **transports**. `DefaultChatTransport` already wraps `fetch`; you subclass or wrap it when you need custom request bodies or response handling. The production pattern in Strata AI (`src/hooks/useChatTransport.ts`) builds a `DefaultChatTransport` that:

- posts to `/api/agent`;
- computes a **fresh `body` per request** — reading live values through refs so it never re-creates the transport (the §4.7 bridge);
- overrides `fetch` to parse the `X-RateLimit-*` response headers and report quota state (§4.8).

```ts
// src/hooks/useChatTransport.ts (abridged)
import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';

export function useChatTransport({ filesRef, modelRef, thinkingLevelRef, chatRef, updateRateLimitData, setQuotaError }) {
  return useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent',
        // body() runs per request so it can read live refs without re-creating the transport.
        body: () => ({
          model: modelRef.current,
          thinkingLevel: thinkingLevelRef.current,
          files: filesRef.current,
        }),
        fetch: async (url, options) => {
          const res = await fetch(url, options);
          const rem5h = res.headers.get('X-RateLimit-Remaining-5h');
          const remWeek = res.headers.get('X-RateLimit-Remaining-Week');
          const retryHeader = res.headers.get('X-RateLimit-Retry-After') || res.headers.get('Retry-After');
          const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : undefined;
          if (rem5h !== null && remWeek !== null) {
            updateRateLimitData({ remaining5h: parseInt(rem5h, 10), remainingWeek: parseInt(remWeek, 10), retryAfter: retryAfterSec });
          }
          if (res.status === 429) {
            const data = await res.clone().json().catch(() => null);
            setQuotaError({ message: data?.message || 'Usage quota reached...', retryAfter: retryAfterSec || data?.retryAfter });
            setTimeout(() => { if (chatRef.current?.stop) chatRef.current.stop(); }, 0);
          } else if (!res.ok) {
            const data = await res.clone().json().catch(() => null);
            throw new Error(`[API Error ${res.status}] ${data?.error || data?.message || `HTTP ${res.status}`}`);
          }
          return res;
        },
      }),
    [updateRateLimitData, setQuotaError, chatRef, filesRef, modelRef, thinkingLevelRef],
  );
}
```

Then the orchestration hook consumes `useChat` (`src/hooks/useChatSession.ts`). Keep it modular: this one hook wires the transport, the model + workspace sub-hooks, Dexie persistence, and quota gating, and returns everything a chat page needs:

```ts
// src/hooks/useChatSession.ts (abridged)
'use client';
import { useChat } from '@ai-sdk/react';

export function useChatSession(chatId: string) {
  const transport = useChatTransport({ /* refs + quota setters */ });

  const chat = useChat({
    id: chatId,                          // stable id = persisted continuation key
    transport: transport as any,
    onData: handleLiveWorkspaceEvents,   // §4.6: apply data-workspace file events immediately
    onError: handleChatError,            // §7.5/4.8: friendly error handler
    onFinish: reconcileFinishedStep,     // §4.5: single durable reconciliation point
  });

  // ... hydration effect: chat.setMessages(dexieMessages) once per chat switch
  // ... send/stop/setup handlers, quota + context-window gating
}
```

Notes on `useChat` state:

- `chat.messages` — the live, streaming message list (re-renders each delta).
- `chat.status` — `'ready' | 'submitted' | 'streaming'` (drives every visual state; never invent your own boolean).
- `chat.sendMessage({ text })` — the v7 replacement for `append`; returns a promise, but you normally do not await it.
- `chat.stop()` — aborts the in-flight request server-side via `abortSignal`.
- `chat.setMessages([...])` — used to hydrate from Dexie and to prune the empty trailing bubble on a quota error.
- `chat.reStart`/`chat.stop()` — the send/stop morph §2.2.

### 1.3 The server: `streamText` to the UI stream response

The other half of the contract. In Strata AI this lives in `src/lib/ai/agent-runner.ts` (`runAgentResponse`); `src/app/api/agent/route.ts` stays a thin auth/quota/validation shell that only delegates to it. The core shape:

```ts
import {
  streamText,
  createUIMessageStream,
  toUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  convertToModelMessages,
} from 'ai';

// inside createUIMessageStream's execute()
const result = streamText({
  model: resolvedModel.model,
  system: buildSystemInstruction(workspace.getCurrentFiles()),
  messages: await convertToModelMessages(messages),   // UI messages -> model messages
  tools, createWorkspaceTools(workspaceWithWriter),
  abortSignal: signal,
  experimental_transform: [smoothStream({ delayInMs: 25, chunking: 'word' }), coalesceToolInputDeltas()],
  stopWhen: isStepCount(maxSteps),
  prepareStep: async ({ stepNumber }) => ({ system: buildSystemInstruction(workspace.getCurrentFiles(), tokenBudget) }),
});

writer.merge(toUIMessageStream({ stream: result.stream, messageMetadata }));
return createUIMessageStreamResponse({ stream, headers: { 'X-RateLimit-Remaining-5h': ..., 'X-RateLimit-Remaining-Week': ... } });
```

Five non-obvious pieces you *must* keep:

1. **`convertToModelMessages`** — the wire shape the provider understands is not the `parts` shape. Convert both ways across the boundary.
2. **`toUIMessageStream(result.stream)`** — re-emits the model stream as UI-message deltas, the same format `useChat` consumes.
3. **`createUIMessageStreamResponse`** — wraps the stream in the SSE `Content-Type: text/plain` response, with optional extra headers (Strata AI attaches the rate-limit quota headers here).
4. **`createUIMessageStream({ execute: async ({ writer }) => { ... } })`** — wraps `streamText` so tools can emit **live custom stream events** via `writer.write(...)`, which the client handles via `useChat`'s `onData`. This is how workspace files appear/disappear live mid-stream (§4.6).
5. **`abortSignal: req.signal`** — the server half of `chat.stop()`. Skip it and stop becomes a no-op that burns tokens.

`prepareStep` re-injects a fresh system prompt before **every agent step** so the model always sees the current file state; the `messageMetadata` option attaches provider-reported usage to the finished assistant message (§4.9).

> **Thin-route rule.** The route composes `runAgentResponse` but owns none of the `streamText` configuration. Auth → rate limit → zod → clamp → delegate. Every streaming detail lives in the runner so the route stays trivially verifiable.

### 1.4 The components

Keep the components **dumb**. The page shell (`src/app/chat-id/[id]/page.tsx`) calls the hooks and passes props down; components never query Dexie, never call `getSession`, never navigate by themselves:

```tsx
const {
  displayMessages, status, isLoading, handleSendMessage, handleStop,
  files, activeFileId, handleSelectFile, ...  // from useChatSession
} = useChatSession(chatId);

return (
  <StickToBottom resize="auto" className="flex-1 min-h-0">
    {(context) => (
      <StickToBottom.Content>
        <ChatPanel messages={displayMessages} ... />
        {!context.isAtBottom && <Button onClick={() => context.scrollToBottom()}>↓</Button>}
      </StickToBottom.Content>
    )}
  </StickToBottom>
);
```

`ChatPanel` renders the message list and the empty/typing states; each message becomes a `ChatBubble` (§2.5/2.6). `ChatBubble` maps each part with a **memoized components object** so `ReactMarkdown` never re-creates the tree per render (§5.7).

**Overlays need a portal.** A modal confirmed inside a chat surface can be trapped by an ancestor with a CSS `transform` (e.g. the chat page's layout blocks), shrinking or clipping it. Strata AI's `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) renders through `createPortal(dialog, document.body)` and drives open/close with `AnimatePresence`, so the dialog always spans the real viewport. Use the same escape hatch for any fixed overlay rendered from inside transformed/animated parents.

### 1.5 Sending, status, and stopping

A finished send flow (see `handleSendMessage` in `useChatSession.ts`):

- Trim the text; only send when the status allows (`chat.status` is not actively streaming), calling `chat.stop()` first if a previous run is in-flight.
- **Quota pre-check:** if `rateLimitData.remaining5h <= 0 || remainingWeek <= 0`, set a `quotaError` instead of sending (§4.8).
- **Context-window pre-check:** if the active context occupancy has crossed the active model's window, refuse with a friendly message and disable the composer (§4.9).
- On a user's first message, **auto-title** the conversation: `trimmed.slice(0, 40) + '...'` when longer than 40 chars.
- Send: `chat.sendMessage({ text: trimmed })`; `status` flips `ready → submitted → streaming`.

Add a **character cap** (`MAX_MESSAGE_CHARS = 2000` from `src/lib/limits.ts`) mirrored on the server with a Zod/HTTP 400 — never trust the client-side `maxLength` alone. `src/lib/limits.ts` centralizes every free-tier limit (message length 2,000; per-file 10,000; workspace 50,000; conversations 5; files-per-workspace 3), the quota constants (`QUOTA_5H_LIMIT` / `QUOTA_WEEK_LIMIT` / `NEAR_LIMIT_PERCENT`), and the canonical quota-error copy (`buildQuotaError` / `buildRateLimitErrorMessage`). Limits are enforced at the call sites (textarea `maxLength`, `WorkspaceDrawer` clamping, tool schema validation) rather than through a shared "over-limit" helper.

---

## Part 2 — Streaming UX (the "non-glitchy" layer)

A working chatbot is not a *good* chatbot. The gap between "works" and "feels premium" is the experience. This part is the checklist.

### 2.1 Word-pace the stream with `smoothStream`

Providers emit tokens in bursts; unordered delivery makes the UI read as a glitchy typewriter. AI SDK 7 ships `smoothStream` as an `experimental_transform` that re-chunks output for controlled delivery. Strata AI's exact config (`src/lib/ai/agent-runner.ts`):

```ts
experimental_transform: [
  smoothStream({
    delayInMs: 25,    // ms between chunk emissions
    chunking: 'word', // 'word' | 'character' | 'line' | 'token'
  }),
  coalesceToolInputDeltas(),
],
```

Weight-conscious notes:

- `chunking: 'word'` reads as natural prose; `'character'` feels more incremental but costs more re-renders (§5).
- Strata AI pairs server-side `smoothStream` with client-side `SmoothStreamText` (`src/components/chat/SmoothStreamText.tsx`), which renders accumulated text through `ReactMarkdown` in real time with an animated streaming caret (`animate-caret`, 1.1 s blink) appended to the trailing span. No throttling or token-fade transitions are needed — the caret alone signals liveness, and `React.memo(ChatBubble)` (§5.2–5.3) keeps completed bubbles from re-rendering.

### 2.2 Status-driven chrome

Drive the UI strictly off `chat.status` — there must be no hand-rolled "is thinking" flag:

```ts
const isStreaming = status === 'streaming';
const isSubmitted = status === 'submitted';
const isLoading = (status === 'streaming' || status === 'submitted') && !quotaError;
// Send button morphs into a stop button while streaming
<button onClick={isStreaming ? onStop : () => onSendMessage(text)}>
  {isStreaming ? <StopIcon /> : <SendIcon />}
</button>
```

Strata AI ships a **streaming shimmer** (`animate-shimmer`) sweeping across the newest bubble and a caret (`animate-caret`) in the in-flight text. The typing loader and the shimmer **must** be derived from `status`, not a separate boolean — one source of truth.

### 2.3 Auto-scroll without a single `scrollIntoView`

Use `use-stick-to-bottom` — a `ResizeObserver`/`MutationObserver` component that respects manual user scroll. The page wraps the panel:

```tsx
<StickToBottom className="flex-1 min-h-0" resize="auto" initial="instant">
  {(context) => (
    <>
      <StickToBottom.Content className="max-w-4xl w-full mx-auto px-4 pb-36">
        <ChatPanel ... />
      </StickToBottom.Content>
      {!context.isAtBottom && (
        <button onClick={() => context.scrollToBottom()}>↓ Scroll to bottom</button>
      )}
    </>
  )}
</StickToBottom>
```

Two rules enforced by AGENTS.md:

- `resize="auto"` — only stay pinned when the user is already at the bottom.
- **Never** write a manual `useEffect` + `scrollIntoView` loop. It fights user scroll and double-fires during streaming. `StickToBottom` owns the DOM.

### 2.4 Reasoning / thinking streams

Open reasoning models emit their *thoughts* as a separate part type. The Strata AI UX rule:

1. **While reasoning is in progress**, render the thought text inside a collapsible "Thought Process" accordion as **plain pre-wrap text** (`font-mono whitespace-pre-wrap`) with a spinner, and a live clock ("Thinking...") or a fixed "Thought for X s".
2. **Only once thinking completes**, upgrade that block to styled `ReactMarkdown`.

Why two phases? Because re-parsing a Markdown AST on every 15 ms delta is a top cause of stream jank — quantified in §5.7. `ThoughtAccordion` (`src/components/chat/ThoughtAccordion.tsx`) is fed `isStreaming={isStreaming && isLastSegment}` so the in-flight thought stays cheap.

### 2.5 Live Markdown via SmoothStreamText

The active (in-flight) text part renders formatted Markdown via `SmoothStreamText`, which simply wraps `ReactMarkdown` and appends a streaming caret; completed parts fall back to plain `ReactMarkdown` with a memoized component map. From `src/components/chat/ChatBubble.tsx`:

```tsx
{isActiveStreamingText ? (
  <SmoothStreamText text={seg.content} isStreaming={true} components={markdownComponents} />
) : (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {seg.content}
  </ReactMarkdown>
)}
```

When the whole bubble is finished, `React.memo(ChatBubble)` (§5.2–5.3) keeps it from re-rendering on later deltas. The `markdownComponents` object must be referentially stable (`useMemo` keyed on the copy-state only) or every render re-creates the whole tree (§5.7).

### 2.6 Group intermediate work, but only after it finishes

A multi-step agent produces a *scaffold* before the final answer: reasoning spans, tool-call cards, intermediate prose. Render it live, then collapse it the instant inference completes. `WorkGroupCard` (`src/components/chat/WorkGroupCard.tsx`) does exactly this:

1. **While streaming**, `ChatBubble` returns every segment **ungrouped and in place**, so thoughts, tool-calls, and intermediate text stream chronologically with the spinner.
2. **On finish**, the memo recomputes and folds *all* pre-answer output into a **single collapsible "Worked for Xs" card**. Only the final text segment renders as the answer bubble.
3. The group header shows a **live elapsed timer** while working (`setInterval` per second; `Working (Xs)` label with a trailing spinner), then freezes at the larger of measured vs. estimated duration (`toolCount * 1.5 + reasoningChars / 250`), and **auto-collapses** when the stream ends.

The two-phase decision — grouping is a **final render transform**, never a mid-stream one — is the load-bearing idea. Re-flattening mid-stream would reorder parts and fight the stream:

```tsx
// ChatBubble.tsx — segment assembly (trimmed)
if (isStreaming) return rawSegments;                                  // live, ungrouped
const workItems = hasFinalText ? rawSegments.slice(0, -1) : rawSegments;
if (workItems.length > 0) result.push({ type: 'work-group', items: workItems, key: 'work-group' });
if (hasFinalText) result.push(lastSegment);
```

This grouping only changes *layout*; the underlying message parts are untouched, so persistence (§4.4) and extraction (§4.6) stay oblivious.

---

## Part 3 — Agentic AI: Tools & Loops

The upgrade from "chatbot" to "agent": the model **calls tools**, **reads results**, and **loops**. Strata AI runs up to ~75 tool steps per user turn across an 8-tool workspace suite. This part builds that loop from the ground up.

### 3.1 The atomic unit: `tool()` with schemas

Every tool is `tool()` with an explicit Zod `inputSchema` and (recommended) `outputSchema`, plus an `execute` function. From `src/lib/ai/tools/workspace-tools.ts`:

```ts
import { tool } from 'ai';
import { z } from 'zod';

// createReadFileTool({ getCurrentFiles })
return tool({
  description: 'Read full content or a specific section of a workspace file by name or ID. Always call this before making targeted edits.',
  inputSchema: z.object({
    nameOrId: z.string().describe("Filename (e.g. 'notes.md', 'todo.md') or file ID to read."),
    section: z.string().optional().describe("Optional section heading to extract (e.g. 'Professional Summary'). Omit to read full file."),
  }),
  outputSchema: z.object({
    exists: z.boolean(),
    name: z.string().optional(),
    section: z.string().optional(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ nameOrId, section }) => { /* ... */ },
});
```

Schema discipline is what makes agents trustworthy:

- **Descriptions are instructions.** The model reads `description` and each `z.string().describe(...)` to decide how to call the tool. Write them like a requirements doc.
- **`outputSchema` shapes what the model sees next.** Trim outputs to metadata where possible (§3.7).
- **Errors go into the result, not thrown.** Return `{ exists: false, error: '...' }`; the model reads the error and retries. *Throwing* terminates the run — Strata AI reserves `throw` for hard, unrecoverable rules (e.g. writing past the per-workspace file count cap).

### 3.2 The closure-context pattern (stateless routes)

The critical design question for multi-tool agents: *where does state live?* Strata AI's answer — **nowhere on the server**. The route is fully stateless:

- The client snapshots the workspace into the request body.
- The server clones it into a per-request mutable array via `createMutableWorkspace`.
- Tools receive **closures** over that array via a `WorkspaceToolsContext` — never the array itself, never a database.
- An optional `writer` lets file tools push live `data-workspace` events to the client (§4.6).

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

The factory & merge helpers live in `src/lib/ai/workspace.ts` — `createMutableWorkspace(initialFiles)` returns a `WorkspaceToolsContext` backed by one mutated array, reusing `upsertFileIntoWorkspace` / `removeFileFromWorkspace` (also used by session-side persistence in §4.5/§4.6):

```ts
// src/lib/ai/workspace.ts (abridged)
export function createMutableWorkspace(initialFiles: WorkspaceFile[] = []): WorkspaceToolsContext {
  const files: WorkspaceFile[] = initialFiles;
  return {
    getCurrentFiles: () => files,
    onUpdateFile: (file) => { /* findIndex by id or case-insensitive name, else push */ },
    onDeleteFile: (fileIdOrName) => { /* splice matching entries */ },
  };
}
```

The route wires it (thin shell: auth → quota → validate → clamp → delegate):

```ts
// src/app/api/agent/route.ts
return runAgentResponse({
  workspace: createMutableWorkspace((parsed.data.files as WorkspaceFile[]) || []),
  messages: parsed.data.messages,
  modelId: parsed.data.model,
  thinkingLevel: parsed.data.thinkingLevel,
  maxSteps: Math.min(Math.max(maxSteps || 25, 1), 30),   // clamp 1-30
  signal: req.signal,
  remaining5h: rateLimit.remaining5h,
  remainingWeek: rateLimit.remainingWeek,
});
```

Why this beats the alternatives:

- **No cross-request state to reason about.** State IS the request body (plus the per-request closure).
- **Scale = array ops.** Read/write/rename/delete and invariants express as `find`/`splice` over one array.
- **The request boundary is the durability boundary.** Whatever tools mutate during the stream ships back as tool-result parts; the client reconciles (§4.5). Live `data-workspace` events also stream out in real time via `writer` (§4.6).

### 3.3 Registering the tool suite

One factory returns the full record (barrel `src/lib/ai/tools.ts`):

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

The six workspace tools take the context; the two web tools (`webSearch`, `extractUrl`) are stateless by nature. They live split by domain — `workspace-tools.ts` vs `tavily-tools.ts` — sharing a `callTavilyApi` REST helper (no SDK) with `Authorization: Bearer` header auth, per-endpoint fetch timeouts (30 s search, 45 s extract), and mapping of 400/401/429/432/433 responses into readable tool errors (parsing multi-shape error payloads — `detail.error`, `error.message`, a plain `detail`/`message` string).

`webSearch` supports `includeAnswer` (bool or `"basic"`/`"advanced"` — requests an AI-synthesized answer summary in the result's `answer` field), `topic` (`general`/`news`/`finance`) plus `timeRange`/`days` for recency, and `includeDomains`/`excludeDomains` to scope authoritative sources. `extractUrl` supports an optional `query` for intent-based section extraction and reranking of large pages, `chunksPerSource` (1–5) to cap snippets, and `format` (`markdown`/`text`); it auto-normalizes URLs via `normalizeUrl` (prepends `https://`) and returns `success: false` with per-URL errors when every target fails. The full schema table lives in `docs/SUMMARY.md` §7.1.

### 3.4 Step limits keep loops finite

A tool loop with no bound burns tokens forever. AI SDK 7's `isStepCount` stops the agent at N model steps, and the finish reason tells the client why (triggering the auto-continuation chain of up to 3 capped runs, §3.5):

```ts
import { streamText, isStepCount } from 'ai';
const maxSteps = Math.min(Math.max(requestedMaxSteps || 25, 1), 30); // clamp 1-30
const result = streamText({ model, tools, stopWhen: isStepCount(maxSteps), /* ... */ });
```

When the limit fires, the stream ends with `finishReason === 'step-limit'`. (The legacy integer `maxSteps` option on `streamText` is gone; `stopWhen` is the v7 primitive.)

The route clamps to `1..30`; the route's default is 25 and the auto-continuation can chain up to 2 more passes for ~75 steps total.

### 3.5 The auto-continuation loop

For long agent tasks one capped run isn't enough. Strata AI chains up to **3 runs** (~75 steps) by auto-resuming: when `onFinish` reports `step-limit`, the client re-sends a continuation prompt. From `src/lib/ai/chat-reconciler.ts`:

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

- `sendMessageRef` is a ref to `chat.sendMessage` (stable, §5.5).
- The counter resets on every *user* send (`handleSendMessage` sets it to 0), so auto-continuation can never loop forever.
- The continuation text matters: "…where you left off" asks the agent to resume from its own prior messages (the tool closures were per-request, but the *conversation* — including the tool results — is in the message history it already has).

### 3.6 Re-injecting the system prompt per step

Tools mutate the workspace *during* a run, but the system prompt was built *before* it. If the model's file-state view goes stale, it edits wrong files. `prepareStep` runs before every step and rebuilds the system prompt with live state — and now also with the token budget (§4.9):

```ts
// src/lib/ai/agent-runner.ts
prepareStep: async ({ stepNumber }) => {
  return {
    system: buildSystemInstruction(workspace.getCurrentFiles(), tokenBudget),
  };
},
```

This is the difference between an agent that "kind of works" and one that reliably chains `readFile → editFile → verify` across many steps.

### 3.7 System-prompt discipline: metadata, not content

Never dump file contents into the system prompt. `src/lib/ai/prompts.ts` injects a metadata-only listing and forces the model to call `readFile` for content:

```
Workspace Files Listing (Metadata Only):
- notes.md (markdown, 2,340/10,000 chars, id: abc123)

*Note: System prompts contain metadata only. Call `readFile` to inspect actual file contents before making edits.*
```

- **Tokens:** a 10k-char file costs ~3k tokens injected; its metadata costs ~20.
- **Correctness:** the model cannot "recall file contents from memory" it never saw — it *must* read.
- **Prompt locality:** instruction weight stays high; the prompt doesn't drown in data.

The prompt also carries **hard constraints** (max files, max sizes — from `src/lib/limits.ts`) and a **numbered workflow protocol** (inspect → mutate → verify), a strict **GFM output-rule section** (since replies render through `react-markdown` + `remark-gfm`, the model must emit valid GFM: tables, task lists, fenced code with language tags), and an explicit **tone & persona section**. Two sections worth calling out:

- **Context & Token Budget** (new): `buildSystemInstruction(files, tokenBudget)` appends the active context occupancy (`active.totalTokens` / `remainingTokens` / `percentUsed`) and the active model's context window, so the model sizes replies accordingly. When usage is past 80% of the window, it adds a directive to "be concise" and proactively suggest a new chat. The budget is recomputed each `prepareStep` (so it stays current) and initially injected into the first `system` call too.
- **Streamed live workspace hint:** the same `writer` used by tools is passed to the tools list so edits stream out live.

### 3.8 Bonus technique: a surgical edit engine

Once agents *write*, the second-order problem appears: they clobber files. Strata AI's `StringEditEngine` (`src/lib/edit-engine.ts`) makes edits surgical with three escalating match strategies:

1. **Exact match** — `source.replace(searchString, replaceString)`; rejected as *ambiguous* if the string occurs more than once, forcing a richer `searchString`.
2. **Whitespace-normalized match** — line-by-line matching that ignores indentation/blank lines, tolerating drift.
3. **Anchor-matched** — matches only the first/last search lines within a bounded window (up to 5 extra lines between anchors), replacing the span.

Each strategy that does *not* give a unique match returns a descriptive error the model can act on. `applyEdit` reports `strategyUsed` (`'exact' | 'whitespace-normalized' | 'anchor-matched'`), and the `createEditFileTool` wraps it — echoing the strategy in its result so the model learns *why* an edit succeeded. The prompt mandates copying search strings verbatim from `readFile` output with 1–2 anchor lines.

The `createEditFileTool` also applies hard limits *after* producing new content: reject if the resulting single file exceeds `MAX_FILE_CHARS` or the whole workspace would exceed `MAX_WORKSPACE_TOTAL_CHARS`. A surgical edit engine is the single highest-leverage quality investment for a document/code agent.

---

## Part 4 — Architecture, Providers, & Persistence

Production agents fail on three axes if you don't architect them: provider coupling, persistence shape, and request-scoped state. This is the Strata AI answer to each.

### 4.1 The model registry

Models are data, not code. One catalog record per model (`src/lib/models.ts`):

```ts
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
  currency: string;
}

export interface ModelOption {
  id: string;
  label: string;
  family: string;
  provider?: 'google' | 'fireworks'; // defaults to 'google'
  contextWindow: number;   // approximate context window in tokens
  maxOutput?: number;      // max output tokens when the provider publishes one
  pricing?: ModelPricing;  // USD per 1M tokens, used for cost tracking (§4.9)
}

export const MODELS: ModelOption[] = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', family: 'Gemini 3.5', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.30, outputPerMillion: 2.50, cachedInputPerMillion: 0.075, currency: 'USD' } },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', family: 'Gemini 3.1', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.25, outputPerMillion: 1.50, cachedInputPerMillion: 0.0625, currency: 'USD' } },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', family: 'Gemini 3', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.50, outputPerMillion: 3.00, cachedInputPerMillion: 0.125, currency: 'USD' } },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT', family: 'Gemma 4', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.14, outputPerMillion: 0.35, currency: 'USD' } },
  { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT', family: 'Gemma 4', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.07, outputPerMillion: 0.34, currency: 'USD' } },
  { id: 'accounts/fireworks/models/deepseek-v4-flash-0731', label: 'DeepSeek V4 Flash 0731', family: 'DeepSeek', provider: 'fireworks', contextWindow: 131072, maxOutput: 65536, pricing: { inputPerMillion: 0.14, outputPerMillion: 0.28, cachedInputPerMillion: 0.028, currency: 'USD' } },
];
```

Plus, per `src/lib/models.ts`:
- `MODEL_THINKING_LEVELS` — `{ levels, defaultLevel }` per model:
  - Gemini 3.5 Flash Lite: minimal / low / medium / high (default **low**).
  - Gemini 3.1 Flash Lite: minimal / high (default **minimal**).
  - Gemini 3 Flash Preview: minimal / low / medium / high (default **high**).
  - DeepSeek V4 Flash: **low / high** (default **high**) — `max` effort is unrepresentable via the SDK, so levels collapse onto low/high.
  - **Gemma 4**: *none* — the resolver must omit the reasoning field entirely (see §4.3).
- `getInitialModel()` / `saveModelPreference()` / `getStoredThinkingLevel()` — localStorage helpers. `getInitialModel` only trusts a stored id still in the catalog, falling back to `NEXT_PUBLIC_GEMINI_MODEL` then `gemini-3.5-flash-lite`.
- `getValidThinkingLevelForModel(modelId, level)` — clamps a chosen level to a model's allowed set, else returns the default.
- `getModelPricing(modelId)` — resolves `ModelPricing` for a model id, falling back to Gemini 3.5 Flash Lite rates for unknown ids. The same pricing block is mirrored in `metadata.json`'s `supportedModels` so the extension manifest and the app catalog never drift.

The catalog is the single source of truth that drives the model picker UI (`ModelSelectorMenu`), validation of stored preferences, and — via the `provider` field — server routing (`resolveAgentModel`, §4.2). The default model falls back to `NEXT_PUBLIC_GEMINI_MODEL`, then `gemini-3.5-flash-lite`. Conversation-level state (`conversations.model` / `thinkingLevel`) wins over stored preferences on load (`useModelSettings`).

### 4.2 The provider resolver: one seam, many providers

**Rule:** provider wiring lives ONLY in `src/lib/ai/providers.ts`, imported solely by the agent path. No `@ai-sdk/google` / `@ai-sdk/fireworks` import may ever reach client code (`resolveAgentModel`, `getModelProvider` are the entire provider surface):

```ts
// src/lib/ai/providers.ts
export function resolveAgentModel(modelId: string, thinkingLevel?: string): ResolvedAgentModel {
  if (getModelProvider(modelId) === 'fireworks') {
    const effort = DEEPSEEK_EFFORT[thinkingLevel || ''];   // minimal/low -> low; medium/high -> high
    return {
      model: fireworks(DEEPSEEK_V4_FLASH_MODEL),                              // DeepSeek V4 Flash 0731
      ...(effort ? { reasoning: effort } : {}),
      providerOptions: {
        fireworks: {
          thinking: { type: 'enabled' },
          reasoningHistory: 'interleaved',   // keep reasoning across tool calls in agent loops
        },
      },
    };
  }
  return {
    model: google(modelId || DEFAULT_AGENT_MODEL),   // DEFAULT_AGENT_MODEL = gemini-3.5-flash-lite
    reasoning: thinkingLevel || 'provider-default',
    providerOptions: {
      google: { thinkingConfig: { includeThoughts: true } },
    },
  };
}
```

The runner consumes it generically inside the `createUIMessageStream` callback:

```ts
const resolvedModel = resolveAgentModel(modelId, thinkingLevel);
const result = streamText({
  model: resolvedModel.model,
  ...(resolvedModel.reasoning !== undefined ? { reasoning: resolvedModel.reasoning } : {}),
  ...(resolvedModel.providerOptions ? { providerOptions: resolvedModel.providerOptions } : {}),
  // ...
});
```

Why spread conditionally? Because **providers reject unknown options** aggressively (Gemma accepts no thinking config). The resolver is the one place that knows per-provider; the route and the UI stay provider-agnostic.

**Cross-provider metadata is also sanitized server-side.** When a conversation switches providers (e.g. Gemini thoughts followed by a DeepSeek turn), the persisted `providerMetadata` / `callProviderMetadata` / `resultProviderMetadata` from the *other* provider would be re-emitted into the next payload — and Fireworks rejects unknown extra inputs ("Extra inputs are not permitted"). `sanitizeMessagesForProvider(messages, provider)` in `src/lib/ai/agent-runner.ts` strips any provider metadata that doesn't belong to the active provider before `convertToModelMessages`. The runner calls it for both the agent and compaction paths.

### 4.3 Reasoning mapped per provider

The same app concept ("thinking level") maps differently per provider:

- **Google Gemini:** `reasoning: thinkingLevel` (e.g. `minimal|low|medium|high`), with `providerOptions.google.thinkingConfig.includeThoughts: true` to stream thoughts into reasoning parts.
- **Fireworks DeepSeek:** top-level `reasoning` maps to the provider `reasoning_effort` (`low`/`high`, via the `DEEPSEEK_EFFORT` map — `max` is not expressible), plus `providerOptions.fireworks.thinking { type: 'enabled' }` and `reasoningHistory: 'interleaved'` (keeps reasoning between tool calls in agent loops).

The provider's reasoning tokens arrive as native `reasoning` parts and feed the same `ThoughtAccordion` as Google's thoughts (§2.4). The client sends only `{ model, thinkingLevel }`; the mapping is entirely server-side.

### 4.4 Persisting native UI messages (Dexie)

Persistence strategy: **store the wire format, verbatim**. `DBMessage` extends the SDK's `UIMessage` with only storage keys (`src/lib/db/db.ts`):

```ts
export interface DBMessage extends UIMessage {
  chatId: string;
  userId?: string;    // per-user session isolation (indexed)
  timestamp: string;  // ordering
}

export class ChatDatabase extends Dexie {
  constructor() {
    super('StrataAIChatDB');
    // v4 base; v5 adds the userId index for per-user isolation.
    this.version(4).stores({ conversations: 'id, updatedAt, createdAt', messages: 'id, chatId, timestamp' });
    this.version(5).stores({ conversations: 'id, userId, updatedAt, createdAt', messages: 'id, chatId, userId, timestamp' });
  }
}
```

No shape conversion, no DTOs — `messages` holds the same `parts` arrays the UI renders, so re-hydration is a one-liner: `chat.setMessages(dexieMessages)` in `useChatSession`.

Schema-versioning notes:

- Every change is a new `version(n)` with a `stores()` string; IndexedDB migrates in place.
- Index only what you query (`chatId`, `userId`, `timestamp`); the workspace `files` array is embedded on the conversation row and rewritten wholesale (no per-file indexes).
- **Timestamps must be unique and ordered.** Messages persisted in a batch share an ISO-ms wall-clock timestamp, so `sortBy('timestamp')` could tie and fall back to random UUID order. The reconciler stamps each row with `base + idx`, guaranteeing stable order (`§4.5`):

```ts
const base = Date.now();
const dbMessages = allMessages.map((msg, idx) => ({
  ...msg, chatId, ...(userId ? { userId } : {}),
  timestamp: new Date(base + idx).toISOString(),
}));
```

### 4.5 The single onFinish reconciliation point

All durable writes happen in **one place**, on `onFinish` — never during streaming. `src/lib/ai/chat-reconciler.ts`:

1. Map all messages to `DBMessage` rows (`chatId`, `userId`, position-derived `timestamp`).
2. Run a **single atomic Dexie transaction** (`db.transaction('rw', [db.messages, db.conversations], ...)`:
   - `db.messages.bulkPut(dbMessages)` — persist **every** message, not just the last;
   - bump `conversations.updatedAt`;
   - extract file deletions + updates from the **current** assistant message's tool parts (§4.6);
   - apply deletions (`removeFileFromWorkspace`), merge updates (`upsertFileIntoWorkspace` — replace by id or case-insensitive name, else append), write the merged array via `updateConversationFiles`, and reset the active file.
3. Outside the transaction, resolve the auto-continuation decision (§3.5).

Why single-point:

- **Atomicity.** If any write fails, nothing is half-persisted.
- **Determinism.** One function owns the entire file-state merge; there is exactly one place bugs can live.
- **Separation.** Streaming UI stays ephemeral; persistence is a discrete event.

### 4.6 Tool-result file extraction & live `data-workspace` events

The client cannot trust the model's prose ("I created notes.md") — it trusts **tool results**. `src/lib/ai/message-extractor.ts` scans the tool parts of the finished message and pulls out any result carrying `{ file }`, `{ files: [...] }`, or `{ deleted: true, fileId/name }`:

```ts
if (isToolUIPart(part) && part.state === 'output-available' && part.output) {
  // part.output is the tool's execute() return value
}
```

Convention: **any** tool returning those keys is auto-discovered — adding a new file-mutating tool requires zero changes to extraction or reconciliation. The client then merges them into `conversation.files` (§4.5).

**Live updates (separate channel):** the same tools also stream changes to the client *while the run is still streaming*. Server-side, the `writer` injected into the `WorkspaceToolsContext` emits events — for example the write/edit/rename tools call `writer.write({ type: "data-workspace", data: { event: "file-updated", file } })` and the delete tool `writer.write({ type: "data-workspace", data: { event: "file-deleted", fileId, name } })`. The client, in `useChat`, subscribe via `onData`:

```ts
onData: (dataPart) => {
  if (dataPart?.type === 'data-workspace' && dataPart.data) {
    const { event, file, fileId } = dataPart.data;
    if (event === 'file-updated' && file) workspace.handleUpdateFile(file);
    else if (event === 'file-deleted' && fileId) workspace.handleDeleteFile(fileId);
  }
},
```

So the drawer reflects a file *as soon as* a tool writes it, rather than waiting for the whole inference run to finish and `onFinish` to reconcile. Durable persistence still happens once at `onFinish`; the `data-workspace` events are a faster, ephemeral preview of that same state.

### 4.7 The refs-as-transport-bridge

The transport is memoized once (`useMemo`) because re-creating it restarts the chat state machine. But its `body()` must read *current* model/think/file values. The bridge: keep live values in refs, updated by effects, and read them lazily in `body()` (`src/hooks/useChatSession.ts` + `useChatTransport`):

```ts
const modelRef = useRef(modelSettings.model);
const thinkingLevelRef = useRef(modelSettings.thinkingLevel);
const filesRef = useRef(workspace.files);

useEffect(() => { filesRef.current = workspace.files; }, [workspace.files]);
useEffect(() => { modelRef.current = modelSettings.model; }, [modelSettings.model]);
useEffect(() => { thinkingLevelRef.current = modelSettings.thinkingLevel; }, [modelSettings.thinkingLevel]);

const transport = useChatTransport({ filesRef, modelRef, thinkingLevelRef, /* ... */ });
// transport body(): ({ model: modelRef.current, thinkingLevel: thinkingLevelRef.current, files: filesRef.current })
```

This is the canonical pattern for feeding live state into an AI SDK transport. Any new request-scoped value (a user id, a flag) would join the same bridge.

### 4.8 Quota via response headers

Server-enforced quotas belong on **every response**, not just failures. Strata AI returns `X-RateLimit-Remaining-5h` / `X-RateLimit-Remaining-Week` on success, and `Retry-After` + 429 on exhaustion. The transport's `fetch` reads them and pushes into a global quote context (`useChatTransport` → `RateLimitContext`), so the UI stays truthful in real time without polling. Key patterns:

- **Pre-check client-side** (block send when `remaining <= 0`), then let the server be authoritative (a DB-backed sliding-window limiter in `src/lib/rate-limit.ts`, writing to a `better_auth.message_log` table).
- On **429**, stop the in-flight stream (`chatRef.current?.stop()`) and prune the empty trailing assistant bubble via an effect in `useChatSession`.
- **Friendly error surface:** `src/lib/ai/chat-error-handler.ts` maps `Failed to fetch`/network/401/400/429 patterns to clean assistant-style copy and replaces the pending bubble — no raw stack, and it persists the corrected message list to Dexie with position-derived timestamps.

### 4.9 Provider-accurate token accounting, cost tracking, & the context-window guard

Rather than estimate tokens by characters, Strata AI captures **real provider-reported usage** and attaches it to the finished assistant message via AI SDK 7's `messageMetadata`. Every assistant turn carries three pieces of metadata, from `src/lib/ai/agent-runner.ts`:

```ts
let lastStepUsage: LanguageModelUsage | undefined;

const result = streamText({
  // ...
  onStepEnd({ stepNumber, toolCalls, usage }) {
    if (usage) lastStepUsage = usage;        // final step's usage = active context snapshot
  },
  // ...
});

writer.merge(
  toUIMessageStream({
    stream: result.stream,
    messageMetadata: ({ part }) => {
      if (part.type === 'finish') {
        return {
          usage: lastStepUsage || part.totalUsage,   // active context window occupancy
          stepTotalUsage: part.totalUsage,           // aggregate across multi-step passes
          modelId: modelId || 'gemini-3.5-flash-lite',
        };
      }
      return undefined;
    },
  })
);
```

- **`usage`** (`lastStepUsage`): the final step's usage — following the Claude Code / OpenCode / Codex standard, this is the **active context window** snapshot. Because the provider's input-token figure already encapsulates the full conversation history + system prompt, summing *every* multi-step pass would inflate the guard O(N)-style; recording only the last landed step keeps the meter truthful.
- **`stepTotalUsage`** (`part.totalUsage`): the aggregate execution volume across all tool passes in that turn. Used for **session** analytics and **per-model cost** (multi-step turns burn API tokens N times, so cost uses this, not the active snapshot).
- **`modelId`**: which catalog model produced the turn, so per-model cost can be attributed correctly even when models switch mid-conversation.

`src/lib/token-usage.ts` folds all of that into three aggregated structures — active context, session totals, and dollar cost grouped by model:

```ts
export interface ChatMetadata { usage?: LanguageModelUsage; stepTotalUsage?: LanguageModelUsage; modelId?: string; }

export interface ActiveContextUsage {
  inputTokens: number; outputTokens: number; totalTokens: number;
  percentUsed: number;           // 0 - 100
  remainingTokens: number;       // contextWindow - totalTokens
}
export interface SessionTokenUsage {
  totalOutputTokens: number; totalApiTokens: number; turnCount: number;
}
export interface ModelUsageStats {
  modelId: string; modelLabel: string; turnCount: number;
  inputTokens: number; outputTokens: number; totalTokens: number;
  apiTokens: number; cost: number;
}
export interface ConversationTokenMetrics {
  active: ActiveContextUsage;
  session: SessionTokenUsage;
  totalCost: number;                 // summed across turns & models
  modelsUsed: string[];
  modelBreakdowns: ModelUsageStats[];
  inputTokens: number; outputTokens: number; totalTokens: number;  // aliases → active
}

export function calculateTokenCost(modelId, inputTokens, outputTokens): number {
  const pricing = getModelPricing(modelId);
  return (inputTokens / 1_000_000) * pricing.inputPerMillion
       + (outputTokens / 1_000_000) * pricing.outputPerMillion;
}
export function formatCost(cost: number): string {
  // '$0.00' | '<$0.0001' | '$0.0014' | '$0.123'
}

export function calculateTokenMetrics(messages, contextWindow = 131072): ConversationTokenMetrics | null {
  // walks assistant turns; `latestUsage = usage` keeps the LAST turn's snapshot as `active`
  // while accumulating session totals AND per-model buckets keyed by metadata.modelId,
  // computing each turn's cost from stepTotalUsage (execution volume, not the snapshot);
  // returns null until real provider usage exists (activeTotal <= 0)
}
```

The `active` block is the live context meter, the `modelBreakdowns` array feeds the cost UI, and the top-level `inputTokens`/`outputTokens`/`totalTokens` aliases keep old callers working.

The header (`src/components/chat/ChatHeader.tsx`) shows a compact, live **active-context meter**: `Context window: formatTokens(active.totalTokens) / formatContextWindow(contextWindow)`. Clicking/tapping it opens the separated **`TokenUsagePopover`** (`src/components/chat/TokenUsagePopover.tsx`) — a compact card with a visual context-usage progress bar, input/output split, total session tokens, the total estimated cost (`formatCost(totalCost)`), and a per-model cost breakdown. It dismisses on outside click/tap via a transparent backdrop plus `mousedown`/`touchstart` listeners that ignore the trigger button.

When active occupancy reaches the window — `isContextWindowExhausted` checks `tokenMetrics.active.totalTokens >= contextWindow` in `useChatSession` — the composer displays "Context window reached." with an inline "Compact history" action (and `handleSendMessage` guards against direct sends) to reclaim headroom without discarding session context.

**Context compaction resets the meter.** `metadata.isCompactedSummary` (from context compaction, §4.12) marks the summary message that history was trimmed around. `calculateTokenMetrics` detects a compacted-summary latest turn and resets the active context snapshot to a ~1,500-token system-prompt baseline plus the summary's real output tokens — so the guard and header meter reflect the *trimmed* history instead of the pre-compaction footprint.

The same `tokenBudget` object feeds the system prompt (§3.7), so the model sizes replies against real current headroom.

### 4.10 SSR rate-limit hydration

Initial quota is resolved **on the server** so the client never waits on a fetch waterfall. The async root layout (`src/app/layout.tsx`) reads the session and quota before render:

```tsx
// src/app/layout.tsx (async server component)
const reqHeaders = await headers();
const session = await auth.api.getSession({ headers: reqHeaders });
if (session?.user) initialRateLimit = await getRateLimitStatus(session.user.id);
// <RateLimitProvider initialData={initialRateLimit}>{children}</RateLimitProvider>
```

`RateLimitProvider` (`src/contexts/RateLimitContext.tsx`) then:

- seeds `rateLimitData` / `quotaError` from that `initialData`;
- runs a **render-phase rehydration** (an `if (prevUser !== user || prevKey !== initialKey)` block, *not* an effect) so the quota UI is correct on the very first paint and on-sign-out it clears;
- falls back to a `useEffect` fetch of `GET /api/user/rate-limit` (`src/app/api/user/rate-limit/route.ts`) only when SSR data is unavailable (e.g., signed-in during a client-only navigation) — guarded by an `active` flag to avoid setting state after unmount;
- reacts to the transport's header updates via `updateRateLimitData`.

The `GET /api/user/rate-limit` route re-verifies the session with `auth.api.getSession` and returns `getRateLimitStatus(userId)` as JSON (401 on no session, 500 on DB failure).

### 4.11 The three persistence touchpoints

| Layer | What holds state | Purpose | Writes happen |
|-------|------------------|---------|---------------|
| **Dexie (IndexedDB)** | `conversations` + `messages` tables | Durable client-side state across reloads and chat switches | `onFinish` reconciliation (§4.5), file CRUD, title/model updates |
| **Request-body snapshot** | `files` array serialized into the transport `body` | Gives the stateless API route the current workspace so tools can operate | Each `sendMessage` via `filesRef` (§4.7) |
| **API-route `mutableFiles[]`** | In-memory array mutated by tool closures during one request | Single source of truth for tool reads/writes within a stream; synced back via tool-result parts | Tool `execute()` callbacks (`onUpdateFile` / `onDeleteFile`) |

The API route is intentionally **stateless**: it reconstructs workspace state from each request body and never persists anything itself. Whatever tool results mutate during the stream are reflected in the SSE tool parts and the live `data-workspace` events; the client's `onFinish` is the one reconciliation point that merges them into Dexie.

### 4.12 Context compaction: distill, prune, and reset the window

Long agentic conversations eventually crowd the context window. Instead of evicting message history client-side (the naive fix, which breaks continuation because the model forgot *what it already did*), Strata AI compacts it into a dense summary stored *as a normal assistant message*. Context compaction is a **distill → prune → reset** pipeline:

1. **Distill.** The model reads the full history + workspace state and writes a self-contained structured summary (`## Current Goal`, `## Key Decisions & Constraints`, `## Progress So Far`, `## Open Questions / TODOs`, `## Important Facts & Artifacts`, `## Workspace State`, `## Recent Trajectory`, `## Continuation Notes`).
2. **Prune.** Everything *before* that summary is sliced out of the message list **server-side** on every subsequent request, so neither the agent nor a future compaction ever re-reads pre-summary history.
3. **Reset.** The summary message is stamped `metadata.isCompactedSummary = true`, which tells the active-context meter (§4.9) to reset to a ~1,500-token system-prompt baseline + the summary's real output — keeping the context-window guard truthful about the *trimmed* history.

The pieces:

**Endpoint.** `POST /api/agent/compact` (`src/app/api/agent/compact/route.ts`) is the same thin shell as `POST /api/agent` — session → `checkAndIncrementRateLimit` (**compaction consumes 1 quota message**) → zod `agentRequestBodySchema` → `sliceMessagesAfterCompaction(messages)` → delegating. JSON 401/400/429 errors; success is the usual UI-message SSE stream with `X-RateLimit-*` headers.

**Stream config.** `runCompactionResponse` (in `src/lib/ai/agent-runner.ts`) shares the identical `createUIStreamResponder` used by the agent route, but with `initialSystem: buildCompactionInstruction(files)` instead of the agent prompt, an appended user turn ("Please generate the comprehensive context compaction summary…"), `maxOutputTokens: 3500`, and **no tools / no `stopWhen`**. The finish part is stamped via `extraMetadata: { isCompactedSummary: true }`, so the persisted message is recognizable downstream.

**Server-side pruning.** `sliceMessagesAfterCompaction` (`src/lib/ai/message-extractor.ts`) trims the message list to begin at the latest `isCompactedSummary` anchor `findLatestCompactedMessageIndex`. Both `/api/agent` and `/api/agent/compact` apply it before streaming; the client transport (§1.2) stays a pure network/header layer and never mutates the payload — pruning is server-authoritative so it cannot drift out of sync with the UI.

**Client flow.** `useCompaction.triggerCompaction` (surfaced from `useChatSession.handleTriggerCompaction`) appends a placeholder assistant message, `fetch`es `/api/agent/compact`, parses the SSE stream with `parseJsonEventStream` + `readUIMessageStream`, streams the summary live, syncs the `X-RateLimit-*` headers, then persists through the same `reconcileFinishedStep` path as §4.5. The `/compact` trigger comes from the `SlashCommandMenu` registry, typing `/compact` into the composer, or clicking the inline "Compact history" action in `ChatInput` when the context window is reached; `ChatInput` disables send while `isCompacting`, and `ChatPanel` renders `CompactionDivider` pills ("Compaction started" / "Compaction completed") around the summary message.

This is the anti-pattern to the production mistake of truncating history: trusting that the model "remembers" is exactly what fails. Compaction makes the trimming a *first-class artifact the model consults*, so long-running agent sessions stay coherent past a single context window.

---

## Part 5 — Performance Optimization Techniques

This is the payoff: everything Strata AI learned the hard way about keeping a streaming agent session at 60 fps, even after thousands of words and dozens of tool calls.

### 5.1 The streaming re-render audit

Start with the question: **what re-renders on every stream delta, and does its cost scale with message length?**

On each chunk, `useChat` updates `chat.messages`. Every consumer gets re-rendered. The audit checklist:

1. **Find every consumer of the messages array** (panel, bubbles, drawer, sidebar badges).
2. **Classify cost per consumer**: text render (cheap) vs `ReactMarkdown` AST parse (expensive) vs re-resolved tool UI (medium) vs Dexie toWrite (only on finish — fine).
3. **Kill the quadratic term** — a length-N conversation must not do N expensive re-parses per delta.

### 5.2 The key insight: only the in-flight message is re-created

Why `React.memo` on message bubbles works at all: the AI SDK's `useChat` reducer `structuredClone`'s **only the message currently streaming**. Completed messages keep **reference identity** across updates.

Consequences:

- A `React.memo`'d bubble for a *finished* message sees an identical `message` reference → skips entirely (O(1) per delta, not O(N)).
- Only the active bubble — the one streaming — pays per-delta render cost. That's the whole ballgame.

Re-verify this assumption after every SDK version bump (the implementation lives in the `@ai-sdk/react` source). If it ever clones all messages, the memo strategy breaks and you'll need selector-level memoization instead.

### 5.3 `React.memo` boundaries on hot surfaces

Wrap every hot chat surface:

```tsx
export const ChatBubble = memo(function ChatBubble({ message, isStreaming }) { ... });
export const SmoothStreamText = memo(...);
export const WorkspaceDrawer = memo(...);
export const ChatInput = memo(...);
export const Sidebar = memo(...);
export const ToolCallCard = memo(..., areToolCallCardPropsEqual);
export const WorkGroupCard = memo(...);
```

The motivated Strata AI reported that the unmemoized `WorkspaceDrawer` ran `ReactMarkdown` over the active file on every 15 ms delta — a length-scaled freeze hotspot. Memoizing the drawer (plus stable handlers, §5.5) made a long streaming session with an open drawer go from stutter to smooth.

**Caveat:** `React.memo` is only as good as its props' stability. If parents pass inline arrow functions, every memo is dead on arrival — hence §5.5/§5.6.

### 5.4 Custom comparators for streaming props

Tool-card props contain **multi-KB argument strings** (`writeFile` content) that legitimately change on every delta — a shallow prop compare would fail and re-render constantly. `ToolCallCard` passes a custom comparator that ignores argument identity unless the *state* transitioned (`src/components/chat/ToolCallCard.tsx`):

```ts
export function areToolCallCardPropsEqual(prevProps, nextProps) {
  const prevInv = prevProps.part?.toolInvocation || prevProps.part;
  const nextInv = nextProps.part?.toolInvocation || nextProps.part;
  if (prevProps.onOpenDrawer !== nextProps.onOpenDrawer) return false;
  if (prevProps.label !== nextProps.label || prevProps.status !== nextProps.status) return false;
  if (!prevPart && !nextPart) return true;
  if (prevPart.toolCallId || nextPart.toolCallId differs) return false;
  // On terminal states, re-render when success/error output changes.
  if (terminal(nextInv.state)) return prevResult.success === nextResult.success && prevResult.error === nextResult.error;
  // During streaming, ignore growing args/inputs entirely:
  return true;
}
export default React.memo(ToolCallCard, areToolCallCardPropsEqual);
```

Rule of thumb: the comparator encodes **what the user sees change** — status, icon, summary — never the raw argument stream.

### 5.5 Stable handlers with `useCallback`

Every `React.memo` is paid for by `useCallback` at the source. `useChatSession`, `useWorkspaceFiles`, `useModelSettings`, and the chat page (`src/app/chat-id/[id]/page.tsx`) define stable handlers:

```ts
const handleSelectFile = useCallback((fileId: string) => { ... }, []);
const handleCloseDrawer = useCallback(() => setIsWorkspaceDrawerOpen(false), [setIsWorkspaceDrawerOpen]);
```

The pattern: hooks return stable callbacks → the page passes them straight down → presentational components memoize. No inline `onClick={() => ...}` in hot paths. `WorkspaceDrawer` additionally collapses its rapid `handleUpdateFile` saves by debouncing within a 150 ms window, reducing Dexie rewrites while the `data-workspace` events flow in.

### 5.6 Memoize resolved UI with `useMemo`

Derived UI config should be computed once, not per render. The tool resolver (`src/components/chat/tools/resolver.tsx`) turns a raw tool call into `ToolCardProps` (label, icon, accent classes, status, summary); the card computes it **inside its own `useMemo`** keyed on the parts that matter (the `part` reference + `onOpenDrawer`), so the parent list never pays for tool UI resolution:

```ts
const resolved = React.useMemo(() => {
  if (part) return resolveToolDisplay(part, onOpenDrawer);
  return null;
}, [part, onOpenDrawer]);
```

The counter-pattern (which shipped first and was removed): resolving tool display in the *parent list render* — re-resolving every card's UI for every card on every delta. Keep resolution local and memoized.

### 5.7 Plain-text reasoning segments while streaming

The single biggest per-frame win: **skip Markdown AST re-parsing entirely for in-flight reasoning text** (§2.4). While the model is actively thinking, `ThoughtAccordion` renders thought text as plain `font-mono whitespace-pre-wrap` — no `ReactMarkdown`, no AST, no re-render tax. Only once thinking completes does the accordion upgrade to a memoized `ReactMarkdown` render:

```tsx
{isStreaming && isLastSegment ? (
  <pre className="font-mono whitespace-pre-wrap text-caption text-text-secondary">{text}</pre>
) : (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{text}</ReactMarkdown>
)}
```

Why this beats throttled batching: throttling still pays O(N) per frame for up to 60ms of work; removing the parser from the hot path drives the per-frame cost to zero. A fresh `components` object every render forces `ReactMarkdown` to tear down nodes — memoize it (`useMemo(..., [])`).

### 5.8 Type-system styling discipline

Tailwind's raw size scale invites fragmentation (`text-[11px]` in dozens of places). Strata AI defines a **semantic type scale** in the `@theme` block of `src/app/globals.css`:

```
--text-micro: 0.6875rem;  /* 11px - eyebrows, inline code, badges */
--text-caption: 0.75rem;  /* 12px - meta lines, tool cards, sidebar */
--text-label: 0.875rem;   /* 14px - buttons, labels, nav */
--text-body: 1rem;        /* 16px - paragraphs, chat bubbles */
--text-subheading: 1.125rem; /* 18px - h3, section titles */
--text-heading: 1.25rem;  /* 20px - h2, empty states */
--text-title: 1.5rem;     /* 24px - h1 */
--text-display: 2rem;     /* 32px - hero, 404 */
```

Rules (from `docs/SUMMARY.md` / AGENTS.md): never raw size classes (`text-xs`/`text-sm`/`text-[10px]`), never hardcoded colors/shadows/radius — use the Milo `@theme` tokens (`primary`, `secondary`, `danger`, `surface-*`, `text-*`, `edge-*`, `accent-*`, `shadow-*`). Design tokens are a **performance and maintainability technique**: sweeping visual changes are a two-line diff instead of a 30-file hunt, and they keep components style-sys cohesive.

### 5.9 Server-side tool input delta coalescing (`coalesceToolInputDelta`)

When a model streams large tool arguments (`writeFile`/`editFile` content) the SDK emits high-frequency `tool-input-delta` SSE chunks. Client-side, the AI SDK message reducer would run partial-JSON parse/fix on **every chunk** — quadratic work for multi-KB code. Strata AI coalesces them **server-side** in `src/lib/ai/agent-runner.ts`:

```ts
function coalesceToolInputDeltas() {
  return () => {
    const buffers = new Map<string, { delta: string; chunkCount: number; providerMetadata?: unknown }>();

    function flush(id, controller) { /* emit one tool-input-delta with all buffered text, then delete */ }

    return new TransformStream({
      async transform(chunk, controller) {
        if (chunk.type === 'tool-input-delta') {
          // accumulate into buffers by tool-call id
          // if existing: delta += chunk.delta, chunkCount += 1, merge providerMetadata
          // else: buffers.set(id, { delta: chunk.delta, chunkCount: 1 })
          return;
        }
        if ((chunk.type === 'tool-input-end' || chunk.type === 'tool-call') && chunk.id) flush(chunk.id, controller);
        controller.enqueue(chunk);
      },
      flush(controller) { for (const id of [...buffers.keys()]) flush(id, controller); },
    });
  };
}
```

Registered in `experimental_transform` **after** `smoothStream`, it turns $O(N \times L)$ client partial-JSON re-parses into a single batch parse per tool call. This keeps long multi-KB code streaming perfectly fluid. The exact production shape (per-tool buffers, `tool-input-end`/`tool-call` flush triggers, `providerMetadata` merge, and a coalescing log) lives in `src/lib/ai/agent-runner.ts`.

### 5.10 Measure, don't guess

- **React DevTools Profiler** on a long streaming session — which components re-render per delta and their render durations. (The profiler itself slows rendering; compare relative cost.)
- **The scaling test** — a conversation with 1 vs. 50 messages. Any component whose cost grows with history is a quadratic suspect.
- **Chrome Performance tab** — long tasks (> 50 ms) during streaming are frame drops; identify the owning script.
- **Sanity-check assumptions in the SDK source** — memo strategies (§5.2) live or die on implementation details; verify after upgrades.

---

## Part 6 — Best Practices & Anti-Patterns

### 6.1 The checklist

**Server (agent route)**

- [ ] Thin route: auth → quota → zod → clamp → delegate; all `streamText` config in `runAgentResponse`.
- [ ] Stateless workspace via `createMutableWorkspace` closures; never persist server-side.
- [ ] Auth double-verified: fast cookie check in `proxy.ts` + full `auth.api.getSession` in the route.
- [ ] Zod-validate the body; `maxSteps` clamped to 1–30; message length enforced server-side.
- [ ] `abortSignal: req.signal` wired; `stopWhen: isStepCount(maxSteps)` bounds the loop.
- [ ] `prepareStep` re-injects the system prompt with live file state + token budget.
- [ ] Provider wiring confined to `resolveAgentModel`; the route stays provider-agnostic.
- [ ] Tool errors returned in results (`{ error }`), not thrown (except hard resource rules).
- [ ] File tools stream live `data-workspace` events via the injected `writer`.

**Client**

- [ ] `useChat` `status` is the only loading/streaming source of truth.
- [ ] `onData` applies live `data-workspace` file events to the workspace.
- [ ] Memoized transport; live values via the refs-bridge (`body` reads refs).
- [ ] `React.memo` on every hot surface + stable `useCallback` handlers + custom comparators where props are large.
- [ ] Stream plain text, markdown late, memoized `components` object.
- [ ] Group intermediate work only after inference finishes (§2.6).
- [ ] Auto-scroll owned by `StickToBottom`; zero manual `scrollIntoView`.
- [ ] All persistence in one `onFinish` reconciliation, atomic Dexie transaction, native `UIMessage` shape.
- [ ] Semantic Milo design tokens only; no raw sizes/colors/shadows.

**Prompt & model**

- [ ] Metadata-only file listings; the model must call `readFile` for content.
- [ ] Hard constraints + numbered workflow protocol in the system prompt.
- [ ] GFM output rules section (the renderer is `react-markdown`).
- [ ] `thinkingConfig.includeThoughts`/per-provider reasoning enabled where supported; thoughts rendered per §2.4.
- [ ] Token budget + context-window guard wired end-to-end (§3.6/§4.9).

### 6.2 Mistakes we actually made

Every item shipped and was later fixed. Learn from the receipts:

1. **Unmemoized drawer re-parsing markdown per delta.** Classic quadratic: open file drawer + long stream = main-thread meltdown. Fix: `React.memo` + stable handlers.
2. **Tool UI resolution in the parent render.** Every delta re-resolved every card. Fix: resolve inside each card's `useMemo`, keyed on the tool part identity.
3. **Raw `text-[11px]` fragmentation across the codebase.** Fix: a semantic type scale + audit greps (`text-\[1[01]px\]`) in CI/verification.
4. **Dumping file contents into the system prompt.** Token-blowing and hallucination fuel. Fix: metadata-only listings + `readFile` discipline.
5. **Mixing SDK generations** (legacy `append`-style sends). Use transports + `sendMessage` in v7 only.
6. **Manual scroll effects.** Janky, fights the user, double-fires. `StickToBottom` owns the DOM.
7. **Trusting model prose over tool results** ("I updated notes.md" with no file change). Fix: persistence driven by tool-result parts, never narrative.
8. **Letting a single timestamp tie message ordering.** Position-derived timestamps fixed silent reorders.

### 6.3 Where everything lives in Strata AI

| Concern | File |
|---------|------|
| Chat session orchestration (transport + chat + reconciler + compaction wiring) | `src/hooks/useChatSession.ts` |
| Custom transport + quota header parsing | `src/hooks/useChatTransport.ts` |
| Context compaction streaming (`triggerCompaction`, SSE parse, header sync, `isCompactedSummary` stamping) | `src/hooks/useCompaction.ts` |
| Agent + compaction stream assembly (`runAgentResponse` / `runCompactionResponse` via shared `createUIStreamResponder`: model, tools, transforms, step cap, SSE + quota headers, metadata sanitization) | `src/lib/ai/agent-runner.ts` |
| Streaming agent route (thin auth/quota/validation shell) | `src/app/api/agent/route.ts` |
| Streaming context-compaction route (thin shell; consumes 1 quota message) | `src/app/api/agent/compact/route.ts` |
| Mutable workspace factory + file-merge helpers | `src/lib/ai/workspace.ts` |
| Provider resolver (the only provider seam) | `src/lib/ai/providers.ts` |
| Model catalog + thinking levels + caps + pricing + localStorage helpers | `src/lib/models.ts` |
| Token accounting (`calculateTokenMetrics`: active context + session + per-model cost, compaction-aware reset, formatters) | `src/lib/token-usage.ts` |
| App limits (`MAX_*`) + quota constants (`QUOTA_*`, `NEAR_LIMIT_PERCENT`) + quota-error copy + formatting helpers | `src/lib/limits.ts` |
| Tool factories + barrel | `src/lib/ai/tools/` + `src/lib/ai/tools.ts` |
| System prompt builders (agent `buildSystemInstruction` + compaction `buildCompactionInstruction`) | `src/lib/ai/prompts.ts` |
| Surgical edit engine (`StringEditEngine`) | `src/lib/edit-engine.ts` |
| Dexie schema + CRUD (`persistMessages` batched transaction) | `src/lib/db/db.ts` |
| `onFinish` reconciliation + auto-continuation | `src/lib/ai/chat-reconciler.ts` |
| Tool-result file extraction + compaction history slicing (`sliceMessagesAfterCompaction`) | `src/lib/ai/message-extractor.ts` |
| Message-part → render-segment flattening (streaming ungrouped / finished work-group) | `src/lib/ai/message-segments.ts` |
| Friendly error mapping | `src/lib/ai/chat-error-handler.ts` |
| Memoized chat surfaces (ChatBubble, SmoothStreamText, ChatInput, ToolCallCard, WorkGroupCard, resolver) | `src/components/chat/*` |
| Shared Markdown component maps (assistant + user) | `src/components/chat/create-markdown-components.tsx` |
| `/compact` slash-command popover + registry | `src/components/chat/SlashCommandMenu.tsx` |
| Compaction divider pills | `src/components/chat/CompactionDivider.tsx` |
| Shared auth form state machine (`useSignIn` / `useSignUp`) | `src/hooks/useAuthForm.ts` |
| Token usage popover (context meter, cost breakdown, outside-tap dismissal) | `src/components/chat/TokenUsagePopover.tsx` |
| Global quota context (SSR hydration + header sync) | `src/contexts/RateLimitContext.tsx` |
| Route guard + security headers (`proxy`) | `src/proxy.ts` |
| Confirm dialog (portal into `document.body`) | `src/components/ui/ConfirmDialog.tsx` |
| Design tokens (type scale, colors, shadows, keyframes) | `src/app/globals.css` |
| Thin-shell chat page + auto-scroll | `src/app/chat-id/[id]/page.tsx` |
| Auth (server + client) | `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts` |
| Rate limiting (DB sliding windows) | `src/lib/rate-limit.ts` |
| Architecture reference | `docs/SUMMARY.md` |

That's the full ladder: a streamed reply, a smooth UX, a bounded tool loop, a production architecture, and the performance discipline that keeps it all at 60 fps. Build well.