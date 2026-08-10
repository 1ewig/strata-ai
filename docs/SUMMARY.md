# Strata AI - System Context & Architecture Guide

> Primary context document for AI agents. Written from current source state — verify claims by re-reading the files it points to before editing.
>
> Pair with [`ai-sdk-nextjs-guide.md`](./ai-sdk-nextjs-guide.md) — the beginner-to-advanced tutorial on building chatbots and agentic apps with AI SDK 7 + Next.js 16, grounded in this codebase. This file is the *what/when/where*; the guide is the *how/why*.

## 1. Executive Summary & Domain Purpose

- **What it is:** Strata AI is an AI-powered "agentic workspace studio" — a chat-first app where users create, edit, analyze, rename, and organize multi-file workspaces (documents, markdown notes, code snippets) through a conversational interface backed by Google Gemini models.
- **Core mechanic:** The assistant executes 8 schema-validated tools (6 workspace tools + `webSearch` & `extractUrl`) in multi-step agentic loops, mutating files live. Content lives in files on a "canvas" (Workspace Drawer); chat is the control surface.
- **Target audience:** Individual power users (job-seeker document workflows were the original focus) who want a local-first AI document studio without cloud sync complexity.
- **Business problem solved:** (a) Putting durable, structured content into files instead of disposable chat messages; (b) precise, non-destructive AI edits via a surgical string-edit engine; (c) no-database-setup local persistence via IndexedDB.
- **Core feature surface:**
  - Multi-step agentic file operations & web research — the model chains `readFile` → `editFile`/`writeFile` or `webSearch` → `extractUrl` across up to 75 tool steps.
  - Multi-file workspace canvas — a slide-over drawer to create, rename, edit, delete, and preview files; markdown rendered or edited as raw text.
  - Live streaming UX — word-paced tokens, reasoning/thought accordion, tool-execution cards, animated streaming caret.
  - Per-conversation model + thinking-level selection with localStorage memory and conversation-level override.
  - Full conversation history persisted locally in IndexedDB with a sidebar conversation switcher.
  - Quota-aware usage: server-enforced message caps surfaced as a live "X left" ring and countdown error cards.
  - Light + dark theme toggle (dark mode ships despite AGENTS.md describing a light-only app — see Appendix).
- **Operational / non-functional posture:**
  - **Security:** Email+password auth (Better Auth), pre-render route guards in the Next.js 16 proxy, session-verified API routes, security headers (nosniff, DENY frames, strict-origin referrer).
  - **Abuse control:** Database-backed sliding-window rate limiting (10 msgs / 5h, 50 msgs / week) enforced at the API route and mirrored into the UI in real time.
  - **Performance:** Word-paced streaming (`smoothStream`, 25ms) + live Markdown AST streaming via `SmoothStreamText`, metadata-only system prompt to minimize token context, observer-driven auto-scroll, `React.memo` on hot chat components.
  - **Compliance:** No PII stored server-side beyond auth identity; all workspace data is client-local in the browser's IndexedDB.
- **Deployment:** Standalone Next.js output (`next build` → `node .next/standalone/server.js`), hosted on Vercel; live at strata-ai-five.vercel.app.
- **Known evolution gap:** Only auth + rate-limit tables live in Postgres; conversations/messages/files remain client-local (Dexie). A server-side persistence migration is a possible future direction but is not planned in-repo.

## 2. Technical Stack & Infrastructure

| Layer | Technology / Library | Purpose in this Project | Key Configuration / Notes |
|-------|---------------------|-------------------------|---------------------------|
| Framework | Next.js 16.2.10 (App Router, `src/` layout) | SSR, dynamic routes, streaming API routes, standalone build | `output: 'standalone'`; `reactStrictMode: true`; `transpilePackages: ['motion']`; TS build errors NOT ignored |
| React | 19.2.7 (`react`, `react-dom`) | UI runtime | App is almost entirely Client Components; only layout/auth-redirect/404 pages are server-rendered |
| Language | TypeScript 6.0.3 (strict) | Type safety everywhere | Path alias `@/*` → `./src/*`; target ES2017; `moduleResolution: bundler`; `next` plugin |
| Runtime / Package Manager | bun | Dev server, build, lint, scripts | Never use npm/yarn/npx (AGENTS.md rule) |
| AI SDK | `ai@^7.0.0` | Unified LLM streaming, tool calling, message streams | `streamText`, `tool()`, `smoothStream`, `isStepCount`, `toUIMessageStream`, `createUIMessageStreamResponse`, `convertToModelMessages` |
| Google Provider | `@ai-sdk/google@^4.0.0` | Gemini model access | `google(modelId)`; `thinkingConfig.includeThoughts` reasoning; key `GOOGLE_GENERATIVE_AI_API_KEY` |
| Fireworks Provider | `@ai-sdk/fireworks@^3.0.0` | Fireworks-hosted model access (DeepSeek V4 Flash) | `fireworks(modelId)`; top-level `reasoning` → `reasoning_effort`; native `reasoning_content` parsing; key `FIREWORKS_API_KEY` |
| Web Search | Tavily REST API (direct `fetch`) | Real-time search + page extraction tools (`webSearch`, `extractUrl`) | No SDK — shared `callTavilyApi` helper in `lib/ai/tools/tavily-tools.ts`; key `TAVILY_API_KEY` (optional) |
| React AI Hooks | `@ai-sdk/react@^2.0.0` | `useChat` + `DefaultChatTransport` on the client | Custom transport wraps `fetch` to capture rate-limit headers |
| Client Database | Dexie 4 + `dexie-react-hooks` | Local-first IndexedDB persistence: conversations, messages, files | Schema v5 (`userId` indexing for per-user session isolation); `useLiveQuery` for reactive lists |
| Server Database | Supabase PostgreSQL via `pg` Pool | Better Auth identity + rate-limit log | Connection string `DATABASE_URL` (pooler :6543); `search_path=better_auth,public` |
| Auth | Better Auth 1.6.25 + `nextCookies()` plugin | Email/password sessions, cookies, session cache | Server instance `lib/auth.ts`; client instance `lib/auth-client.ts`; `BETTER_AUTH_SECRET`; no email verification |
| Styling | Tailwind CSS 4.1 (`@tailwindcss/postcss` + autoprefixer) | Utility-first UI on "Milo" design tokens | `@theme` block in `globals.css`; light + dark token sets; semantic text-size tokens (`text-micro` 11px → `text-display` 32px) — raw `text-xs`/`text-sm`/`text-[10px]`/`text-[11px]` are never used in components |
| Animations | `motion` (Framer Motion 12) | Spring slide-in for Workspace Drawer, AnimatePresence | Transpiled by Next (`transpilePackages`) |
| Markdown | `react-markdown@10` + `remark-gfm@4` | Chat bubble + drawer markdown rendering | Custom components for headings, fenced code w/ copy, tables, blockquotes |
| Validation | `zod@^4.4.3` | API body parsing, tool input/output schemas | `zod` v4 API (no `z.string().min()` legacy pitfalls) |
| Icons | `lucide-react@^0.553` | Iconography | Custom `StrataIcon` SVG brand mark in `components/ui/` |
| Auto-scroll | `use-stick-to-bottom@^1.1` | Chat auto-scroll via ResizeObserver/MutationObserver | `<StickToBottom>` wraps ChatPanel; no manual scroll effects |
| Build Tooling | ESLint 9 (`eslint-config-next`) | Linting | `bun run lint` = `eslint .` |
| Testing | NONE | — | No test framework configured; no unit/integration tests in repo |

**Environment variables** (`.env.example` is authoritative): `GOOGLE_GENERATIVE_AI_API_KEY` (required), `FIREWORKS_API_KEY` (required for Fireworks-hosted models), `NEXT_PUBLIC_GEMINI_MODEL` (default model), `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase project), `DATABASE_URL` (Postgres pooler), `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (auth client base URL), `TAVILY_API_KEY` (optional, for web search & extraction).

**Runtime scripts** (all via `bun run`):

| Script | What it does | Notes |
|--------|--------------|-------|
| `dev` | Start Next.js dev server | `next dev` |
| `build` | Production build | `next build`; also the gate for lint/typecheck |
| `start` | Serve production build | `node .next/standalone/server.js` (standalone output) |
| `lint` | ESLint | `eslint .` — must pass before finishing work |
| `clean` | `next clean` | Clears `.next` |
| `db:migrate` | Run Better Auth schema migration | Executes `scripts/better-auth-schema.sql` via `scripts/migrate-better-auth-schema.ts` |
| `db:test` | DB + schema healthcheck | `scripts/test-db.ts` — verifies connection and `better_auth` tables |

## 3. High-Level Architectural Mental Model

### 3.1 End-to-end request flow (a user message)

1. User types in `ChatInput` → `handleSendMessage` in `hooks/useChatSession.ts` (auto-title if new chat, local quota pre-check).
2. `chat.sendMessage({ text })` on a `useChat` instance whose `transport` is built via `useChatTransport`; the transport's body closure snapshots current model, thinking level, and workspace files via refs.
3. Request passes through `src/proxy.ts` (Next.js 16 proxy, the middleware replacement): session-cookie check + security headers.
4. `app/api/agent/route.ts` (Route Handler) verifies the session server-side with `auth.api.getSession`, then calls `checkAndIncrementRateLimit(userId)`.
5. Body is parsed with Zod (`messages`, `files`, `model`, `thinkingLevel`, `maxSteps`).
6. Stream assembly is delegated to `runAgentResponse` (`lib/ai/agent-runner.ts`): it resolves the provider model (Google or Fireworks via `lib/ai/providers.ts`), builds a 6-section `buildSystemInstruction(files)` prompt, `convertToModelMessages(messages)`, and `createWorkspaceTools(...)` bound to a per-request `createMutableWorkspace` (`lib/ai/workspace.ts`) whose closures mutate an in-memory `files` array.
7. The response is returned as an SSE UI-message stream (`createUIMessageStreamResponse` + `toUIMessageStream`), carrying `X-RateLimit-Remaining-5h` / `X-RateLimit-Remaining-Week` headers.
8. `useChat` updates `chat.messages` + `chat.status` reactively; the UI renders streaming text, reasoning accordion, and tool cards.
9. `onFinish` (handled by `chat-reconciler.ts`) persists every message as a native AI SDK `UIMessage` into Dexie, extracts file create/edit/delete results from tool parts, merges them into the conversation's `files` array, and persists. Auto-continuation fires if `finishReason === 'step-limit'` (up to 2 more passes).

### 3.2 Server vs. Client boundary strategy

- **The boundary sits at the route handlers / API surface.** There are essentially no shared Server Components: `app/layout.tsx` is async (SSR rate-limit hydration), `app/auth/page.tsx` is a server redirect, `app/not-found.tsx` is static, and the three route handlers are server code.
- Every interactive page (`/`, `/auth/signin`, `/auth/signup`, `/chat-id/[id]`) is `'use client'`. `chat-id/[id]/page.tsx` is intentionally a **thin shell** (~200 lines): it reads `use(params)` for the id, calls the feature hooks (`useChatSession`, `useConversations`, `useSignOut`, `useTheme`), and threads the results to child components as props. Components themselves are purely presentational — no database queries, session fetching, or auth calls inside them.
- **Why this shape:** the entire product is a client-side, local-first interaction (IndexedDB, streaming chat, drawer editing). SSR is used only where it pays off: auth redirects, metadata, and hydrating the rate-limit quota without a client fetch waterfall.
- Rule of thumb: server code never imports Dexie; client code never imports the `pg` Pool. The shared seam is `lib/schemas.ts` (Zod types) used on both sides.

### 3.3 Caching, revalidation & rendering strategy

- **No data cache layer, no ISR/SSG, no revalidate tags.** The product is fully dynamic: every route responds per-request; chat content is streamed live.
- The only "caching" is (a) Better Auth `session.cookieCache` (5-min in-memory session cache on the server), and (b) `localStorage` for model + thinking-level preferences.
- Rendering is dynamic SSR for the root layout and client-side rendering everywhere else; streaming is used for the agent response.

### 3.3a Next.js 16 features in use (explicit map)

- **`proxy.ts` (middleware replacement):** Next 16 `proxy` export with a `config.matcher` (`/`, `/chat-id/:path*`, `/api/agent`) doing the pre-render session guard + security headers — not a `middleware.ts` file.
- **Route Handlers are the only server surface:** `/api/agent`, `/api/auth/[...all]`, `/api/user/rate-limit` are the sole server components besides the async `layout.tsx`, a redirect page, and the static 404.
- **Dynamic routes only:** no `generateStaticParams`/`dynamicParams`; `chat-id/[id]` uses async `params` unwrapped with `use(params)` (Next 16 convention).
- **Streaming:** SSE UI-message responses (`createUIMessageStreamResponse`) for the agent endpoint; no Suspense-based HTML streaming is used.
- **Rendering posture:** RSC only where it pays off (layout hydration, redirects, metadata, 404); every interactive page is `'use client'`.
- **Build/deploy:** `output: 'standalone'` for `node .next/standalone/server.js`; strict TS build errors; `reactStrictMode`; no partial pre-rendering.

### 3.4 Authentication & authorization flow

- **Auth provider:** Better Auth 1.6 (server instance in `lib/auth.ts` with a `pg` Pool and `search_path=better_auth,public`; React client in `lib/auth-client.ts`). Email/password only, no email verification, no OAuth providers.
- **Proxy (pre-render guard):** `src/proxy.ts` matches `/`, `/chat-id/:path*`, `/api/agent`. Public routes (`/auth`, `/api/auth`) and static assets bypass. Without a session cookie it redirects to `/auth?callbackUrl=...` for pages or returns 401 JSON for APIs. It also stamps security headers.
- **Route-handler guard:** `/api/agent` and `/api/user/rate-limit` re-verify via `auth.api.getSession({ headers })` server-side (proxy check is cookie-presence only, not full verification).
- **Client guards:** pages use `useSession()` from the auth client; unauthenticated visitors are `router.replace`'d to `/auth?callbackUrl=...`.
- **RBAC:** none — all authenticated users are equal. Access control is binary (signed-in / signed-out).

### 3.5 The three persistence touchpoints (critical mental model)

| Layer | What holds state | Purpose | Writes happen |
|-------|------------------|---------|---------------|
| **Dexie (IndexedDB)** | `conversations` + `messages` tables | Durable client-side state across reloads and chat switches | `onFinish` (messages + file merges), `saveWorkspaceFile`/`deleteWorkspaceFile`, title/model updates |
| **Request body snapshot** | `files` array serialized into the transport body | Gives the stateless API route the current workspace so tools can operate | Each `sendMessage` via `filesRef.current` |
| **API-route `mutableFiles[]`** | In-memory array mutated by tool closures during one request | Single source of truth for tool reads/writes within a stream; synced back via tool-result parts | Tool `execute()` callbacks (`onUpdateFile`/`onDeleteFile`) |

The API route is intentionally **stateless**: it reconstructs workspace state from the request body on every call and never persists anything itself. Whatever tool results mutate during the stream are reflected in the SSE tool parts, and the client's `onFinish` is the single reconciliation point that merges them back into Dexie.

### 3.6 Streaming, reasoning & rendering pipeline

1. `streamText` output is wrapped with `createUIMessageStream(({ writer }))` → `createUIMessageStreamResponse` → an SSE stream piping both custom `data-workspace` live file events (`writer.write`) and UI message deltas to the client's `onData` handler.
2. `smoothStream({ delayInMs: 25, chunking: "word" })` paces token delivery so the UI reads as continuous prose, not bursty chunks. `ChatBubble` delegates active text segment rendering to `SmoothStreamText`, which parses live GitHub-Flavored Markdown with an active streaming caret. The `prepareStep` hook re-injects `buildSystemInstruction(mutableFiles)` before each agent step so the model's file-state view is always current.
3. Reasoning/thinking text (enabled via `thinkingConfig.includeThoughts`) arrives as reasoning parts; `ChatBubble` renders them inside a collapsible `ThoughtAccordion` (`Thinking (Xs)…` live timer / `Thought for Xs`, spinner while in progress). While actively thinking (`isThinking === true`), expanded thinking text renders as plain pre-wrap font-mono to eliminate 60 Hz Markdown AST re-parsing, upgrading to formatted `ReactMarkdown` once thinking completes.
4. Tool invocations arrive as tool parts; `resolveToolDisplay` normalizes each into `ToolCardProps` and `ToolCallCard` renders a minimal, lightweight UI (unique Lucide icon, tool name, `loading` / `success` / `fail` status badge, and a concise file or search URL summary in the dropdown). **Streaming vs Finished grouping:** While the agent is working (`isStreaming === true`), ChatBubble renders all work items (reasoning accordions, intermediate text narration, and tool call cards) **ungrouped and live in stream order**. Once inference finishes (`isStreaming` flips to false), the memo recomputes and folds all pre-answer output into a **single collapsible `WorkGroupCard`** ("Working (Xs)..." live → "Worked for Xs") that auto-collapses, leaving only the final assistant answer bubble. Intermediate text narration lives inside the expanded group card. `ToolCallCard` uses a custom `areToolCallCardPropsEqual` comparator in `React.memo` that skips intermediate re-renders while multi-KB argument strings (e.g. `writeFile`/`editFile` content) stream in. The other hot streaming components (`ChatBubble`, `WorkspaceDrawer`, `ChatInput`, `Sidebar`) are `React.memo`'d, and the workspace/drawer handlers (`handleSelectFile`/`handleCreateFile`/`handleUpdateFile`/`handleDeleteFile`) plus model handlers are stable `useCallback`s — the unmemoized `WorkspaceDrawer` re-running `ReactMarkdown` on every 15 ms delta was the primary length-scaled freeze hotspot. The AI SDK `useChat` reducer `structuredClone`'s only the in-flight message, so completed bubbles keep reference identity and memoization skips them during streaming.
5. `useChat` `status` (streaming / submitted / ready) drives `isLoading`, the typing-dots loader, the streaming caret + shimmer overlay, and `<StickToBottom resize="auto">`-based auto-scroll.
6. `stopWhen: isStepCount(maxSteps)` caps agentic tool loops; on `step-limit` finish the client auto-continues (see §7.4).

## 4. Directory Structure Map

Indented ASCII tree (annotations state each node's exact responsibility):

    Strata Ai/
    ├── src/
    │   ├── proxy.ts                  # Next.js 16 proxy: session-cookie pre-render guard + security headers
    │   ├── app/                      # App Router root
    │   │   ├── layout.tsx            # Root layout: fonts, theme bootstrap script, SSR rate-limit hydration via RateLimitProvider
    │   │   ├── page.tsx              # "/" client redirector: latest Dexie conversation or a new UUID chat
    │   │   ├── globals.css           # Tailwind import, Milo @theme tokens (light + dark), keyframes (blink/fadeIn/shimmer/caret)
    │   │   ├── not-found.tsx         # Branded 404 page
    │   │   ├── auth/
    │   │   │   ├── page.tsx          # Server redirect → /auth/signin
    │   │   │   ├── signin/page.tsx   # Client: session-guarded sign-in form (Suspense-wrapped for useSearchParams)
    │   │   │   └── signup/page.tsx   # Client: session-guarded sign-up form
    │   │   ├── chat-id/[id]/page.tsx # Client: thin chat shell — wires useChatSession/useConversations/useSignOut/useTheme to Sidebar/Header/Panel/Input/Drawer
    │   │   └── api/
    │   │       ├── agent/route.ts    # POST /api/agent — streaming agent endpoint (auth + rate limit + streamText + SSE)
    │   │       ├── auth/[...all]/route.ts  # Better Auth Next.js catch-all (GET/POST from toNextJsHandler)
    │   │       └── user/rate-limit/route.ts # GET quota status (auth-verified)
    │   ├── components/
    │   │   ├── Sidebar.tsx           # Pure presentational sidebar component (receives conversations, active ID, new/delete/rename/pin handlers; 3-dots overflow menu & inline title editing; confirm-to-delete chat dialog)
    │   │   ├── theme-toggle.tsx      # Pure presentational dark-mode toggle (isDark/onToggle props; logic in useTheme hook)
    │   │   ├── auth/                 # auth-shell (card layout), loading-screen, sign-in-form, sign-up-form, user-button (profile + sign-out)
    │   │   ├── chat/
    │   │   │   ├── ChatPanel.tsx     # Message list, empty state, typing dots, QuotaErrorCard slot
    │   │   │   ├── ChatBubble.tsx    # Per-message renderer: user bubble / markdown + ThoughtAccordion + ToolCallCard segments, grouped via WorkGroupCard
    │   │   │   ├── SmoothStreamText.tsx # Renders live streaming Markdown with an active streaming caret
    │   │   │   ├── WorkGroupCard.tsx # Single auto-collapsing group of all pre-answer output (intermediate text + reasoning + tool calls)
    │   │   │   ├── ChatInput.tsx     # Shell for textarea input, auto-resizing, submit handling & composition
    │   │   │   ├── ModelSelectorMenu.tsx # Model dropdown trigger, featured models, effort flyout & overflow submenus
    │   │   │   ├── RateLimitRing.tsx # Quota progress SVG ring & hover popover tooltip (rendered in sidebar footer)
    │   │   │   ├── ChatHeader.tsx    # Mobile hamburger, title, active context-window meter, mobile "New chat" plus button, workspace Files dropdown
    │   │   │   ├── TokenUsagePopover.tsx # Popover card: active context bar, input/output, session total, total estimated $ cost + per-model breakdown (tap-away dismiss)
    │   │   │   ├── QuotaErrorCard.tsx# Alert with live countdown when quota exhausted
    │   │   │   ├── ThoughtAccordion.tsx  # Collapsible reasoning/thought display
    │   │   │   ├── ToolCallCard.tsx  # Generic accordion tool-card chrome — NEVER needs edits when tools change
    │   │   │   └── tools/resolver.tsx    # extractToolInfo + resolveToolDisplay → ToolCardProps (per-tool UI config + summaries)
    │   │   ├── workspace/WorkspaceDrawer.tsx # Slide-over: file switcher, create/edit/delete, markdown preview vs raw editor, footer actions
    │   │   └── ui/
    │   │       ├── strata-icon.tsx   # Brand SVG logo (currentColor or gradient)
    │   │       └── ConfirmDialog.tsx # Portaled modal for destructive confirmations (sign-out, delete file, delete chat)
    │   ├── contexts/RateLimitContext.tsx # Global quota provider: SSR hydration, render-phase rehydration, fetch fallback, setQuotaError
    │   ├── hooks/
    │   │   ├── useChatSession.ts     # Orchestration core: delegates to transport, error handler, reconciler, and sub-hooks
    │   │   ├── useChatTransport.ts   # Custom DefaultChatTransport creation, rate-limit header parsing & error throwing
    │   │   ├── useConversations.ts   # Conversation list + create/delete/rename/pin with navigation (Dexie v5 live query, pinned-first sorting, cap enforcement)
    │   │   ├── useLatestConversationRedirect.ts # Landing-page redirect to latest user conversation or a fresh chat
    │   │   ├── useSignIn.ts          # Sign-in form state: validation, auth call, error/success feedback, redirect
    │   │   ├── useSignUp.ts          # Sign-up form state: validation, auth call, error/success feedback, redirect
    │   │   ├── useSignOut.ts         # Sign-out action: auth call + router refresh, pending state
    │   │   ├── useTheme.ts           # Light/dark theme state: .dark class toggle, localStorage + cross-tab sync
    │   │   ├── useWorkspaceFiles.ts  # Workspace file CRUD against Dexie conversation.files + activeFileId
    │   │   ├── useModelSettings.ts   # Model + thinking level state; per-conversation override + localStorage preference
    │   │   └── use-mobile.ts         # ORPHANED (unused) — 768px media-query hook
    │   ├── lib/
    │   │   ├── auth.ts               # Better Auth server (pg Pool, search_path, cookie cache, nextCookies)
    │   │   ├── auth-client.ts        # Better Auth React client (signIn/signUp/signOut/useSession)
    │   │   ├── rate-limit.ts         # DB sliding-window limiter (message_log): checkAndIncrement + getRateLimitStatus
    │   │   ├── models.ts             # Model registry, descriptions, thinking-level config, localStorage helpers
    │   │   ├── schemas.ts            # Zod: WorkspaceFile
    │   │   ├── limits.ts             # Centralized app limits (message/file/workspace/conversation caps) + formatting helpers
    │   │   ├── token-usage.ts        # Active context window metrics (calculateTokenMetrics) + session usage folding, per-model $ cost breakdown (calculateTokenCost/formatCost), compact token formatters
    │   │   ├── id.ts                 # crypto.randomUUID with fallback
    │   │   ├── edit-engine.ts        # StringEditEngine: 3-tier surgical string matching
    │   │   ├── db/db.ts              # Dexie ChatDatabase (v5), Conversation/DBMessage types, CRUD helpers
    │   │   └── ai/
    │   │       ├── index.ts          # Re-exports prompts + tools
    │   │       ├── prompts.ts        # buildSystemInstruction(files) — 8-section advanced system prompt + Context & Token Budget section
    │   │       ├── providers.ts      # SERVER-ONLY model→provider resolver (google/fireworks streamText config)
    │   │       ├── agent-runner.ts   # SERVER-ONLY runAgentResponse: streamText assembly, transforms, lifecycle, SSE + quota headers
    │   │       ├── workspace.ts      # Shared upsertFileIntoWorkspace/removeFileFromWorkspace + createMutableWorkspace
    │   │       ├── tools.ts          # Barrel: re-exports tool factories + createWorkspaceTools (8 tools)
    │   │       ├── tools/            # Tool factory submodules (split by domain)
    │   │       │   ├── types.ts          # WorkspaceToolsContext, Zod file schemas, findWorkspaceFile/isSameFilename
    │   │       │   ├── workspace-tools.ts # 6 workspace factories: list/read/write/edit/rename/delete
    │   │       │   └── tavily-tools.ts    # webSearch + extractUrl factories, callTavilyApi helper
    │   │       ├── message-extractor.ts # extractFilesFromMessage / extractDeletedFilesFromMessage from UI message parts
    │   │       ├── chat-error-handler.ts # Error text mapping to friendly assistant error bubbles + Dexie sync
    │   │       └── chat-reconciler.ts    # onFinish step message persistence, file delta extraction & auto-continuation loop
    │   └── utils/                    # EMPTY directory (reserved)
    ├── scripts/
    │   ├── better-auth-schema.sql    # Raw SQL: drop public auth tables, create better_auth schema + user/session/account/verification/message_log
    │   ├── migrate-better-auth-schema.ts # bun-run migration runner (reads the .sql, runs against DATABASE_URL)
    │   └── test-db.ts                # Connection + schema healthcheck (lists better_auth tables, asserts public is clean)
    ├── public/                       # hero.webp, agent-in-action.webp (README screenshots)
    ├── next.config.ts                # standalone output, motion transpile, picsum image remote pattern
    ├── eslint.config.mjs             # eslint-config-next flat config
    └── package.json / tsconfig.json / postcss.config.mjs / .env.example

## 5. Domain Models & Data Schema Concepts

### 5.1 Client-side (Dexie IndexedDB — the product database)

- **`conversations`** table (keyPath `id`; indexes `id, userId, updatedAt, createdAt`):
  - `id` (UUID, matches the `/chat-id/:id` URL), `userId?` (Better Auth user ID), `title` (auto-title from first message or "New Chat"), `model` (Gemini model id), `thinkingLevel?` ("minimal"|"low"|"medium"|"high"), `files?` (embedded array of WorkspaceFile — the active workspace snapshot), `activeFileId?`, `createdAt`/`updatedAt` (ISO strings).
  - **Legacy-inclusion rule:** `useConversations` lists records that are *unowned* (`!userId`) alongside the signed-in user's own, so conversations that predate v5 user-scoping are never hidden.
- **`messages`** table (keyPath `id`; indexes `id, chatId, userId, timestamp`):
  - `DBMessage` extends AI SDK `UIMessage` (native parts array) with `chatId` (indexed FK to conversations), `userId?` (Better Auth user ID) + `timestamp`. Stored as native UI messages — no shape conversion. **`timestamp` is a position-derived ordering key**: `chat-reconciler.ts` stamps each message with a strictly increasing value derived from its index in `allMessages`, so `sortBy('timestamp')` deterministically reproduces conversation order (a single shared timestamp would tie and fall back to random UUID ordering).
- **`WorkspaceFile`** entity (embedded in conversations.files): `id`, `name`, `content`, `language` (default "markdown"), `createdAt`, `updatedAt`. Note: no per-file indexes; the whole array is read/written as one column.
- **Schema version history:** v1 (custom ChatMessage) → v2 (+thinkingLevel) → v3 (type updates) → v4 (native UIMessage; +files/activeFileId on conversations) → v5 (+userId indexing on conversations and messages for per-user session isolation). To bump: increment version in `db.ts` constructor and add a `stores()` definition.

### 5.2 Server-side (Supabase PostgreSQL, `better_auth` schema — auth + abuse control only)

- **`better_auth.user`** — id (text PK), name, email (unique), emailVerified, image, createdAt/updatedAt.
- **`better_auth.session`** — id PK, expiresAt, token (unique), ipAddress, userAgent, userId FK → user ON DELETE CASCADE.
- **`better_auth.account`** — id PK, accountId, providerId, userId FK, access/refresh/id tokens + expiry, scope, password (hashed), timestamps.
- **`better_auth.verification`** — id PK, identifier, value, expiresAt, timestamps.
- **`better_auth.message_log`** — id (UUID gen_random_uuid PK), user_id FK → user, created_at (timestamptz default NOW); composite index `(user_id, created_at)`.

### 5.3 Relationships & state transitions

- **1:N** `user` → `session` (cascade delete); `user` → `message_log` (cascade delete). Auth identity and workspace data are **not** linked server-side — workspaces are per-browser, not per-user.
- **Rate-limit window state:** quota is a pure function of `COUNT(*)` over `message_log` in sliding 5-hour and 7-day windows; exhaustion disables sending until the oldest row ages out (`retryAfter` seconds). No persistent state machine — the log table IS the state.

### 5.4 Model registry (`lib/models.ts`)

| Model ID | Family | Thinking levels | Default level |
|----------|--------|-----------------|---------------|
| `gemini-3.5-flash-lite` | Gemini 3.5 | minimal / low / medium / high | low |
| `gemini-3.1-flash-lite` | Gemini 3.1 | minimal / high | minimal |
| `gemini-3-flash-preview` | Gemini 3 | minimal / low / medium / high | high |
| `gemma-4-31b-it` | Gemma 4 | none (provider default) | — |
| `gemma-4-26b-a4b-it` | Gemma 4 | none (provider default) | — |
| `accounts/fireworks/models/deepseek-v4-flash-0731` | DeepSeek (Fireworks) | low / high | high |

- **Context-window caps:** every catalog entry is capped at `contextWindow: 131072` (128k tokens) with a `maxOutput: 65536` (64k) output allowance. `getModelContextWindow(modelId)` in `lib/models.ts` resolves a model's window (falling back to the first catalog entry). The server attaches provider-reported usage to finished assistant messages via AI SDK 7's `messageMetadata` (final-step `usage` as the active snapshot, `stepTotalUsage` for session/cost accounting, `modelId` for attribution), the client tracks active context window occupancy (`calculateTokenMetrics` in `lib/token-usage.ts`, following the Claude Code / OpenCode / Codex standard), and `handleSendMessage` refuses further sends once active context tokens cross `contextWindow` ("Context window reached. Start a new chat to continue."). The ChatHeader surfaces this as a live "Context window: active tokens / context window" meter (`formatTokens`/`formatContextWindow`) whose popover (`TokenUsagePopover.tsx`) breaks down prompt input, generation output, headroom, total estimated $ cost, and per-model cost.

- **Per-model pricing:** every catalog entry carries an optional `pricing` block (USD per 1M tokens: `inputPerMillion` / `outputPerMillion` / optional `cachedInputPerMillion`), mirrored in `metadata.json`'s `supportedModels`. `getModelPricing(modelId)` in `lib/models.ts` resolves it, falling back to Gemini 3.5 Flash Lite rates; `calculateTokenCost(modelId, in, out)` in `lib/token-usage.ts` turns per-turn usage into dollars (computed from `stepTotalUsage`, since multi-step tool turns burn API tokens across passes).

- Each entry also has a user-facing label + one-line description (`MODEL_DESCRIPTIONS`) shown in the ChatInput model popover.
- Model entries may declare a `provider` ('google' or 'fireworks'); the server routes to the matching provider via `lib/ai/providers.ts` (`resolveAgentModel`). The model selector menu and transport are provider-agnostic.
- DeepSeek V4 Flash reasoning maps to Fireworks' `reasoning_effort` (low/high — the model's `max` effort is not expressible via the AI SDK's top-level `reasoning` option); reasoning text arrives as native reasoning parts from `reasoning_content`, feeding the same ThoughtAccordion.
- `ChatInput` renders the first 3 models as "featured" and the rest under a "More models" submenu; a separate "Effort" submenu lists the active model's thinking levels.
- Preference storage: `localStorage` keys `selectedModel` / `selectedThinkingLevel`; on conversation load the conversation record's own `model`/`thinkingLevel` wins over stored preferences.
- The default model falls back to `NEXT_PUBLIC_GEMINI_MODEL`, then `gemini-3.5-flash-lite`.

### 5.5 Application Limits & Guardrails (`lib/limits.ts`)

| Constraint | Limit Constant | Enforced In | Behavior |
|------------|----------------|-------------|----------|
| Chat Prompt Length | `MAX_MESSAGE_CHARS = 2000` | `ChatInput.tsx`, `/api/agent` | `maxLength={2000}` on textarea + HTTP 400 validation |
| File Character Limit | `MAX_FILE_CHARS = 10000` | `WorkspaceDrawer.tsx`, `useWorkspaceFiles.ts`, `tools.ts` | Truncates/clamps file content on creation & update |
| Total Workspace Limit | `MAX_WORKSPACE_TOTAL_CHARS = 50000` | `tools.ts`, `prompts.ts` | Clamps total workspace characters in agent tools |
| Max Conversations | `MAX_CONVERSATIONS_PER_USER = 5` | `useConversations.ts` | Cap check blocks `handleNewChat`; `Sidebar.tsx` renders the disabled button & header count from props |
| Max Files per Workspace | `MAX_FILES_PER_WORKSPACE = 3` | `WorkspaceDrawer.tsx`, `useWorkspaceFiles.ts`, `tools.ts` | Disables creation button + throws agent tool error |

## 6. Routing & Page Architecture (App Router)

| Path / Route | Route Type | Access Control | Page Purpose | Key Child Components |
|--------------|-----------|----------------|--------------|----------------------|
| `/` | Client page | Signed-in (proxy + client guard) | Loading spinner then redirect to latest conversation or a new UUID | none (logic-only) |
| `/auth` | Server page | Public | 307 redirect → `/auth/signin` | none |
| `/auth/signin` | Client page | Public (redirects authed users to callbackUrl) | Email/password sign-in | AuthShell, SignInForm, LoadingScreen |
| `/auth/signup` | Client page | Public | Account creation | AuthShell, SignUpForm, LoadingScreen |
| `/chat-id/[id]` | Client page (dynamic, `use(params)`) | Signed-in (proxy + client guard) | The main chat workspace | Sidebar, ChatHeader, ChatPanel, ChatInput, WorkspaceDrawer |
| `/api/auth/[...all]` | Route Handler | Public (Better Auth) | Full Better Auth HTTP surface (sign-in/out/session) | — |
| `/api/agent` | Route Handler (POST) | Signed-in (proxy + `getSession`) | Streaming Gemini agent with tools + rate limit | — |
| `/api/user/rate-limit` | Route Handler (GET) | Signed-in (`getSession`) | Current quota status JSON | — |
| `not-found` | Static page | Public | Branded 404 | — |
| proxy matcher | Edge/proxy | — | Pre-render guard for `/`, `/chat-id/:path*`, `/api/agent` | — |

**Dynamic param handling:** Next.js 16 async `params` — `chat-id/[id]/page.tsx` unwraps with `use(params)`. No `generateStaticParams` / `dynamicParams` — routes are fully dynamic by default.

## 7. Data Flow, Server Actions & API Map

### 7.1 Workspace tools (`lib/ai/tools/`) — the only "server actions" in the product

All tools are `ai.tool()` definitions registered by `createWorkspaceTools(context)` (in the `lib/ai/tools.ts` barrel), where `context: WorkspaceToolsContext` = `{ getCurrentFiles, onUpdateFile, onDeleteFile }` (defined in `lib/ai/tools/types.ts`). **No `contextSchema`** — state flows through closures captured at creation. Workspace factories live in `lib/ai/tools/workspace-tools.ts`; the web pair lives in `lib/ai/tools/tavily-tools.ts`. Tools mutate the per-request `mutableFiles` array via callbacks; results flow back to the client as tool-result parts.

| Tool | Input (Zod) | Output (Zod) | Behavior / Notes |
|------|-------------|--------------|------------------|
| `listFiles` | `{}` | `{ count, files: [{id,name,language,charCount}] }` | Metadata only — never full content |
| `readFile` | `nameOrId`, `section?` | `{ exists, name?, section?, content?, error? }` | Full content or heading-section regex extract (H1–H6, case-insensitive) |
| `writeFile` | `name`, `content`, `language?` | `{ action: "created"\|"replaced", file }` | Full create/replace; auto language (`.txt` → text, else markdown); reuses existing id on replace |
| `editFile` | `nameOrId`, `explanation`, `searchString`, `replaceString` | `{ success, explanation?, strategyUsed?, message?, error?, file? }` | Routes through `StringEditEngine`; readFile-first discipline |
| `renameFile` | `nameOrId`, `newName` | `{ success, oldName?, newName?, file?, error? }` | Rejects case-insensitive name collisions |
| `deleteFile` | `nameOrId` | `{ deleted, fileId?, name?, error? }` | Matches by id or case-insensitive name |

**Persistence contract:** tool outputs containing `{ file }`, `{ files: [...] }`, or `{ deleted: true, fileId/name }` are auto-discovered by `lib/ai/message-extractor.ts` (`extractFilesFromMessage` / `extractDeletedFilesFromMessage`) and merged into Dexie on `onFinish`. Adding a new file-mutating tool needs zero changes to message extraction.

The two web tools (`lib/ai/tools/tavily-tools.ts`, shared `callTavilyApi` helper):

| Tool | Input (Zod) | Output (Zod) | Behavior / Notes |
|------|-------------|--------------|------------------|
| `webSearch` | `query`, `searchDepth?` (basic\|advanced, default basic), `topic?` (general\|news\|finance), `maxResults?` (1–10, default 6), `includeRawContent?`, `includeImages?`, `timeRange?` (day\|week\|month\|year), `includeDomains?`, `excludeDomains?` | `{ success, query, results? [{title,url,content,rawContent?,score?,publishedDate?}], images?, error? }` | Tavily `/search` via `Authorization: Bearer`; 30s fetch timeout; raw content capped at 12k chars per result |
| `extractUrl` | `urls` (1–3), `extractDepth?` (default advanced) | `{ success, extracted [{url,title?,rawContent}], failed? [{url,error}], error? }` | Tavily `/extract`; 45s fetch timeout; content capped at 18k chars per URL |

### 7.2 Agent endpoint configuration (`/api/agent`)

- **Validation:** `bodySchema` (Zod): `messages` (any[]), `files?`, `model?`, `thinkingLevel?`, `maxSteps?`; `maxSteps` clamped to 1–30.
- **Error handling:** 401 (no session), 429 (quota — with `Retry-After` + `X-RateLimit-*` headers and a human message), 400 (Zod failure, flattened details). Stream errors only `console.error` (no rethrow).
- **`streamText` config** (all owned by `runAgentResponse` in `lib/ai/agent-runner.ts`; the route only delegates): model + reasoning + `providerOptions` are resolved per-provider by `lib/ai/providers.ts` (`resolveAgentModel`); system prompt rebuilt on every `prepareStep` (so the model always sees current file state and active context headroom); `experimental_transform: [smoothStream({ delayInMs: 25, chunking: "word" }), coalesceToolInputDeltas()]` (buffers `tool-input-delta` chunks server-side, turning O(N * length) client partial JSON re-parses into O(length) single parse); `stopWhen: isStepCount(maxSteps)`; Google models pass `reasoning` mapped from thinkingLevel (Gemma models pass provider-default) + `providerOptions.google.thinkingConfig.includeThoughts: true` (feeds ThoughtAccordion); Fireworks models pass `reasoning` mapped to `reasoning_effort` (low/high) + `providerOptions.fireworks` `thinking: { type: "enabled" }` and `reasoningHistory: "interleaved"` (keeps reasoning across tool calls); lifecycle `onStart`/`onStepEnd`/`onEnd`/`onError` logging. `onStepEnd` captures the **final step's usage snapshot** (`lastStepUsage`) attached via `toUIMessageStream({ messageMetadata })` as `metadata.usage` to prevent multi-step tool loops from artificially inflating conversation context through $O(N)$ re-prompt summation, while preserving `metadata.stepTotalUsage` for cumulative session analytics.
- **Auto-continuation:** client-side, in `useChatSession` — `finishReason === 'step-limit'` triggers up to 2 follow-up "please continue" sends (max ~75 effective steps), reset on manual send.
- **Rate limiting:** `checkAndIncrementRateLimit(userId)` runs before streaming; success response headers carry remaining quota; 429 branch zeroes the 5h header.

### 7.3 Third-party / external integrations

| Integration | Interface | Where it lives | Notes |
|-------------|-----------|----------------|-------|
| Google Gemini | `@ai-sdk/google` `google(model)` | `/api/agent` route via `lib/ai/providers.ts` | Key `GOOGLE_GENERATIVE_AI_API_KEY`; model ids in `lib/models.ts` |
| Fireworks AI | `@ai-sdk/fireworks` `fireworks(model)` | `/api/agent` route via `lib/ai/providers.ts` | Key `FIREWORKS_API_KEY`; hosts DeepSeek V4 Flash 0731; native `reasoning_content` parsing |
| Tavily | REST API via direct `fetch` | `lib/ai/tools/tavily-tools.ts` | Key `TAVILY_API_KEY` (optional); powers `webSearch` + `extractUrl`; no SDK dependency |
| Supabase Postgres | `pg` Pool | `lib/auth.ts`, `lib/rate-limit.ts`, `scripts/*` | Two separate Pools (auth vs rate-limit), both `search_path=better_auth,public`; pooler port 6543 |
| Better Auth | HTTP (catch-all route) + server/client SDK | `api/auth/[...all]`, `lib/auth*.ts` | Cookie-based sessions; `nextCookies` plugin; 5-min session cookie cache |
| Vercel (deploy) | `next build` standalone output | `next.config.ts`, package.json `start` | — |
| Browser IndexedDB | Dexie | `lib/db/db.ts`, all client hooks | No third-party network service |

### 7.4 Client-side `onFinish` persistence algorithm (`useChatSession`)

This is the single reconciliation point that turns a streamed assistant message into durable state:

1. Persist **every** message in the conversation (not just the last) via batched `db.messages.bulkPut` inside a single atomic Dexie transaction (`db.transaction('rw', [db.messages, db.conversations], ...)`), touching the conversation's `updatedAt`. Each message is stamped with a **unique position-derived `timestamp`** (base + its index in `allMessages`) so deduplicated reloads keep true conversation order — never a single shared value.
2. Extract deletions (`extractDeletedFilesFromMessage`) and file updates (`extractFilesFromMessage`) from the **current** assistant message's tool-result parts only.
3. If any deletions exist, filter them out of the conversation's current `files` via the shared `removeFileFromWorkspace` helper (`lib/ai/workspace.ts`), matching by `fileId` or case-insensitive name.
4. Merge extracted file objects into `files` via the shared `upsertFileIntoWorkspace` helper — replace by `id` or case-insensitive name, else append; dedupe by id.
5. Persist the merged array via `updateConversationFiles` and reset the active file to the first remaining file.
6. Auto-continuation: if `finishReason === 'step-limit'` and fewer than 2 passes have run, schedule a follow-up "Please continue completing the task where you left off." send (300ms delay) and re-enter the loop; otherwise reset the continuation counter. This effectively allows up to 3 chained `isStepCount` executions (~75 steps) for complex tasks.

### 7.5 Quota exhaustion handling flow (client)

1. **Pre-send check:** `handleSendMessage` blocks when local `rateLimitData.remaining5h <= 0` or `remainingWeek <= 0`, setting a contextual `quotaError` instead of sending.
2. **During stream:** the custom transport `fetch` reads `X-RateLimit-Remaining-5h` / `X-RateLimit-Remaining-Week` / `Retry-After` headers off the response and calls `updateRateLimitData`.
3. **On 429:** the transport sets `quotaError` (with message + retryAfter), then `chat.stop()` aborts the stream; a follow-up effect prunes an empty trailing assistant bubble.
4. **UI reaction:** `QuotaErrorCard` renders with a live per-second countdown; `ChatInput` swaps its textarea for an inline quota warning, disables submit, and the quota-ring indicator turns danger-colored.
5. **Recovery:** `clearQuotaError` (dismiss) or re-hydration on next load; quota state resets on sign-out and re-fetches per user via `checkQuotaStatus` / the `useEffect` fallback to `GET /api/user/rate-limit`.

## 8. Global State & Context Management

### 8.1 State layers

- **React Context (server-crossed):** `RateLimitContext` (`src/contexts/RateLimitContext.tsx`) is the single app-wide provider. `RootLayout` (async server component) reads the session headers via `auth.api.getSession` and passes `initialData` to the provider, eliminating a client fetch waterfall. A render-phase `if` block (not an effect) re-hydrates `rateLimitData`/`quotaError` when the signed-in user or SSR payload changes and clears state on sign-out.
- **IndexedDB as reactive source of truth:** `useLiveQuery` (dexie-react-hooks) drives the conversation list (via `useConversations`, consumed by the Sidebar), per-chat messages, and conversation document (files, model, title). UI updates are pushed by Dexie change events.
- **localStorage preferences:** `selectedModel` and `selectedThinkingLevel` (via `lib/models.ts` helpers) and `strata-theme` (via `useTheme`). Per-conversation `model`/`thinkingLevel` stored on the conversation record takes priority on load.
- **Per-chat UI state:** `useWorkspaceFiles` (files, activeFileId, drawer open flag) and `useModelSettings` live inside `useChatSession`; the page shell holds `isSidebarOpen`, the conversation list, sign-out, and theme state from its feature hooks and threads everything to presentational children.
- **Refs as the streaming transport bridge:** `modelRef`/`thinkingLevelRef`/`filesRef` are kept in sync via effects so the `DefaultChatTransport` body closure always reads current values without re-creating the transport.

### 8.2 Forms & validation

- Plain controlled React forms with inline `useState` (no RHF/form lib): `sign-in-form.tsx`, `sign-up-form.tsx` render fields and local UI state while validation, auth calls, and redirects live in the `useSignIn`/`useSignUp` hooks; `WorkspaceDrawer` inline create/edit forms.
- Server-side: Zod for the `/api/agent` body and every tool input/output schema.

### 8.3 Error handling & telemetry

- **No toast system, no error boundary, no external telemetry/logger.** Error surfaces are: inline alert cards (auth forms, `QuotaErrorCard`), inline tool-error summaries in `ToolCallCard`, console logging in the agent route, and a swallow-and-continue pattern in `RateLimitContext`.
- Quota errors are propagated through three channels: HTTP 429 + headers → transport fetch handler → `setQuotaError`; the `useChat` `onError` callback; and local `rateLimitData` pre-checks.
- The 429 path also stops the active stream (`chat.stop()`) and prunes an empty trailing assistant bubble.

### 8.4 The render-phase rehydration pattern (RateLimitContext)

`RateLimitProvider` deliberately avoids effects for its core synchronization:

- It holds `prevUserId` / `prevDataKey` in `useState` and runs an **`if` statement during render** (not `useEffect`) to detect user or SSR-payload changes. When they differ it updates state directly — this keeps the quota UI consistent on the very first paint, avoids effect-order races, and correctly handles sign-out (clears quota) and sign-in (restores from the SSR snapshot).
- `initialData` arrives from the async RootLayout, which calls `auth.api.getSession` + `getRateLimitStatus` server-side; the provider serializes it to a stable string key to detect payload identity.
- A `useEffect` fallback fetches `/api/user/rate-limit` only when the SSR data is unavailable (e.g., signed-in during a client-only navigation), guarded by an `active` flag to avoid setting state after unmount.

### 8.5 The refs-as-transport-bridge pattern (useChatSession)

`useChat`'s `transport` is memoized once (`useMemo`) with an empty-ish dependency array, so its body closure must not capture volatile state. Instead:

- `modelRef` / `thinkingLevelRef` / `filesRef` are updated by dedicated effects whenever `useModelSettings` / `useWorkspaceFiles` values change.
- The `DefaultChatTransport` `body` callback reads those refs lazily at request time, guaranteeing the API route always receives the current model, thinking level, and workspace file snapshot without re-creating the transport object (which would restart the chat state machine).
- This is the canonical pattern for feeding live state into AI SDK transports in this codebase — replicate it for any new request-scoped values.

## 9. Non-Negotiable Architectural Rules & Conventions

1. **Bun only.** Never use `npm`/`yarn`/`npx`; all scripts run via `bun run ...` (`dev`, `build`, `lint`, `db:migrate`, `db:test`, `start`).
2. **Lint + build must pass before finishing:** `bun run lint` and `bun run build`.
3. **No hardcoded colors/shadows/radius.** Use Milo `@theme` tokens exclusively (`primary`, `secondary`, `danger`, `warning`, `info`, `surface-*`, `text-*`, `edge-*`, `accent-*`, `scrim`, `shadow-button`, `shadow-card*`, `shadow-glow-*`). No Tailwind color names (emerald/rose/red/amber/cyan/violet/slate), no `bg-black/60`, no arbitrary `shadow-[...]`. Add new colors only as `@theme` vars in `globals.css`.
4. **Radius remap is intentional:** `rounded-lg`=12px (badges/chips), `rounded-xl`=20px (buttons/inputs), `rounded-2xl`=32px (cards). Fonts: `font-display` and `font-sans` (Plus Jakarta Sans). **Type scale is token-only:** use `text-micro`/`text-caption`/`text-label`/`text-body`/`text-subheading`/`text-heading`/`text-title`/`text-display` (11/12/14/16/18/20/24/32px in `globals.css`); never raw Tailwind size names or arbitrary `text-[10px]`/`text-[11px]`. Markdown hierarchy convention (see `ChatBubble`'s component map): `h1`→`text-title font-display`, `h2`→`text-heading font-display`, `h3`→`text-subheading`, `p`/`li`→`text-body`, `code`→`text-micro font-mono`, `table`/`blockquote`→`text-caption`.
5. **No code comments unless asked.**
6. **Tool registration is closed-loop:** a new workspace tool = `tool()` with explicit Zod schemas in `lib/ai/tools.ts` → factory accepting `WorkspaceToolsContext` → registered in `createWorkspaceTools()` → tool rule added in `lib/ai/prompts.ts` → display config + summary in `components/chat/tools/resolver.tsx`. **`ToolCallCard.tsx` requires zero modifications.** File-touching tools that return `{file}`, `{files}`, or `{deleted:true}` are auto-persisted by `lib/ai/message-extractor.ts`.
7. **Never import Dexie/db into server code and never import the `pg` Pool into client components.** The shared seam is `lib/schemas.ts`.
8. **No manual auto-scroll effects.** `<StickToBottom>` in `chat-id/[id]/page.tsx` owns scrolling; do not add `useEffect` + `scrollIntoView` loops.
9. **Auth flow is fixed:** Better Auth server in `lib/auth.ts`, client in `lib/auth-client.ts`, catch-all route in `api/auth/[...all]`, pre-render guards in `proxy.ts`, double-verified in route handlers via `auth.api.getSession`.
10. **Rate-limit rules:** quotas are 10 msgs / 5h and 50 msgs / week (constants `MAX_5H`, `MAX_WEEK` in `lib/rate-limit.ts`). Increment logic lives only server-side; the UI mirrors via SSR hydration + response headers + `/api/user/rate-limit`.
11. **Adding a model:** extend `MODELS` + `MODEL_DESCRIPTIONS` in `lib/models.ts` (declare `provider: 'google' | 'fireworks'` for non-Google models) and add a `MODEL_THINKING_LEVELS` entry if it supports reasoning. Gemma open models have no thinking levels. Provider-specific `streamText` wiring (reasoning mapping, `providerOptions`) goes in `lib/ai/providers.ts` — never in the route or client code.
12. **Dexie schema upgrades:** bump the version in `lib/db/db.ts` constructor and add a `stores()` definition; keep messages as native `UIMessage` shape (`DBMessage`).
13. **System prompt discipline:** inject metadata-only file listings into the prompt (name/language/charCount/id); never dump full file content — the model must call `readFile`.
14. **No emojis in code/files.** (README/docs may differ; code must not.)
15. **Never reintroduce removed/migrated patterns** (e.g., the `already-authenticated` component, custom `ChatMessage`/`Resume` shapes, or the legacy `resumes` request field). The message model is native AI SDK `UIMessage`; the file model is the workspace `files` array.
16. **Keep `/api/agent` stateless.** Do not persist workspace state server-side; workspace lives in the request body + Dexie. A future server-side persistence migration would change this rule by design — until then it holds.
17. **Respect the proxy matcher.** Adding a protected page means adding it to `config.matcher` in `src/proxy.ts`; do not widen bypass lists (`/auth`, `/api/auth`) without explicit approval.
18. **SSR hydration is the norm for signed-in data.** Follow the `RootLayout` → provider `initialData` pattern for any new per-user server state instead of client-only fetches.

## 10. Feature Development Workflow (Recipes for AI Agents)

### 10.1 Add a new route / page

1. Create the file under `src/app/` (App Router conventions: `page.tsx`, `layout.tsx` for nested layouts). Name folders in kebab-case; dynamic segments `[id]`/`[...slug]`.
2. Decide the boundary: mark `'use client'` for interactive pages (this app's default), keep it a Server Component only for static/redirect/metadata pages.
3. If signed-in-only, add the path to the `config.matcher` in `src/proxy.ts`; the proxy handles cookie presence, and the page should also guard with `useSession()`.
4. Use `use(params)` (Promise params — Next.js 16) in client dynamic pages; no manual `scrollIntoView` effects.
5. Style exclusively with Milo tokens; export `metadata` where relevant.
6. Run `bun run lint` and `bun run build`.

### 10.2 Add a new database model and expose it to the UI

For **Dexie (client DB):**
1. Define the row interface in `lib/db/db.ts` and bump the Dexie version, adding a new `Table` field + `stores()` index string.
2. Add typed CRUD helper functions (mirror `createConversation`/`saveMessage`).
3. Query it reactively with `useLiveQuery` in a hook under `src/hooks/`, surface the hook's API from `useChatSession` (or a new dedicated hook) and wire it into the page shell / child components.
4. If the model must reach the agent, serialize it into the `DefaultChatTransport` body closure and add it to the `/api/agent` `bodySchema`.

For **PostgreSQL (server DB, e.g. the planned migration):**
1. Add the migration to `scripts/` following `better-auth-schema.sql` style; run via `bun run db:migrate`.
2. Create a data-access module under `src/lib/db/` using a `pg` Pool (never import into client components).
3. Add/update Route Handlers under `src/app/api/` and call them from the client (fetch), or keep server-only flows inside Server Components/route handlers.

### 10.3 Add a new workspace tool (most common feature)

1. Create a factory `createXTool({ ...context })` in `lib/ai/tools/workspace-tools.ts` (or `lib/ai/tools/tavily-tools.ts` for web tools) using `tool()` with explicit Zod `inputSchema`/`outputSchema`.
2. Register it in the `createWorkspaceTools()` return object (barrel `lib/ai/tools.ts`).
3. Add a numbered rule under `## Tool Rules` in `lib/ai/prompts.ts` (read-before-edit, verbatim copy, etc.).
4. Add a `toolConfigs` entry (icon/label/badge/accent) + a summary builder + a `case` in `resolveToolDisplay` in `components/chat/tools/resolver.tsx`. Do NOT touch `ToolCallCard.tsx`.
5. If the tool mutates files, return `{ file }`, `{ files }`, or `{ deleted: true, fileId }` so `message-extractor.ts` persists it automatically.

### 10.4 Add a third-party integration

1. Install the SDK with `bun add`; store secrets in `.env.local` and document them in `.env.example` (client-safe values prefixed `NEXT_PUBLIC_`).
2. Keep the server-side client factory in `src/lib/` (mirror `lib/auth.ts` / `lib/rate-limit.ts`); never instantiate it inside a Client Component.
3. Expose it either as a new Route Handler under `src/app/api/` or as an AI tool (if the LLM should invoke it) — follow the closure pattern for tools.
4. Add call-site error handling consistent with the codebase (inline error cards or `{ success: false, error }` tool results — no toast/telemetry system exists).
5. Run `bun run lint` and `bun run build`.

### 10.5 Adjust rate limiting

- Edit constants (`MAX_5H`, `MAX_WEEK`, window intervals) in `lib/rate-limit.ts`. Client-facing copy references the numbers in `ChatInput.tsx`, `QuotaErrorCard.tsx`, `RateLimitContext.tsx`, and `useChatSession.ts` fallback messages — keep them in sync.

## Appendix: Known Discrepancies & Dead Code

- **Postgres holds auth + rate-limit only** — no app tables (`conversations`/`messages`/`workspace_files`) exist server-side.
- **Orphaned file:** `hooks/use-mobile.ts` — importable but unused.
- **No tests, no error boundary, no Sentry/analytics** — verification is `bun run lint` + `bun run build` only.
