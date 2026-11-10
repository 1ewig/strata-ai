# Strata AI — System Architecture

Strata AI is a local-first conversational workspace studio. A user prompts an autonomous
agent that runs multi-step tool loops, reading, writing, and editing a durable multi-file
workspace presented in a slide-over canvas drawer alongside the chat.

## 1. Core Architecture Principles

Three design principles explain nearly every architectural decision across the codebase:

- **Local-First Storage:** Conversations, messages, and workspace files live entirely in the
  user's browser via Dexie (IndexedDB). The server never stores user documents or message histories.
- **Stateless Gateway:** The backend is a lightweight gateway: session validation, an
  atomic Postgres rate-limit quota ledger, and streaming LLM inference via Vercel AI SDK 7.
- **Compaction over Truncation:** Context limits are managed via `/compact`, which distills
  preceding history into an anchor summary message. Server routes automatically prune turns
  prior to the latest anchor on subsequent interactions.

## 2. Tech Stack & Repository Map

- **Runtime & Toolchain:** Next.js 16.4.2 (App Router, Node runtime), React 19.2, TypeScript 7, Bun 1.4.4.
- **AI Layer:** Vercel AI SDK 7 with Google Generative AI and Fireworks providers, plus Tavily for web research.
- **Persistence & Auth:** Dexie 4 (browser IndexedDB), Supabase Postgres (`pg` Pool), Better Auth (Google OAuth).
- **Observability & Styling:** OpenTelemetry NodeSDK with Langfuse, Tailwind CSS v4 (`@theme`), Motion.

| Directory | Core Responsibilities |
|---|---|
| `src/agent/` | Server runner, stream responder, 8 agent tools, system prompts, error classifier |
| `src/app/` | Thin App Router shells, API route handlers (`/api/agent`, `/api/agent/compact`), root `loading.tsx` |
| `src/components/` | Presentational React: `chat/` (header, hero, input, message, tools), `workspace/`, `sidebar/`, `auth/`, `landing/`, `ui/` |
| `src/hooks/` | State & side-effect owners: chat session, transport, compaction, conversations, auth, common |
| `src/contexts/` | Scoped providers: `RateLimitContext` (app-wide), `ChatUIContext`, `ChatInputContext` |
| `src/lib/` | AI catalog, Dexie database, syntax highlighters, limits, and server quota ledger |
| `src/proxy.ts` | Edge middleware enforcing cookie validation and strict HTTP security headers |

## 3. End-to-End Request Lifecycle

1. **Compose:** `ChatInput` and `useChatInputController` gather text, images, and documents;
   `useChatSession` orders the typed message parts (images first, documents second, user text third)
   and pre-checks token limits and rate limits.
2. **Proxy Gate:** `src/proxy.ts` performs a cookie pre-check on protected routes, redirecting
   unauthenticated visitors to `/auth` (which forwards to `/auth/signin`) with security headers
   (`nosniff`, `DENY`, `strict-origin-when-cross-origin`).
   Private `/chat-id/*` paths drop the `callbackUrl` query parameter so chat IDs are not leaked across accounts.
3. **Route Guards:** `withAgentRouteGuards` validates the session against Postgres via Better Auth,
   parses request schemas, prunes compacted history, enforces semantic size bounds (message length,
   replayed-history budget, workspace file caps), and reserves quota in Postgres before inference begins.
4. **Stream Assembly:** `createUIStreamResponder` resolves the model, converts message history,
   strips image attachments when targeting text-only models, applies word-level `smoothStream`
   (25ms) and tool-delta coalescing, and initiates the `streamText` loop with tool execution.
5. **Client Application:** `useChat.onData` processes real-time workspace mutations. Messages are
   throttled to `requestAnimationFrame` before reaching React, keeping rendering synced to the display refresh rate.
6. **Reconciliation:** On stream completion, `reconcileFinishedStep` persists messages to Dexie,
   syncs file deltas, and automatically schedules continuation turns (capped at 2 per user turn)
   after 300ms whenever the model finishes on a `step-limit` reason.

## 4. The Autonomous Agent & Tool Loop

The agent loop runs up to `maxSteps` (default 25, clamped 1–30) with access to 8 tools sharing
a mutable workspace context:

- **6 Workspace Tools (`src/agent/tools/workspace-tools.ts`):** `listFiles`, `readFile`, `writeFile`,
  `editFile`, `renameFile`, `deleteFile`. Mutating operations emit SSE `data-workspace` events for
  live client drawer updates.
- **`StringEditEngine` (`src/agent/tools/edit-engine.ts`):** Multi-tier targeted editing using exact
  substring match, whitespace-normalized line matching, and anchor-line bounding. Ambiguous matches
  fail cleanly with an actionable error rather than guessing.
- **2 Tavily Tools (`src/agent/tools/tavily-tools.ts`):** `webSearch` and `extractUrl` for real-time
  web research, with native favicon extraction, word-boundary snippet truncation, and per-page content caps.
- **Dynamic Prompts (`src/agent/prompts/system.ts`):** Assembles disciplined system instructions
  embedding active file manifests (`name`, `language`, character count, `id`), temporal calendar
  context, dynamic token occupancy, and answer-first formatting guidelines without conversational fluff.

## 5. Streaming, Markdown & Reasoning Engine

The UI consumes a structured Server-Sent Events (SSE) stream:

| Part Type | Generator | Consumer Component |
|---|---|---|
| `text` | `smoothStream` word chunks | `MarkdownRenderer` (`assistant` variant) |
| `reasoning` | Model thinking stream | `ThoughtAccordion` (`thought` variant) |
| `tool-call` / `tool-result` | Tool execution pipeline | `ToolCallCard` (coalesced by callId) |
| `data-workspace` | Mutating workspace tools | `useChatSession.onData` $\rightarrow$ `useWorkspaceFiles` |
| `error` | Runner error handler | Client chat error banner (refunds quota except on user aborts) |

- **Streaming Thought Accordion:** `ThoughtAccordion` uses `useAccordionOpenState` to auto-expand
  while reasoning tokens stream, and auto-collapses on completion with user manual toggle override.
- **Live Markdown:** Built on `Streamdown` with incremental `remend` parsing and KaTeX math support.
  Settled blocks are memoized; incoming words animate smoothly without AST re-parsing freezes.
  Supports 4 variants (`assistant`, `user`, `thought`, `canvas`) with strict URL protocol sanitization.
- **Dual Highlighting:** Code blocks in chat use `Shiki` (zero-WASM JS engine, 120ms debounce during
  streams, 500-entry memory cache with oldest-entry eviction). The workspace file viewer uses
  synchronous `PrismJS`.

## 6. Context Compaction Architecture

Rather than dropping old messages through naive sliding-window truncation, Strata AI preserves
long-running workspace memory through compaction:

- **Anchor Generation:** The user or agent triggers `/compact`, sending the conversation history
  to `/api/agent/compact`. The model distills the interaction history, decisions made, and active
  file contents into an anchor summary message with a 3,500-token output budget and `isCompactedSummary` metadata.
- **Server History Pruning:** `sliceMessagesAfterCompaction` identifies the latest anchor message
  in the message history and drops all preceding turns before handing off to the inference runner.
- **Metrics Reset:** `calculateTokenMetrics` resets measured active context usage back to a lean
  baseline as soon as the anchor message becomes the foundation of the active turn.

## 7. Persistence & Rate Limiting

- **Client Storage (Dexie 4, IndexedDB schema v5):**
  - `conversations`: Stores conversation metadata, pinned status, model settings, and embedded `files: WorkspaceFile[]`.
  - `messages`: Stores serialized AI SDK messages indexed by `chatId`, `userId`, and strictly monotonic timestamps.
  - *Single-Empty-Chat Invariant:* `findExistingEmptyConversation` and `pruneEmptyConversations` prevent
    orphaned chats by reusing existing empty states on "New Chat" clicks. Pinned chats partition into an upper tier.
- **Atomic Quota Ledger (Postgres):**
  - Enforces a sliding-window rate limit: 10 messages per 5 hours and 50 messages per 7 days.
  - Implemented in `src/lib/server/rate-limit.ts` using an atomic CTE query (purge, count,
    conditional insert) serialized by a per-user `pg_advisory_xact_lock` so concurrent requests
    cannot all reserve a slot from the same pre-insert window counts.
  - Failed inferences trigger `safeAsyncRefundRateLimit` to delete the reserved row; user-initiated
    aborts (stop button, disconnect) deliberately consume the slot, since provider tokens were spent.
  - Quota errors surface standard `Retry-After` and `X-RateLimit-Retry-After` response headers.
- **Server-Side Payload Bounds:** Route guards validate client-supplied state before reserving quota:
  `MAX_MESSAGE_CHARS` per message (enforced on parts-based messages), `MAX_HISTORY_CHARS` (200k)
  across the replayed history, and workspace file caps (`MAX_FILES_PER_WORKSPACE`,
  `MAX_FILE_CHARS`, `MAX_WORKSPACE_TOTAL_CHARS`). The compaction route is size-cap exempt — it is
  the recovery path for oversized histories and must always stay reachable.
- **Client-Side RLS:** Verifies `conversation.userId` matches the active session, instantly bouncing
  cross-account access attempts.

## 8. UI Shell & Auth Experience

- **3-Pillar Workspace:** Collapsible `Sidebar` (off-canvas on mobile), central `StickToBottom`
  message viewport, and slide-over `WorkspaceDrawer`.
- **Pre-Answer Folding:** Intermediate narration, reasoning accordions, and tool cards fold into a
  compact `WorkGroupCard` upon completion, keeping the chat feed focused on the final answer.
  Pre-tool/pre-reasoning text is classified as a first-class `narration` segment in
  `flattenMessageSegments` (no `isIntermediate` flag or last-segment heuristics) and rendered by a
  shared `NarrationText` component — non-italic, arrow-marked secondary prose — visually distinct
  from italic reasoning bodies and the 16px final response.
- **Single-Click Auth:** Streamlined Google OAuth login via Better Auth, automatically routing to
  preserved callback URLs.
- **Unified Page Loaders:** `LoadingScreen` is a minimal CSS-only spinner (no client JS) used by
  App Router `src/app/loading.tsx` and all auth, landing, and workspace surfaces. On refresh,
  `PageLoadGate` in `src/app/layout.tsx` overlays SSR'd children with the same loader until
  hydration completes (via `useHydrated`), holding a 300ms anti-flicker floor and fading out over
  300ms without delaying LCP.

## 9. Numeric Boundaries & Design System

- **Numeric Limits (`src/lib/limits.ts`):** Enforces strict guardrails across message length,
  attachment sizes, per-workspace file counts, and character budgets. `NEAR_LIMIT_PERCENT` (80%)
  signals both the system prompt and UI meter to flip into concise, conservative operation.
- **Semantic Tokens:** Built entirely with Tailwind CSS v4 `@theme` design tokens (`surface-base`,
  `surface-elevated`, `text-primary`, `edge-raised`, `accent`). No hardcoded colors or raw utility
  palettes exist in views, ensuring consistent theme adaptation.

## 10. Observability & Testing

- **Telemetry:** OpenTelemetry NodeSDK (`src/instrumentation.ts`) streams structured Langfuse traces
  carrying model ID, thinking level, and provider for all agent runs and compactions.
- **Error Classifier:** `classifyProviderError` maps vendor exceptions (safety, rate limit, context
  length, network) to actionable client alerts without leaking raw backend payloads.
- **Test Suite:** 496 isolated tests across 36 files in `__tests__/` covering routes, tools, engines,
  rate-limiting, and utilities, run via `bun test --isolate`.
