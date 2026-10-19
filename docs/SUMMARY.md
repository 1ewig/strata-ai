# Strata AI — System Architecture

Strata AI is a local-first conversational workspace studio. A user prompts an agent that runs multi-step
autonomous loops over a fixed tool set, producing a durable multi-file workspace that lives in a slide-over
canvas drawer.

Three properties explain nearly every design decision:

- **Local-first storage.** Conversations, messages, and workspace files live in the user's browser (Dexie /
  IndexedDB). The server never stores user documents.
- **Stateless server.** The backend is a gateway: session validation, an atomic Postgres quota ledger, and
  unified AI SDK 7 SSE streaming.
- **Compaction instead of truncation.** `/compact` distills history and workspace state into an anchor message;
  later turns prune everything before that anchor server-side.

This document describes how the pieces fit together — the request lifecycle, the subsystem contracts, and the
seams where behaviour is centralised. It is descriptive; the authoritative details live in the source files it
names.

## 1. Runtime & Layout

Next.js 16.4 (App Router, Node runtime), React 19.2, TypeScript 7, Bun as package manager and test runner;
`package.json` pins the toolchain and `.env.example` lists the environment. The AI layer is Vercel AI SDK 7 with
Google and Fireworks providers plus Tavily for web research. Persistence is Dexie 4 in the browser and Supabase
Postgres through a `pg` Pool on the server. Langfuse is wired in via an OpenTelemetry NodeSDK
(`src/instrumentation.ts`).

| Path | Owns |
|---|---|
| `src/agent/` | the server-side agent: runner, stream responder, tools, prompts, provider resolution, route guards, provider sanitization, per-request workspace, browser-side client helpers |
| `src/app/` | thin route shells; `api/` holds four route handlers |
| `src/components/` | presentational React: `chat/` (header, input, message, tools), `workspace/` drawer, `sidebar/`, `ui/`, `landing/`, `auth/` |
| `src/hooks/` | every data and side-effect owner: chat session, transport, compaction, throttling, conversations, workspace, auth, common |
| `src/contexts/` | `RateLimitContext` (app-wide quota), `ChatUIContext` (sidebar and drawer shell), `ChatInputContext` (imperative prompt handle) |
| `src/lib/` | `ai/` (model catalog, token metrics), `db/` (Dexie), `code/` (languages, two highlighters), `attachments/`, `auth/`, `server/rate-limit.ts`, `workspace/download.ts`, `limits.ts` |
| `src/proxy.ts` | Next.js 16 proxy (middleware): cheap cookie pre-check plus security headers |

## 2. Request Lifecycle

1. **Compose.** `ChatInput` and `useChatInputController` build UI-message parts: image `file` parts first, then
   document `file` parts, then `text`. `useChatSession.handleSendMessage` pre-checks quota and context-window
   exhaustion, derives the conversation title from the user's own text, then calls
   `chat.sendMessage({ parts })`.
2. **Transport.** `useChatTransport` returns a memoized `DefaultChatTransport` on `/api/agent`. Its `body()`
   reads live values through refs, so the transport identity never changes. Its custom `fetch` is a header
   layer: it surfaces `X-RateLimit-Remaining-5h` and `-Week` into `RateLimitContext`, converts 429 into a
   `QuotaError` plus `chat.stop()`, and throws for other failures.
3. **Proxy gate.** `src/proxy.ts` runs a `getSessionCookie` pre-check. A missing cookie means a JSON 401 on
   `/api/*` and a redirect to `/auth` on pages; `callbackUrl` is dropped for `/chat-id/*` so a private chat id
   is never inherited by another account. Passing responses carry `nosniff`, `DENY`, and `strict-origin`.
4. **Route guards.** `withAgentRouteGuards` runs a fixed pipeline: `auth.api.getSession` (401) → `req.json()`
   (400) → `agentRequestBodySchema` (400) → `sliceMessagesAfterCompaction` → message-length and attachment-part
   bounds (400) → `checkAndIncrementRateLimit` (429). Quota is reserved only after every input check passes; the
   handler receives `{ session, body, messages, rateLimit, signal }`.
5. **Stream assembly.** The route clamps `maxSteps` to 1–30 (default 25), builds a mutable workspace from the
   request's `files`, and calls `runAgentResponse`. That computes a token budget, then hands off to
   `createUIStreamResponder` — the single place in the repo where `streamText` is called. The responder resolves
   the model, prunes cross-provider metadata, converts messages once, strips image parts for text-only models,
   applies `smoothStream` (15 ms, word chunking) and `coalesceToolInputDeltas`, re-injects the system prompt
   each step via `prepareStep`, and stops on `isStepCount(maxSteps)`.
6. **Error path.** Any setup, execution, or stream error runs `classifyProviderError`, writes an `error` stream
   part, flushes Langfuse, and fires `onInferenceError` once behind an idempotent latch →
   `safeAsyncRefundRateLimit` deletes the reserved quota row, so an outage does not cost the user quota.
7. **Client application.** `useChat.onData` handles `data-workspace` parts live, so the drawer reflects the
   agent's work mid-stream. `useWorkspaceFiles` coalesces rapid file updates on a 150 ms timer before writing to
   Dexie. `useThrottledMessages` caps React updates to one per animation frame, and each message renders inside
   a memoized `MessageRow` so historical turns never re-segment during streaming. `useChatSession` widens
   `isStreaming` to `status === 'streaming' || isCompacting`, so compaction chunks are throttled identically.
8. **Reconcile.** `useChat.onFinish` calls `reconcileFinishedStep`, which persists messages, merges workspace
   deltas from the finished message's tool parts, and — on `finishReason === 'step-limit'` — schedules one
   auto-continuation after 300 ms, capped at 2 per user turn.

## 3. The Agent Run

`createWorkspaceTools` (`src/agent/tools/index.ts`) returns eight tools bound to one live workspace context, so
every tool in a run sees the same mutable array. Six are workspace tools — `listFiles`, `readFile`, `writeFile`,
`editFile`, `renameFile`, `deleteFile` — in `workspace-tools.ts`; the mutating four emit a `data-workspace` part
(`file-updated` or `file-deleted`) that the client applies live. The other two are Tavily tools, `webSearch` and
`extractUrl` in `tavily-tools.ts`: search snippets truncate at a word boundary, extract caps each page at
`min(10k, floor(20k / pageCount))` chars.

`editFile` delegates to `StringEditEngine` (`src/agent/tools/edit-engine.ts`), which tries exact substring
match, then whitespace-normalised line matching, then anchor-matched first/last-line bounding; ambiguous matches
are rejected with an actionable error rather than guessed. Tool *display* lives in
`src/components/chat/tools/resolver.tsx` (label, icon, badge, accent, summary builder, plus an alias table for
legacy names), and `ToolCallCard.tsx` renders whatever it returns. The agent loop is bounded by
`isStepCount(maxSteps)`; when the budget runs out the finish reason is `step-limit` and the reconciler re-sends
a "continue where you left off" message, at most twice per user turn, resetting the counter on a normal finish.

## 4. Compaction

`/compact` posts the message array to `/api/agent/compact` over raw `fetch` and consumes the SSE with
`parseJsonEventStream` + `readUIMessageStream`, then validates that real summary text came back before
reconciling. Server-side it reuses the same responder with the compaction model, a 3500-token output cap, and
`isCompactedSummary` metadata. That anchor message is what `sliceMessagesAfterCompaction` uses to prune history
on later turns; `calculateTokenMetrics` also resets the measured active context to a system baseline once a
compaction summary is the latest assistant message.

## 5. Streaming Contract

| Part | Produced by | Consumed by |
|---|---|---|
| `text` | `smoothStream` | `MarkdownRenderer` |
| `reasoning` | provider | `ThoughtAccordion` |
| `tool-call` / `tool-input-delta` | provider, coalesced | `ToolCallCard` via `flattenMessageSegments` |
| `data-workspace` | workspace tools | `useChatSession.onData` → `useWorkspaceFiles` |
| `error` | `handleRunnerError` | `handleChatError` |
| `finish` | SDK | `useChat.onFinish` → reconciler |

Every stream response also carries `X-RateLimit-Remaining-5h` and `X-RateLimit-Remaining-Week`. AI SDK 7 emits
`tool-call` and `tool-result` as separate parts with a matching `callId`; `flattenMessageSegments` merges them
into one card, which is what prevents duplicate keys and perpetual spinners.

## 6. Persistence

**Client — Dexie `StrataAIChatDB` (v5)**, `src/lib/db/database.ts`:

- `conversations` — PK `id`; indexes `userId`, `updatedAt`, `createdAt`. Holds `title`, `model`,
  `thinkingLevel`, `pinned`, the `files` array (`WorkspaceFile[]`), and `activeFileId`. Workspace files live
  inside the conversation row, not in a separate table.
- `messages` — PK `id`; indexes `chatId`, `userId`, `timestamp`. An AI SDK `UIMessage` plus `chatId`, `userId`,
  and a position-derived ISO timestamp, strictly monotonic within a batch so sorting by timestamp reproduces
  true order.
- Assistant `metadata` is `ChatMetadata` (`src/lib/ai/token-usage.ts`): provider `usage` for the final step,
  cumulative `stepTotalUsage`, `modelId`, and the compaction flags.
- `WorkspaceFile` — `id`, case-insensitively unique `name`, `content`, auto-detected `language`, `createdAt`,
  `updatedAt`.

**Server — Postgres `better_auth` schema**: the standard Better Auth tables plus
`message_log(id, user_id, created_at)` indexed on `(user_id, created_at)`, which is the quota ledger.

`isConversationEmpty`, `findExistingEmptyConversation`, and `pruneEmptyConversations`
(`src/lib/db/conversations.ts`) maintain a single-empty-chat invariant: "New Chat" on an already-empty chat is
an inert no-op, and from a started chat it navigates to an existing empty chat rather than allocating a new row.
The sidebar splits pinned chats into their own section above the rest. Legacy rows with no `userId` stay visible
for backwards compatibility.

## 7. Auth & Quota

Three independent layers: the *proxy* (`src/proxy.ts`) does a cheap cookie pre-check and adds security headers,
with a matcher covering `/`, `/chat-id/:path*`, `/api/agent`, and `/api/agent/:path*`; the *route guard*'s
`auth.api.getSession` against Postgres is the authoritative check; and *client-side RLS* compares
`conversation.userId` with the session user, with `ChatPageClient` redirecting to `/` on a mismatch and
`useChatSession` computing the same flag.

**Sliding-window quota**: 10 messages per 5 hours and 50 per 7 days. `checkAndIncrementRateLimit` runs
purge-old-rows, window counts, and a conditional insert in one atomic CTE, so concurrent requests cannot
oversubscribe. `refundRateLimit` deletes the row on inference failure. `getRateLimitStatus` backs the read-only
`GET /api/user/rate-limit` snapshot, and 429 responses add `Retry-After` and `X-RateLimit-Retry-After`.

## 8. Client Rendering

`src/app/chat-id/[id]/page.tsx` is an ultra-lean route wrapper; `ChatPageClient` composes three pillars —
`Sidebar`, a centre `StickToBottom` viewport, and `WorkspaceDrawer` — and coordinates them.

Messages go through `flattenMessageSegments` (`src/agent/client/segments.ts`), which turns a raw UI message into
render-ready segments. While streaming, parts stay ungrouped and arrive in real time; once the turn ends, all
pre-answer output (narration, reasoning accordions, tool cards) folds into a single collapsible `work-group` and
only the final answer stays in the body. `MessageRow` is memoized inside `MessageList.tsx` with a comparator on
message identity and streaming state, which keeps historical turns from re-segmenting during an active stream.

`ChatInputContext` is an imperative handle so the empty-state suggestion chips can inject a prompt without a
parent re-render. `ChatUIContext` holds the mobile sidebar drawer, the desktop collapse (both persisted in
`sessionStorage`), and the workspace drawer state. `RateLimitContext` is the only app-wide provider, mounted in
the root layout with SSR-seeded quota data. The sidebar footer mounts `AccountMenu`, a dropup consolidating
profile details, numeric quota meters for both windows with reset countdowns, and the light/dark switch; the
header carries the context-window badge, the token-usage popover, and the workspace drawer trigger, while the
input toolbar carries the model and thinking-level selector.

Performance work is concentrated here: message updates are throttled to one React render per animation frame
(structural changes apply immediately), workspace writes are coalesced on a 150 ms timer and short-circuit when
content is unchanged, the workspace drawer body is GPU-composited with `translateZ(0)` and contains its own
overscroll, and Shiki highlights are cached, debounced, and prewarmed on idle.

## 9. Markdown & Code

`MarkdownRenderer` renders every markdown surface through Streamdown with `@streamdown/math` for KaTeX formulas.
It has four variants — `assistant`, `user`, `thought`, `canvas` — and `createMarkdownComponents` supplies the
shared element map, including an href allowlist restricted to `https`, `http`, and `mailto` that neutralises
`javascript:` and `data:` URLs.

Two highlighters serve different surfaces. Shiki (`src/lib/code/shiki-highlighter.ts`) runs on the JS regex
engine with no WASM, debounces 120 ms, and caches up to 500 results; it serves chat code snippets through
`CodeSnippetBlock`. PrismJS (`src/lib/code/syntax-highlighter.ts`) is synchronous and serves the line-numbered
workspace viewer. The `pre` and `code` renderers in the markdown element map route to the Shiki-backed
`CodeSnippetBlock`.

## 10. Observability & Errors

`src/instrumentation.ts` starts an OpenTelemetry `NodeSDK` with a Langfuse span processor on the Node runtime
and registers the AI SDK telemetry integration. The stream responder opens a Langfuse trace (`agent-workspace`
or `context-compaction`) carrying model id, thinking level, and provider, and force-flushes on stream end.

`classifyProviderError` (`src/agent/core/error-classifier.ts`) maps provider failures onto a fixed taxonomy —
provider rate limit, provider restricted, safety filter, context exceeded, authentication error, aborted,
network error, inference failure — each with a retryable flag. `handleRunnerError` turns that into an `error`
stream part and triggers the quota refund. On the client, `handleChatError` stops the stream, surfaces quota
cards for 429, and replaces the in-flight assistant message with friendly copy that is then persisted.

## 11. Limits & Constraints

All numeric limits live in `src/lib/limits.ts`. The ones that shape architecture: the message and attachment
caps, enforced both in the input and again in the route guard; the image downscaling and document text caps
applied during ingestion; the per-workspace file count and character budgets enforced by the workspace tools;
the Tavily page, pool, and snippet caps; the two quota windows; the agent step clamp; and `NEAR_LIMIT_PERCENT`,
which the system prompt and the UI share so both flip into "be concise" mode at the same threshold.

## 12. Tests

Suites live under `__tests__/` in domain folders — `agent/`, `lib/`, `routes/` — plus a root-level
`proxy.test.ts`: 35 files, 97 describe blocks, 472 test cases, run with `bun test --isolate`. Shared fixtures
(`makeFile`, `runTool`, `setupWorkspaceTools`, `jsonResponse`, `withEnv`) come from `__tests__/helpers.ts`.
Route tests `mock.module` the auth server, the rate-limit module, and the runner before dynamically importing
the route.
