# Strata AI — System Architecture & Agent Guide

## 1. What This Is

Strata AI is a local-first conversational workspace studio. A user prompts an agent that runs
multi-step autonomous loops (up to 30 steps per turn) over 8 Zod-validated tools, producing
durable multi-file workspaces (25 language grammars) that live in a slide-over canvas drawer.

Three facts explain almost every design decision in this codebase:

- **Local-first storage.** Conversations, messages, and workspace files live in the user's browser
  (Dexie / IndexedDB). The server never stores user documents.
- **Stateless server.** The backend is a gateway: session validation, an atomic Postgres quota
  ledger, and unified AI SDK 7 SSE streaming. Nothing else.
- **Compaction instead of truncation.** `/compact` distills history + workspace state into an
  anchor message. Subsequent turns prune everything before that anchor server-side, so long
  conversations stay cheap without losing decisions.

Read the rest top-down: what a request does end-to-end (§4-5), then the subsystem reference
(§6-8), then the rules you must not break (§10).

## 2. Tech Stack & Environment

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4.0 (App Router, Node runtime), React 19.2.7, TypeScript 7.0.2 |
| Package manager | Bun 1.4.3 (pinned via `packageManager`). Never npm/yarn/npx. |
| AI engine | Vercel AI SDK 7 (`ai`), `@ai-sdk/google`, `@ai-sdk/fireworks` |
| Models | Gemini 3.5 Flash Lite (default), Gemini 3.1 Flash Lite, GLM 5.3 Flash, DeepSeek V4.1 Flash (`src/lib/ai/models.ts`) |
| Web research | Tavily REST API (`webSearch`, `extractUrl`) |
| Client DB | Dexie 4.4 — `StrataAIChatDB` schema v5 |
| Server DB | Supabase PostgreSQL, `better_auth` schema, `pg` Pool |
| Auth & quota | Better Auth 1.6 (`emailAndPassword`, `nextCookies`) + atomic sliding-window ledger |
| UI | Tailwind 4.1 + Milo design tokens (`globals.css`), PrismJS 1.30, `motion` 12, `use-stick-to-bottom` 1.1.6, `unpdf` 1.8.1 |
| Observability | Langfuse 5.10 via OpenTelemetry NodeSDK (`src/instrumentation.ts`) |

**Environment variables:** `GOOGLE_GENERATIVE_AI_API_KEY`, `FIREWORKS_API_KEY`, `DATABASE_URL`,
`BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_GEMINI_MODEL`, `TAVILY_API_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`,
`LANGFUSE_BASE_URL`.

**Model catalog** (`src/lib/ai/models.ts`) is the single source of truth for selectable models,
pricing, context windows (all 131,072), and thinking levels. `resolveAgentModel`
(`src/agent/providers/index.ts`) maps a catalog id to the provider-specific `streamText` config;
only ids carrying a `provider` field route to Fireworks.

## 3. Commands

| Command | Action |
|---|---|
| `bun run dev` | Next.js dev server |
| `bun run build` | Production build |
| `bun run typecheck` | `bun check` |
| `bun run lint` | `oxlint` |
| `bun run test` | `bun test --isolate` |
| `bun run db:migrate` | Better Auth schema + quota table migration |
| `bun run db:test` | DB connection and schema healthcheck |

Lint and build must both pass before a change is considered done.

## 4. Request Lifecycle (Agent Turn)

This is the spine of the system. Everything below happens for one user message.

1. **Compose.** `ChatInput` builds UI-message parts: `file` parts first (images, then documents, as
   data URLs), then `text`. `handleSendMessage` (`src/hooks/chat/useChatSession.ts`) pre-checks quota and
   context-window exhaustion, auto-titles the conversation, then calls `chat.sendMessage({ parts })`.
2. **Transport.** `useChatTransport` returns a memoized `DefaultChatTransport` pointed at
   `/api/agent`. Its `body()` reads live values through refs so the transport never re-creates
   itself; its custom `fetch` is a pure header layer — surfacing `X-RateLimit-*` into
   `RateLimitContext`, turning 429 into a `QuotaError` + `chat.stop()`, throwing on other failures.
3. **Proxy gate.** `src/proxy.ts` runs a fast `getSessionCookie` pre-check (JSON 401 for `/api/*`,
   redirect to `/auth` for pages — deliberately dropping `callbackUrl` on `/chat-id/*` so a private
   chat id is never inherited by another account) and injects `nosniff` / `DENY` / `strict-origin`.
4. **Route guards.** `withAgentRouteGuards` (`src/agent/guards/route-guards.ts`) runs a fixed pipeline:
   `auth.api.getSession` (401) -> `req.json()` (400) -> `agentRequestBodySchema` (400) ->
   `sliceMessagesAfterCompaction` -> length and attachment-part bounds (400) ->
   `checkAndIncrementRateLimit` (429). Quota is reserved only after every input check passes; the
   route stays a thin shell receiving `{ session, body, messages, rateLimit, signal }`.
5. **Stream assembly.** `runAgentResponse` (`src/agent/core/runner.ts`) computes the active token
   budget, then delegates to the private `createUIStreamResponder` — the single choke point for all
   model execution. It sanitizes cross-provider metadata, converts messages once, strips image parts
   for text-only models, applies
   `experimental_transform: [smoothStream({ delayInMs: 15, chunking: 'word' }), coalesceToolInputDeltas()]`,
   re-injects `buildSystemInstruction` per step via `prepareStep`, and caps the loop with
   `stopWhen: isStepCount(maxSteps)`.
6. **Error path.** Any `onError`, execution throw, or setup throw runs `classifyProviderError`,
   writes an `error` stream part, flushes Langfuse, and fires `onInferenceError` once (idempotent)
   -> `safeAsyncRefundRateLimit` deletes the reserved quota row. Users never lose quota to an outage.
7. **Client application.** `useChat.onData` handles `data-workspace` parts live, so the drawer
   reflects the agent's work mid-stream. `useWorkspaceFiles` coalesces rapid updates on a 150 ms
   timer before writing to Dexie.
8. **Reconcile.** `useChat.onFinish` -> `reconcileFinishedStep` (`src/agent/client/reconciler.ts`)
   persists all messages, merges workspace deltas from the finished message's tool parts, and — on
   `finishReason === 'step-limit'` — schedules an auto-continuation, capped at 2 per user turn.

**Compaction turn (`/compact`):** `useCompaction` posts the message array to `/api/agent/compact`
via raw `fetch`, consumes the SSE with `parseJsonEventStream` + `readUIMessageStream`, validates
that real summary text was produced, and reconciles. Server-side it reuses the same responder with
`COMPACTION_MODEL_ID`, `maxOutputTokens: 3500`, and `isCompactedSummary` metadata.

## 5. Streaming Protocol & Tools

**Protocol:** AI SDK 7 UI message SSE, `text/plain`. Part types reaching the client: `text`
(paced by `smoothStream`), `reasoning` (rendered by `ThoughtAccordion`), `tool-call` /
`tool-input-delta` (buffered by `coalesceToolInputDeltas`), `data-workspace` (canvas deltas),
`error`, `finish`. Every stream carries `X-RateLimit-Remaining-5h` and
`X-RateLimit-Remaining-Week`.

**Tools** (registered in `src/agent/tools/index.ts`, built per request from
`createMutableWorkspace(files)` so all tools share one live mutable array):

| Tool | Arguments | Effect | Emits |
|---|---|---|---|
| `listFiles` | — | Metadata for every file (no content) | — |
| `readFile` | `nameOrId`, `section?` | Full content, or one markdown heading section | — |
| `writeFile` | `name`, `content`, `language?` | Creates or replaces; truncates at 10k chars | `file-updated` |
| `editFile` | `nameOrId`, `explanation`, `searchString`, `replaceString` | 3-strategy replacement; enforces per-file and workspace-total caps | `file-updated` |
| `renameFile` | `nameOrId`, `newName` | Rejects case-insensitive collisions; re-detects language | `file-updated` |
| `deleteFile` | `nameOrId` | Removes from workspace | `file-deleted` |
| `webSearch` | `query`, depth/topic/timeRange/domains... | Tavily search, 30s timeout, mapped errors | — |
| `extractUrl` | `urls` (1-3), `extractDepth`, `query?` | Tavily extract, 45s timeout, 18k char cap per page | — |

`editFile` delegates to `StringEditEngine` (`src/agent/tools/edit-engine.ts`), which tries
**exact** substring, then **whitespace-normalized** line matching, then **anchor-matched**
first/last-line bounding. Every strategy rejects ambiguous matches with an actionable error rather
than guessing.

Tool **display** is registered in `components/chat/tools/resolver.tsx` (config + summary builder +
name aliases). Never edit `ToolCallCard.tsx` to add a tool.

## 6. Security, Auth & Quota

**Three independent layers:**

1. *Proxy gate* (`src/proxy.ts`) — cheap cookie pre-check and security headers. Matcher is scoped
   to `/`, `/chat-id/:path*`, `/api/agent`, `/api/agent/:path*`.
2. *Route guard* (`withAgentRouteGuards`) — cryptographic session lookup against PostgreSQL via
   `auth.api.getSession`. Authoritative; the proxy alone is never trusted.
3. *Client-side RLS* — `src/components/ChatPageClient.tsx` and `useChatSession` verify
   `conversation.userId === session.user.id` and redirect to `/` on mismatch. Legacy rows with no
   `userId` stay visible for backwards compatibility.

**Sliding-window quota** (`better_auth.message_log`): 10 messages / 5 hours and 50 / 7 days.
`checkAndIncrementRateLimit` runs purge-old-rows + window-count + conditional-insert in a single
atomic CTE, so concurrent requests cannot oversubscribe. `refundRateLimit` deletes the row on
inference failure. `getRateLimitStatus` powers the read-only `GET /api/user/rate-limit` snapshot;
429 responses add `Retry-After` and `X-RateLimit-Retry-After`.

## 7. Data Model

**Client — Dexie `StrataAIChatDB` v5** (`src/lib/db/database.ts`):

- `conversations` (PK `id`; indexes `userId`, `updatedAt`, `createdAt`): `title` (auto-capped at 40
  chars), `model`, `thinkingLevel`, `pinned`, `files` (`WorkspaceFile[]`), `activeFileId`, timestamps.
- `messages` (PK `id`; indexes `chatId`, `userId`, `timestamp`): AI SDK `UIMessage` plus
  `chatId`, `userId`, and a position-derived ISO `timestamp` (strictly monotonic within a batch, so
  sorting by timestamp reproduces true order without UUID tie-breakers).
- `metadata` on assistant messages is `ChatMetadata`: `usage` (final step), `stepTotalUsage`
  (cumulative), `modelId`, `isCompactedSummary`.
- `WorkspaceFile`: `id`, `name` (case-insensitively unique), `content` (<= 10k chars), `language`
  (auto-detected from extension), `createdAt`, `updatedAt`.

`deleteConversation` removes the row and its messages in one `db.transaction('rw', ...)`.

**Empty Conversation Lifecycle & Single-Empty-Chat Invariant:**
- `isConversationEmpty(chatId)` detects conversations with zero messages and zero workspace files.
- `findExistingEmptyConversation(userId)` retrieves an existing unstarted chat for the active user.
- `pruneEmptyConversations(userId, keepChatId)` keeps a single empty conversation — the currently open chat when empty, otherwise the most recently updated empty chat — and deletes the rest in a Dexie transaction, so a new chat the user just left stays visible in the sidebar.
- `useConversations` enforces that users can have at most one unstarted chat: clicking "New Chat" while in an empty conversation is an inert no-op (the UI button dims with an informative tooltip), and clicking "New Chat" from an existing chat navigates to the existing empty chat if one already exists rather than allocating a new ID and row. The sidebar renders pinned chats in a separate `Pinned` section above the remaining `Conversations` list (empty sections are hidden).

**Server — PostgreSQL `better_auth` schema:** standard Better Auth `user`, `session`, `account`,
`verification` tables, plus `message_log(id UUID PK, user_id FK, created_at TIMESTAMPTZ)` indexed on
`(user_id, created_at)`.

## 8. Directory Map & Component Boundaries

```
src/
├── agent/                # Folder-based agent architecture
│   ├── core/             # runner (stream choke point), error-classifier, transforms
│   ├── tools/            # workspace-tools, tavily-tools, edit-engine, types
│   ├── prompts/          # system, compaction
│   ├── providers/        # resolveAgentModel, getModelProvider, reasoning mapping
│   ├── guards/           # withAgentRouteGuards, agentRequestBodySchema, refunds
│   ├── sanitization/     # provider metadata pruning, PDF text extraction, image stripping
│   ├── workspace/        # per-request mutable workspace + file operations
│   └── client/           # tool-normalization, extractor, segments, reconciler, error-handler
├── proxy.ts              # Middleware: session-cookie gate + security headers
├── instrumentation.ts    # OTel NodeSDK + Langfuse span processor (server-only)
├── app/
│   ├── layout.tsx        # RSC shell: fonts, anti-flash script, RateLimitProvider
│   ├── page.tsx          # Landing (public)
│   ├── auth/             # signin / signup / redirector
│   ├── chat-id/[id]/     # Thin route unwrap: use(params); delegates to ChatPageClient
│   └── api/              # agent, agent/compact, user/rate-limit, auth/[...all]
├── components/           # ChatPageClient (workspace orchestrator), chat/ (header/, input/, message/, tools/), workspace/, sidebar/ (ConversationSection), auth/, landing/, ui/
├── contexts/             # RateLimitContext (global quota), ChatUIContext (sidebar & drawer shell),
│                         # ChatInputContext (imperative chat input handle)
├── hooks/                # Domain folders: common/ (useTheme, useCopyClipboard, useClickOutside, ...),
│                         # chat/ (useChatSession orchestrator, useChatTransport, useCompaction, ...),
│                         # conversations/, workspace/, auth/ (sign in/up/out state machines)
└── lib/
    ├── auth/             # server.ts (Server Better Auth + pg Pool) | client.ts (client auth)
    ├── db/               # database.ts (Dexie v5 + Conversation/DBMessage), conversations.ts,
    │                     # messages.ts, workspace-files.ts, schemas.ts (WorkspaceFileSchema)
    ├── ai/               # models.ts (catalog, pricing, thinking levels), token-usage.ts
    ├── attachments/      # images.ts (canvas downscaling), documents.ts (PDF/text ingestion)
    ├── code/             # languages.ts (25 grammars), syntax-highlighter.ts
    ├── server/           # rate-limit.ts (Postgres quota)
    ├── limits.ts         # Every limit constant (never inline these numbers)
    ├── clipboard.ts      # stripMarkdown + copy
    ├── id.ts             # generateId
    └── timing.ts         # thought/work-group duration estimates
__tests__/                # 19 suites, run with bun test --isolate
```

**Route handlers:**

| Route | Purpose |
|---|---|
| `POST /api/agent` | Protected agent stream; clamps `maxSteps` to 1-30 (default 25) |
| `POST /api/agent/compact` | Protected compaction stream via Gemini 3.1 Flash Lite |
| `GET /api/user/rate-limit` | Protected read-only quota snapshot (`force-dynamic`) |
| `ALL /api/auth/[...all]` | Better Auth handler (`toNextJsHandler`) |

**Client component boundary:** `src/app/chat-id/[id]/page.tsx` is an ultra-lean dynamic route
wrapper unwrapping `use(params)` and mounting `<ChatUIProvider>`; it delegates state composition to `src/components/ChatPageClient.tsx`.
`ChatPageClient` calls `useChatSession(chatId)` and coordinates the 3-pillar layout (`Sidebar`, center
`<StickToBottom>` chat viewport, and `WorkspaceDrawer`). Dexie queries, auth calls, and router
navigation live in `src/hooks/*`, never inside presentation primitives. Two ephemeral UI concerns
that would otherwise be drilled live in page-mounted scoped contexts instead: `ChatUIContext` (mobile
sidebar drawer + desktop collapse, sessionStorage-persisted, plus workspace drawer open/close state) and `ChatInputContext` (an imperative ref
so empty-state suggestion chips inject a prompt with no parent re-render). Conversation and workspace
data flow as props from `useChatSession` + Dexie.

## 9. Limits & Constraints

All constants live in `src/lib/limits.ts`. Import them; never inline the numbers.

| Resource | Constant | Enforced at | Failure behavior |
|---|---|---|---|
| User prompt | `MAX_MESSAGE_CHARS = 2000` | Chat input + route guard | Send disabled; 400 |
| Attachments | `MAX_ATTACHMENTS_PER_MESSAGE = 4` | Picker/drop + route guard | Blocked; 400 |
| Image upload | `MAX_IMAGE_INPUT_BYTES = 5 MB` | Client canvas | Downscaled to 1280px / 1.5 MB |
| Document upload | `MAX_DOCUMENT_INPUT_BYTES = 5 MB` | Ingestion + sanitizer | Text capped at 25,000 chars |
| Files per workspace | `MAX_FILES_PER_WORKSPACE = 3` | `writeFile` + UI | Tool throws; button disabled |
| File length | `MAX_FILE_CHARS = 10,000` | `editFile` + editor | Edit rejected; input blocked |
| Workspace total | `MAX_WORKSPACE_TOTAL_CHARS = 50,000` | `editFile` validator | Edit rejected |
| Message quota | 10 / 5h, 50 / 7d | Atomic Postgres CTE | 429 + `Retry-After` |
| Agent steps | Clamped 1-30 (default 25) | `/api/agent` | `step-limit`; <= 2 continuations |
| Context window | 131,072 tokens | `token-usage.ts` | Sends blocked; `/compact` offered |

`NEAR_LIMIT_PERCENT = 80` is shared by the system prompt and the UI so both flip into "be
concise" warning mode at the same threshold.

## 10. Non-Negotiable Invariants

1. **Zero Server Actions.** No `"use server"` anywhere. Mutations use Route Handlers (streaming and
   quota only), Dexie (local entities), or Better Auth client methods.
2. **Unified Stream Responder.** All model execution goes through `createUIStreamResponder`
   (`src/agent/core/runner.ts`) with `smoothStream` and `coalesceToolInputDeltas`. Never call
   `streamText` from a route directly.
3. **Milo Color Tokens Only.** No hex literals, no default Tailwind palette names (`emerald`, `rose`,
   `zinc`, `red-*`, ...). Use `primary`, `secondary`, `surface-*`, `text-*`, `edge-*`, `danger`,
   `warning`, `info`, `scrim`, `*-soft`.
4. **Milo Type Scale Only.** No `text-xs` / `text-sm` / `text-base` / arbitrary pixel sizes. Use
   `text-micro` (11px), `text-caption` (12px), `text-label` (14px), `text-body` (16px),
   `text-subheading` (18px), `text-heading` (20px), `text-title` (24px), `text-display` (32px).
   Elevation/radius: `shadow-button`, `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`;
   `rounded-lg` (12), `rounded-xl` (20), `rounded-2xl` (32).
5. **Centralized Markdown.** Every markdown surface renders through
   `components/ui/MarkdownRenderer.tsx`. Never add direct `react-markdown` / `remark-gfm`
   imports. (`SmoothStreamText.tsx` is the one pre-existing exception — it wraps its own renderer
   to host the streaming caret. Don't extend the pattern.)
6. **Tool Card Decoupling.** Adding a tool means registering config + summary in
   `components/chat/tools/resolver.tsx`. Never edit `ToolCallCard.tsx`.
7. **Presentational Purity.** Components render props. Queries, auth, and routing live in
   `src/hooks/*` and page-level composition. Ephemeral cross-component UI state uses scoped
   contexts in `src/contexts/` (sidebar & drawer shell, chat input handle) rather than prop drilling or a
   state library; global quota state is the only app-wide context.
8. **Auto-Scroll Exclusivity.** Only `<StickToBottom>` in `src/components/ChatPageClient.tsx` scrolls
   the chat. No manual scroll loops anywhere.
9. **Async Next.js 16 APIs.** Unwrap dynamic route `params` with `use(params)` in client
   components; `await searchParams` / `headers()` in RSCs.
10. **Limits from One Source.** Import from `@/lib/limits`. Magic numbers in feature code are bugs.
11. **Bun Only.** `bun run dev | lint | typecheck | test | build`. Never npm, yarn, or npx.
12. **No Emojis, Preserve Comments.** No emojis in code or files; keep existing doc comments intact.

**Testing conventions:** suites live in `__tests__/`, run via `bun test --isolate`. Shared fixtures
(`makeFile`, `runTool`, `setupWorkspaceTools`, `jsonResponse`, `withEnv`) come from
`__tests__/helpers.ts`. Route tests must `mock.module` `@/lib/auth/server`, `@/lib/server/rate-limit`, and
`@/agent/core/runner` *before* dynamically importing the route.