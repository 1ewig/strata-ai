# Strata AI — System Context & Architecture Guide

> Canonical ground-truth document for AI agents and engineers. Written from current source state (Next.js 16.2.10 / React 19.2.7); verify claims against the referenced files before editing. Replaces the pre-hardening architecture guide (server-side history pruning, provider-metadata sanitization, tool-input delta coalescing, DB-backed quota).

## 1. Executive Summary & Domain Purpose

- **What it is:** Strata AI is a chat-first "agentic workspace studio" — a single-page AI document-engineering app where users create, read, edit, rename, and delete multi-file workspaces (24+ languages: HTML, TS/JS, CSS, JSON, Python, SQL, Rust, Go, Markdown, shell, text) entirely through a conversational interface. Live demo: strata-ai-five.vercel.app.
- **Core mechanic:** The assistant executes 8 Zod-validated tools (6 workspace tools + `webSearch` + `extractUrl`) in multi-step agentic loops (up to 30 steps per turn, plus up to 2 silent auto-continuations). Chat is the control surface; durable content lives in workspace files on a canvas (Workspace Drawer). Tool outputs return content-free metadata summaries; full file bodies stream live to the client via custom `data-workspace` SSE parts.
- **Target audience:** Individual power users — originally job-seeker document workflows — who want a local-first AI document studio with zero cloud-sync complexity.
- **Business problems solved:** (a) durable structured content in files instead of disposable chat messages; (b) precise, non-destructive AI edits via a 3-strategy string-edit engine (`StringEditEngine`); (c) persistence without server DB setup via IndexedDB (Dexie); (d) rich syntax-highlighted multi-file preview; (e) context-window exhaustion mitigation via a `/compact` slash command that distills history into a `metadata.isCompactedSummary` message and prunes pre-summary history server-side.
- **Feature surface (what shipped):**
  - Multi-step agentic file operations + web research: `readFile` → `editFile`/`writeFile` or `webSearch` → `extractUrl` chains, capped by `isStepCount` with system-prompt re-injection between steps.
  - Workspace canvas drawer: file tabs, markdown render vs. raw edit vs. syntax-highlighted code view, per-file char counters, cap warnings.
  - Live streaming UX: word-paced tokens (`smoothStream` 25ms), `SmoothStreamText` markdown rendering, reasoning/thought accordions, tool-execution cards with status badges, animated typing dots, "scroll to bottom" affordance.
  - Per-conversation model + thinking-level selection with localStorage memory and conversation-row override.
  - Image attachments with vision input: up to 4 images (JPEG/PNG/WebP/GIF) validated and client-side compressed into compact data URLs, gated by per-model vision support, rendered as thumbnails in the bubble.
  - Public marketing landing page: an "editorial atelier" RSC (session resolved server-side) — contour-grid hero with six floating tool badges, a three-card artifact showcase (compaction index card, living manuscript with marginalia, field ledger), three design tenets, and engine-specimen calibration plates; the proxy bypasses `/` entirely.
  - Full conversation history in IndexedDB; sidebar switcher with pin/rename/delete; per-user conversation cap (5).
  - Context compaction via `/compact` (dedicated Flash Lite model, high reasoning, 3,500-token output cap).
  - Quota-aware usage: server-enforced caps mirrored live (rate ring, countdown error cards).
  - Light + dark themes (warm studio linen light / warm espresso dark) with cross-tab sync.
- **Primary value driver / monetization posture:** quota-gated messaging — free-tier caps (10 msgs / 5h, 50 / week) enforced server-side in Postgres and mirrored live into the UI. There is no payments integration yet; the `message_log` table is the billing/abuse surface a future subscription plugs into, and `token-usage.ts` already computes per-model dollar costs for analytics.
- **Non-functional constraints:**
  - **Security:** Better Auth email+password sessions; pre-render cookie gate in the Next.js 16 proxy; every API route re-verifies the session via `auth.api.getSession`; security headers (nosniff, DENY frames, strict-origin-when-cross-origin referrer); provider API keys live server-side only; API-key-less client bundle (no `NEXT_PUBLIC_*` secrets beyond the app URL and default model).
  - **Abuse control:** atomic DB-backed sliding-window rate limiting (BEGIN/COMMIT with purge-on-read), checked before any model call; quota echoed as `X-RateLimit-*` headers on every streaming response; step caps bound per-turn spend.
  - **Latency/UX:** word-paced streaming with live reasoning + tool cards; `React.memo` on hot chat components; observer-driven auto-scroll (`use-stick-to-bottom`); system prompt carries file metadata only (never full contents) to minimize input tokens; `data-workspace` events update the canvas in parallel with the stream.
  - **Compliance/privacy:** no PII stored server-side beyond auth identity; all conversation/workspace data is client-local IndexedDB, so nothing leaves the browser except the current message batch posted to `/api/agent`.
  - **Multi-tenancy:** server-side isolation is per-user via `userId` on sessions and `message_log`; client-side isolation is per-user via `userId` indexes in Dexie (schema v5), with legacy unscoped records deliberately still visible.
- **Architectural posture in one sentence:** a deliberately "boring" Next.js 16 shell — 4 route handlers, zero Server Actions, zero static pages (the only statically prerendered outputs are SEO boilerplate: `robots.ts`/`sitemap.ts` → `/robots.txt`, `/sitemap.xml`, plus `/icon.svg`) — wrapping one highly-tuned AI SDK 7 streaming pipeline, with IndexedDB as the entire read-model of the app.

## 2. Technical Stack & Infrastructure

| Layer | Technology / Library | Purpose in this Project | Key Configuration & Notes |
|-------|---------------------|-------------------------|---------------------------|
| Framework | Next.js 16.2.10 (App Router, `src/` layout) | SSR shell, client-heavy dynamic pages, streaming Route Handlers | `output: 'standalone'`; `reactStrictMode: true`; `transpilePackages: ['motion']`; TS build errors NOT ignored; proxy file is `src/proxy.ts` (Next 16 renamed middleware → proxy; no `middleware.ts` exists) |
| Runtime & Edge boundaries | Node.js only, no Edge runtime | Every page, Route Handler, and the proxy run on Node | All four Route Handlers and all pages are Node-runtime; the Next 16 proxy runs in the default middleware runtime; zero Edge functions, no `export const runtime = 'edge'` anywhere. New server code should assume Node unless a real edge requirement appears |
| Language | TypeScript 6.0.3 (strict) | Type safety | `@/*` → `./src/*`; `moduleResolution: bundler`; `target: ES2017`; `next` TS plugin |
| Runtime / PM | bun (never npm/yarn/npx) | Dev, build, lint, tests, DB scripts | `bun run dev\|build\|lint\|test\|db:migrate\|db:test`; `bun test --isolate` (fresh module registry per file, required by `mock.module` usage) |
| AI SDK | `ai@^7.0.0` | Unified LLM streaming, tools, UI message protocol | `streamText`, `tool()`, `smoothStream`, `isStepCount`, `createUIMessageStream`, `toUIMessageStream`, `createUIMessageStreamResponse`, `convertToModelMessages`, `DefaultChatTransport`, `readUIMessageStream`, `parseJsonEventStream`, `uiMessageChunkSchema` |
| Google provider | `@ai-sdk/google@^4.0.0` | Gemini model serving (default) | `google(modelId)`; `thinkingConfig.includeThoughts`; top-level `reasoning` = thinking level string; key `GOOGLE_GENERATIVE_AI_API_KEY`; thought signatures round-trip via `callProviderMetadata.google` |
| Fireworks provider | `@ai-sdk/fireworks@^3.0.22` | DeepSeek V4 Flash 0731 | `fireworks(modelId)`; top-level `reasoning` maps to `reasoning_effort` (low/high only — 'max' is not expressible in the SDK, so app levels collapse: minimal/low→low, medium/high→high); `providerOptions.fireworks.thinking.enabled` + `reasoningHistory: 'interleaved'`; key `FIREWORKS_API_KEY` |
| Web search | Tavily REST API (raw `fetch`, no SDK) | `webSearch` + `extractUrl` tools | Shared `callTavilyApi` helper: Bearer auth, 30s/45s timeouts, `AbortSignal.any`, multi-shape error extraction (detail.error / error.message / detail-string), status map 400/401/429/432/433; key `TAVILY_API_KEY` (optional — tools degrade to friendly errors) |
| Client DB | Dexie 4.4 + `dexie-react-hooks` | Local-first IndexedDB: conversations, messages, workspace files | `StrataAIChatDB`; schema v5 (`userId` indexes for per-user isolation); `useLiveQuery` for reactive lists; message ordering via position-derived ISO timestamps |
| Server DB | Supabase PostgreSQL via `pg` Pool | Better Auth identity tables + `message_log` quota | Pooled connection string `DATABASE_URL` (pooler :6543); both pools force `options: "-c search_path=better_auth,public"`; schema created by `scripts/better-auth-schema.sql` |
| Auth | Better Auth 1.6.25 + `nextCookies()` plugin | Email/password sessions, cookie cache | Server instance `lib/auth.ts` (own `pg` Pool, `requireEmailVerification: false`, `cookieCache` 5 min) and `lib/auth-client.ts` (baseURL from `NEXT_PUBLIC_APP_URL`); catch-all route `/api/auth/[...all]`; `BETTER_AUTH_SECRET` (≥32 chars) |
| Styling | Tailwind CSS 4.1 (`@tailwindcss/postcss` + autoprefixer) | Utility-first UI on "Milo" semantic tokens | `@theme` block in `globals.css`; light default + `html[data-theme="dark"]` dark set with `color-scheme: dark`; semantic type scale `text-micro`(11px)→`text-display`(32px); semantic shadows `shadow-button/card/card-lg`; radius remap (rounded-lg 12px, xl 20px, 2xl 32px); raw Tailwind color/size names forbidden |
| State management | React Context + hooks + Dexie live queries | Global quota state, per-session orchestration | `RateLimitContext` (SSR-hydrated); `useChatSession` orchestrator composing 5 sub-hooks; refs mirror live values into a memoized transport; no Redux/Zustand |
| Validation | zod 4.4.3 | API body parsing, tool input/output schemas, shared file schema | `agentRequestBodySchema` (messages loose `z.any()` array, files validated); tool schemas declared inline per tool |
| Markdown | `react-markdown@10` + `remark-gfm@4` | Chat bubbles + drawer rendering | Single render hub `MarkdownRenderer` (`components/ui/MarkdownRenderer.tsx`) + custom component map (`components/ui/createMarkdownComponents.tsx`): h1→`text-title font-display`, h2→`text-heading`, h3→`text-subheading`, p/li→`text-body`, code→`text-micro font-mono`, table/blockquote→`text-caption`; renderer owns snippet-copy state internally and delegates streaming to `SmoothStreamText`; no `prose` plugin |
| Syntax highlighting | PrismJS 1.30 | 24+ languages in chat code blocks and workspace canvas | Singleton registration in `lib/syntax-highlighter.ts`; Milo-themed Prism token styles in `globals.css`; `CodeViewer` pairs line numbers with highlighted code |
| Animations | `motion@^12` + `framer-motion@^13.1.1` (direct dep) | Drawer springs, hero stagger, accordion/popover/pill variants, tactile micro-interactions | All components import from `motion/react` (framer-motion is a direct dep but never imported in source — the lockfile carries two copies: 13.1.1 direct, 12.42.2 nested under `motion`); shared presets live in `components/chat/animations.ts` + `components/landing/animations.ts`; `AnimatePresence` for drawers/menus/accordions |
| Icons | `lucide-react@^0.553` | UI iconography | Custom `StrataIcon` SVG brand mark in `components/ui/` |
| Auto-scroll | `use-stick-to-bottom@^1.1` | Chat scroll anchoring + "scroll to bottom" affordance | `<StickToBottom>` wraps the message list in the chat page; manual scroll effects are forbidden |
| Testing | bun test (15 suites in `__tests__/`) | Unit + route integration tests | `--isolate` flag mandatory; shared fixtures in `__tests__/helpers.ts`; route tests use `mock.module` + dynamic import of the route; constants imported from `@/lib/limits` never hardcoded |
| Background jobs | None | No queues, cron, or scheduled tasks exist | All model/tool work is request-scoped inside the streaming response; the only recurring work is the 7-day `message_log` purge, which runs opportunistically inside the rate-limit transaction (never a background worker) |
| Analytics / telemetry | None | No Sentry, PostHog, or third-party analytics | Deliberate prefixed `console.log`/`console.error` lifecycle logging only (`[agent]`, `[compaction]`, `[useChatSession]`, `[rate-limit API error]`, `[useCompaction]`) — keep the prefix convention |
| Deployment | Vercel (standalone output) | Hosting | `next build` → standalone server; live at strata-ai-five.vercel.app |

**Environment variables** (`.env.example` is authoritative): `GOOGLE_GENERATIVE_AI_API_KEY` (required), `FIREWORKS_API_KEY` (required for DeepSeek), `NEXT_PUBLIC_GEMINI_MODEL` (default model id), `DATABASE_URL` (Supabase pooler), `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (auth client base), `TAVILY_API_KEY` (optional).

**Runtime scripts** (all `bun run`): `dev` (next dev) · `build` (next build; must pass) · `start` (standalone server) · `lint` (eslint .; must pass) · `test` (bun test --isolate) · `test:watch` · `clean` (next clean) · `db:migrate` (executes `scripts/better-auth-schema.sql` via `migrate-better-auth-schema.ts`) · `db:test` (connection + schema healthcheck).

**Test suite inventory (`__tests__/`, bun test --isolate):**

| Suite | Covers |
|-------|--------|
| `api-agent-route.test.ts` | Auth/rate-limit/zod/step-clamp pipeline of POST /api/agent (mock.module of auth, rate-limit, agent-runner) |
| `api-agent-compact-route.test.ts` | Same pipeline for POST /api/agent/compact |
| `rate-limit.test.ts` | Scriptable fake pg pool: BEGIN/COUNT/INSERT/COMMIT SQL-shape dispatch, retryAfter math |
| `workspace-tools.test.ts` | Cap enforcement, truncation, upsert semantics, rename collision, section extraction |
| `edit-engine.test.ts` | All 3 StringEditEngine strategies + ambiguity errors |
| `message-extractor.test.ts` | File delta extraction (modern + legacy tool shapes), compaction slicing |
| `message-segments.test.ts` | flattenMessageSegments grouping (streaming vs. finished, work-group folding) |
| `token-usage.test.ts` | Active-context/session/cost math, compaction reset, pricing lookups |
| `tavily-tools.test.ts` | Payload building, error-shape extraction, timeout composition |
| `workspace.test.ts` / `languages.test.ts` / `limits.test.ts` / `models.test.ts` / `schemas.test.ts` | Pure-unit coverage of the lib layer |

## 3. High-Level Architectural Mental Model & Data Flow

### 3.1 End-to-end data lifecycle (a user message)

```
ChatInput (textarea, slash menu, char counter)
  └─ handleSendMessage (useChatSession): reset continuation count, quota pre-check,
     context-window pre-check, auto-title (first 40 chars), chat.sendMessage
       └─ useChat transport (DefaultChatTransport → POST /api/agent; body closure
          reads model/thinkingLevel/files from refs — never re-created)
         └─ src/proxy.ts (Next 16 proxy): session cookie gate (getSessionCookie),
            JSON 401 for APIs / redirect to /auth?callbackUrl= for pages, security headers
           └─ POST /api/agent (Route Handler shell):
              auth.api.getSession → checkAndIncrementRateLimit (consumes quota,
              BEGIN/COMMIT transaction) → JSON parse (400) → zod safeParse (400)
              → sliceMessagesAfterCompaction → 2000-char check on last user message
              → clamp maxSteps 1..30 (default 25) → runAgentResponse
                └─ lib/ai/agent-runner.ts (createUIStreamResponder):
                   resolveAgentModel (google|fireworks) → sanitizeMessagesForProvider
                   (prune foreign providerMetadata/call/resultProviderMetadata)
                   → convertToModelMessages → streamText with buildSystemInstruction
                   (file metadata only + token budget), tools from createWorkspaceTools
                   bound to a per-request createMutableWorkspace closure, smoothStream
                   (word, 25ms) + coalesceToolInputDeltas transforms, prepareStep
                   re-injects system prompt with fresh tokenBudget each step,
                   stopWhen = isStepCount(maxSteps), provider usage captured per step
                   └─ SSE UI-message stream (createUIMessageStreamResponse) +
                      X-RateLimit-Remaining-5h / X-RateLimit-Remaining-Week headers;
                      messageMetadata stamps usage/stepTotalUsage/modelId on finish part
  ← browser: useChat.onData consumes data-workspace parts → workspace.handleUpdateFile/
    handleDeleteFile (live canvas updates); onFinish → reconcileFinishedStep
       └─ lib/ai/chat-reconciler.ts: persistMessages (position-derived timestamps),
          extractFilesFromMessage/extractDeletedFilesFromMessage → merge file deltas
          into conversation row, activeFileId = first remaining file, auto-continue
          (≤2 passes, 300ms delay) when finishReason === 'step-limit'
```

### 3.2 The compaction lifecycle (parallel pathway)

```
ChatInput "/compact" → useCompaction.triggerCompaction (guard: not already compacting,
  messages exist, not loading) → POST /api/agent/compact (same auth + quota + zod shell)
  → runCompactionResponse reuses createUIStreamResponder with:
     model = COMPACTION_MODEL_ID (gemini-3.1-flash-lite), thinking = 'high',
     initialSystem = buildCompactionInstruction(files) [metadata only],
     maxOutputTokens = 3500, appendUserMessage = canned "generate the summary" turn,
     extraMetadata = { isCompactedSummary: true }
  ← client parses the SSE stream ITSELF (useCompaction, not useChat):
     fetch → parseJsonEventStream({ schema: uiMessageChunkSchema }) → readUIMessageStream
     → withCompactionMetadata stamps isCompactedSummary + modelId onto a stable
       `compact-<timestamp>` message id → live setMessages each chunk
  → reconcileFinishedStep persists the summary + all messages
  → NEXT agent/compact requests: sliceMessagesAfterCompaction trims history to
    [latest summary, ...newMessages] server-side — pre-summary dialogue is never
    re-read or re-summarized
  → token-usage.ts: when the latest assistant message is a compaction summary, the
    active context meter resets to a 1500-token system baseline + summary output
```

### 3.3 The streaming protocol contract (client ↔ server)

- Wire format is the AI SDK 7 UI-message SSE stream (`text/plain` event stream of UI message chunks), consumed natively by `useChat`'s transport on the agent path and manually by `useCompaction` on the compaction path.
- **`data-workspace` parts** carry `{ event: 'file-updated', file }` or `{ event: 'file-deleted', fileId, name }` and are the ONLY live-update channel for the workspace canvas — written by tools via the `writer` closure, consumed by `useChatSession.onData`.
- **Tool parts** carry `fileSummarySchema` metadata (id, name, language, charCount, timestamps) — full content deliberately excluded to keep message parts lightweight; full bodies travel only via `data-workspace`.
- **`messageMetadata`** attaches `{ usage, stepTotalUsage, modelId }` to the finished assistant message's `finish` part; `useCompaction` additionally stamps `isCompactedSummary`.
- **Quota headers** (`X-RateLimit-Remaining-5h`, `X-RateLimit-Remaining-Week`, and on 429 `Retry-After` + `X-RateLimit-Retry-After`) are parsed by the transport/compaction on EVERY response and merged into `RateLimitContext`.
- **Error protocol:** non-2xx JSON errors are `{ error, message?, details?, retryAfter? }`; the client maps them to friendly copy and either replaces the in-flight assistant message (persisted) or shows the quota card.

**Streaming part-type inventory** (what a finished assistant message may contain, in order):

| Part type | Producer | Client rendering |
|-----------|----------|------------------|
| `text` | smoothStream word deltas | SmoothStreamText markdown bubble text |
| `reasoning` | Gemini thoughts / DeepSeek reasoning_content | ThoughtAccordion (collapsed by default) |
| `tool-input-delta` | coalesced JSON arg chunks | tool card "loading" state (aggregated) |
| `tool-call` / `tool-input-end` | tool invocation | ToolCallCard via `resolveToolDisplay` |
| `data-workspace` | tool `writer.write` | live workspace canvas updates (onData) |
| `finish` | stream completion | metadata stamping (`usage`, `stepTotalUsage`, `modelId`, `isCompactedSummary`) |

**System prompt anatomy (`buildSystemInstruction`)** — rebuilt per step with live state:
1. Identity + mission (Strata AI workspace architect persona).
2. Active workspace state: current date (en-US long), populated/empty status, metadata-only file listing (name, language, charCount, id) — content NEVER inline.
3. Hard constraints from `@/lib/limits`: 3 files max, 10k chars/file, 2k chars/prompt, 50k total workspace, plus the token-budget section (occupancy %, headroom, "be concise / use /compact" when ≥80%).
4. Autonomous tool directives: `readFile` before `editFile`, prefer `editFile` over `writeFile`, hygiene rules for rename/delete.
5. Web search discipline: `maxResults: 6` default, `basic` depth by default, `advanced` for deep research, `includeDomains` targeting official docs, `extractUrl` escalation with 18k-char caps and citation requirements.
6. Agentic workflow protocol: Inspect/Research → Mutate → Verify/Confirm phases.
7. Chat vs. Canvas separation: never dump full file contents into chat; 1-2 sentence confirmations.
8. Error handling + tone + rich GFM output formatting directives.

### 3.4 Server vs. Client component boundary

- **Server Components (4):** root `layout.tsx` (resolves session + quota server-side to hydrate `RateLimitProvider`, injects the anti-flash theme bootstrap script), `/` `page.tsx` (public landing page — resolves the session server-side and renders `LandingClient`), `/auth/page.tsx` (pure redirect preserving `callbackUrl`), and `not-found.tsx`. All of these use async APIs (`await headers()`, `await searchParams`) which force per-request dynamic rendering of the root shell.
- **`'use client'` is permitted and expected** for: every page under `/chat-id`, all auth pages, all chat/workspace/sidebar components, all hooks, and `RateLimitContext`. Rationale: the product IS a real-time streaming chat client — the interactive surface is the entire app; server rendering provides only the auth/quota bootstrap.
- **Rules that keep this sane:** never import `@ai-sdk/google`/`@ai-sdk/fireworks`/`pg`/`better-auth` (server) into client code; all provider wiring lives in `lib/ai/providers.ts`; pages remain thin presentational shells that call hooks and pass props down (no Dexie queries, session fetching, or navigation inside components).
- **Decision criterion:** a file needs `'use client'` iff it (or its hook subtree) uses React hooks, event handlers, browser APIs, or streaming state — otherwise it stays an RSC by default. The chat product legitimately requires client rendering nearly everywhere, but the four RSC files are server for a reason: their async request APIs (`await headers()`, `await searchParams`) opt the shell into per-request dynamic rendering and must stay server-side.
- **Async request APIs:** `params` is typed `Promise<{ id: string }>` and unwrapped with `use(params)` in the chat page; `searchParams` is `Promise<...>` in the server `/auth` page and read via `useSearchParams` (wrapped in `Suspense`) on the client.

### 3.5 Next.js caching & rendering strategy

- **All pages are dynamic, none are static — by design.** The following are intentionally ABSENT and must not be introduced without revisiting the local-first premise: `use cache`, `cacheLife`/`cacheTag` profiles, Partial Prerendering (PPR), ISR, `revalidatePath`/`revalidateTag`, and `generateStaticParams`. The root layout's `await headers()` call opts the whole tree into per-request rendering. Every route is session- or client-state dependent, and chat data lives in the browser (IndexedDB), so server-side static caching would serve nothing. The only statically prerendered outputs are the SEO MetadataRoute files (`src/app/robots.ts`, `src/app/sitemap.ts`) — no page is ever static.
- **Cache inventory (what actually caches, and where):**
  - Dexie (IndexedDB v5) — the entity cache/read-model: conversations, messages, workspace files; survives reloads and network drops.
  - `localStorage` — theme (`strata-theme`), model (`selectedModel`), thinking level (`selectedThinkingLevel`).
  - `sessionStorage` — sidebar open state (`strata_sidebar_open`).
  - Better Auth session cookie cache (`cookieCache`, 5 min) — the only server-side cache on the request path; avoids a DB read per proxy/route hit.
  - `message_log` 7-day purge — bounded table growth, runs inside the rate-limit transaction.
  - Per-step system-prompt re-injection — a "live state" cache: the model sees the current workspace metadata each step without replaying history.
- **Context-window "cache" management:** assistant messages carry `metadata.usage` (last-step) + `metadata.stepTotalUsage` (multi-step API totals); `calculateTokenMetrics` derives active-context occupancy (Claude Code/OpenCode/Codex paradigm) and flips the UI + system prompt into "be concise / /compact" mode past `NEAR_LIMIT_PERCENT` (80%); sending is hard-blocked at 100% (with a "Compact history or start a new chat" error).
- **Server-side cache-like behaviors:** Better Auth session cookie cache (5 min) avoids a DB hit per request in the proxy; the rate-limit log purges entries older than 7 days on every check (bounded table growth); per-step system-prompt re-injection keeps the model's view of the workspace fresh without replaying history.
- **Runtime:** every route handler and page runs on the Node runtime; no Edge runtime usage anywhere (the proxy runs in the default middleware runtime).

### 3.6 Authentication, authorization & session lifecycle

- **Enforcement layers (defense in depth):**
  1. **Proxy (pre-render):** `getSessionCookie(request)` — a cheap cookie-presence check only. Missing cookie → API routes get JSON 401, pages get 302 to `/auth?callbackUrl=<path>`. Matcher scoped to `/`, `/chat-id/:path*`, `/api/agent`, `/api/agent/:path*`; `/` is a public bypass (the landing page is unauthenticated by design), as are `/auth`, `/api/auth`, `/_next/`, favicon. Also sets security headers.
  2. **Route Handlers:** every API route independently calls `auth.api.getSession({ headers })` (real session validation, not just cookie presence) and returns 401 before touching quota or model.
  3. **Client pages:** `useSession()` from the Better Auth client; pages render a "Verifying session..." spinner and `router.replace('/auth?callbackUrl=...)` when unauthenticated.
- **Model:** session-based, not RBAC/ABAC. There is exactly one role tier (signed-in user). Authorization questions reduce to "is there a valid session, and does the quota allow this?" There is no admin surface in the app.
- **Session lifecycle:** Better Auth issues a cookie-backed session stored in the `better_auth.session` table (FK → `user` with `ON DELETE CASCADE`); `cookieCache: { enabled: true, maxAge: 300 }`; sign-out via `authClient.signOut` clears both client and server state. `RateLimitContext` resets quota state when `userId` changes or becomes null (render-phase state sync, not an effect).
- **Auth flows:** sign-up/sign-in are client-side Better Auth calls (`signUp.email` / `signIn.email`) returning `{ error, data }`; `useAuthForm` handles the pending/error/success state machine and redirects to `callbackUrl` after 300ms + `router.refresh()`; forms validate password length ≥8 and required fields client-side; no email verification is required (`requireEmailVerification: false`).

## 4. Directory Structure Map

```
Strata Ai/
├── AGENTS.md                  — Agent operating rules: bun-only commands, Milo design tokens,
│                                architecture pointers, test conventions (read before editing).
├── next.config.ts             — standalone output, strict TS, picsum.photos image allowlist,
│                                transpilePackages: ['motion'], serverExternalPackages: ['pg'].
├── tsconfig.json              — strict TS 6, @/* path alias → ./src/*, incremental builds.
├── eslint.config.mjs          — ESLint 9 flat config (eslint-config-next).
├── package.json               — bun scripts + dependency manifest; @types/react overrides pinned.
├── bun.lock                   — bun lockfile (never touch; bun install only).
├── .env.example               — authoritative env-var list (keys listed in §2).
├── scripts/
│   ├── better-auth-schema.sql — DDL: better_auth schema (user/session/account/verification)
│   │                            + message_log quota table + (user_id, created_at) index.
│   ├── migrate-better-auth-schema.ts — Executes the SQL above (bun run db:migrate).
│   └── test-db.ts             — Connection + schema healthcheck (bun run db:test).
├── __tests__/                 — 15 bun test suites; helpers.ts shared fixtures (makeFile,
│   │                            runTool, setupWorkspaceTools, jsonResponse); route tests mock
│   │                            @/lib/auth, @/lib/rate-limit, @/lib/ai/agent-runner via mock.module.
│   └── types.d.ts             — Global test typings.
├── docs/                      — SUMMARY.md (THIS FILE — canonical architecture guide) + AI SDK tutorial guide.
└── src/
    ├── proxy.ts               — Next 16 middleware replacement: session-cookie gate + security
    │                            headers; matcher scoped to app shell + agent API only.
    ├── app/
    │   ├── layout.tsx         — Root RSC: Plus Jakarta Sans font, viewport (interactiveWidget),
    │   │                        full SEO metadata (OG/Twitter cards, JSON-LD WebApplication,
    │   │                        Google verification, canonical), anti-flash theme script,
    │   │                        SSR session+quota → RateLimitProvider.
    │   ├── page.tsx           — Server landing: public marketing page resolving the session
    │   │                        server-side (graceful fallback) → renders LandingClient.
    │   ├── not-found.tsx      — 404 page (Milo-styled, text-display).
    │   ├── robots.ts          — SEO MetadataRoute: crawl rules (allow all, disallow agent API
    │   │                        paths) + sitemap URL → static /robots.txt.
    │   ├── sitemap.ts         — SEO MetadataRoute: public routes (/, /auth/signin, /auth/signup)
    │   │                        with priorities → static /sitemap.xml.
    │   ├── auth/              — Route group (public): /auth redirect server page, /auth/signin
    │   │   └── signup/        —   + /auth/signup client pages (Suspense-wrapped useSearchParams).
    │   ├── chat-id/[id]/      — THE app: full chat workspace page (client); StickToBottom scroll,
    │   │                        Sidebar + ChatHeader + ChatPanel + ChatInput + WorkspaceDrawer.
    │   └── api/
    │       ├── auth/[...all]/ — Better Auth catch-all handler (GET+POST, toNextJsHandler).
    │       ├── agent/route.ts — POST agent stream: auth → quota → zod → runner (thin shell).
    │       ├── agent/compact/ — POST compaction stream: same shell → runCompactionResponse.
    │       └── user/rate-limit/ — GET quota snapshot (read-only, no increment).
    ├── components/
    │   ├── chat/              — ChatPanel (memo, hero), ChatHeader (title, context popover,
    │   │                        workspace files button, mobile toggles), ChatInput (composer
    │   │                        orchestrator: textarea, attachments, model selector, slash
    │   │                        menu, send/stop), TokenUsagePopover, animations.ts (shared
    │   │                        motion presets: accordion/popover/pill/hero/attachment variants).
    │   │   ├── composer/      — AttachmentPreviews, ComposerStatusRow, ComposerToolbar (attach
    │   │   │                    button, model selector menu, send/stop), ModelSelectorMenu,
    │   │   │                    SlashCommandMenu.
    │   │   ├── message/       — ChatBubble, UserMessageAttachments (image thumbnails),
    │   │   │                    ToolCallCard (config-agnostic), ThoughtAccordion,
    │   │   │                    WorkGroupCard, MessageActionsMenu, CompactionDivider,
    │   │   │                    QuotaErrorCard.
    │   │   └── tools/         — resolver.tsx (toolMeta table: normalize → config/icon/badge/
    │   │                        summary) + summaries.tsx (summary builders + SummaryLine).
    │   ├── landing/          — Public landing page (all 'use client', under LandingClient):
    │   │                        LandingHeader (sticky nav w/ #artifacts/#philosophy/#specimens
    │   │                        anchors, theme toggle), LandingHero (contour-grid background,
    │   │                        registration marks, 6 floating tool badges, mobile tools strip),
    │   │                        LandingArtifacts (#artifacts: 3 artifact cards — compaction
    │   │                        index card, living manuscript w/ interactive marginalia, field
    │   │                        ledger), LandingPhilosophy (#philosophy: 3 tenets),
    │   │                        LandingSpecimens (#specimens: engine calibration plates),
    │   │                        LandingCTA (+05 invitation, no prompt chips), LandingFooter,
    │   │                        animations.ts (fadeUp/card/stagger + marginalia + artifact/
    │   │                        specimen hover variants, viewportOnce scroll reveals).
    │   ├── workspace/         — WorkspaceDrawer (file selector, editor with header char count,
    │   │                        code viewer, empty state, footer), WorkspaceFileSelector,
    │   │                        WorkspaceEditor, CodeViewer (line numbers + Prism),
    │   │                        WorkspaceEmptyState, WorkspaceDrawerFooter.
    │   ├── sidebar/           — Sidebar, SidebarHeader, SidebarFooter, ConversationList,
    │   │                        ConversationItem, NewChatButton, RateLimitRing (quota ring).
    │   ├── auth/              — auth-shell, sign-in-form, sign-up-form, loading-screen, user-button.
    │   ├── ui/                — strata-icon (brand SVG), ConfirmDialog (destructive confirmations), MarkdownRenderer (markdown render hub), SmoothStreamText (streaming markdown leaf — consumed only by MarkdownRenderer), createMarkdownComponents.tsx (GFM component map).
    │   └── theme-toggle.tsx   — Light/dark toggle driving useTheme.
    ├── contexts/
    │   └── RateLimitContext.tsx — Global quota state: SSR hydrate → client fetch fallback →
    │                            transport header sync; resets on user change.
    ├── hooks/                 — useChatSession (orchestrator), useChatTransport (network layer,
    │   │                        header parsing), useCompaction (manual SSE client), useConversations
    │   │                        (list/cap/pin/rename/delete+nav), useModelSettings, useWorkspaceFiles
    │   │                        (150ms write coalescing), useTheme (useSyncExternalStore),
    │   │                        useAuthForm/useSignIn/useSignUp/useSignOut,
    │   │                        useLatestConversationRedirect (retained but UNUSED — landing
    │   │                        navigation moved into LandingClient's handleOpenStudio),
    │   │                        useCopyClipboard, use-mobile.
    └── lib/
        ├── auth.ts            — Server Better Auth instance (pg Pool, cookie cache, nextCookies).
        ├── auth-client.ts     — Browser Better Auth client + useSession export.
        ├── rate-limit.ts      — Atomic sliding-window quota check/increment + read-only status.
        ├── models.ts          — Model catalog (6 entries, pricing, context windows, per-model
        │                        supportsVision), thinking-level config, localStorage preferences,
        │                        COMPACTION_MODEL_ID.
        ├── limits.ts          — All magic numbers (chars, files, conversations, quota, NEAR_LIMIT)
        │                        + quota error builders. NEVER hardcode these elsewhere.
        ├── schemas.ts         — WorkspaceFileSchema + agentRequestBodySchema (shared API contract).
        ├── token-usage.ts     — ChatMetadata, active-context/session/cost metrics from message
        │                        metadata; compaction-aware context reset.
        ├── edit-engine.ts     — StringEditEngine: exact → whitespace-normalized → anchor-matched.
        ├── languages.ts       — 24+ language metadata, extension maps, detectLanguage.
        ├── syntax-highlighter.ts — Prism singleton registration.
        ├── id.ts              — generateId (crypto.randomUUID with fallback).
        ├── image-utils.ts     — Client image pipeline: MIME whitelist + size validation, canvas
        │                        downscale/encode-to-budget, shared countImageParts /
        │                        findImagePartViolations (server backstop for /api/agent).
        ├── clipboard.ts       — stripMarkdown + copyToClipboard (execCommand fallback) for
        │                        MessageActionsMenu + snippet copy.
        ├── db/db.ts           — Dexie v5 schema + all CRUD helpers (conversations/messages/files).
        └── ai/
            ├── index.ts       — Barrel: prompts + tools.
            ├── agent-runner.ts— ALL streamText config; createUIStreamResponder shared by agent
            │                    and compaction; SSE wrapping + quota headers.
            ├── providers.ts   — resolveAgentModel (google/fireworks wiring, reasoning mapping,
            │                    providerOptions); DEFAULT_AGENT_MODEL.
            ├── prompts.ts     — buildSystemInstruction (8 sections, file metadata only, token
            │                    budget, date awareness) + buildCompactionInstruction.
            ├── workspace.ts   — Pure file-list algebra (upsert/remove/find, case-insensitive)
            │                    + createMutableWorkspace (per-request closure context).
            ├── chat-reconciler.ts — Persist step, merge file deltas, auto-continuation loop.
            ├── chat-error-handler.ts — Friendly error mapping (network/401/400/quota) + repair.
            ├── message-extractor.ts — File delta extraction from tool parts (modern+legacy shapes),
            │                    compaction-index finder, sliceMessagesAfterCompaction (pruning SOT).
            ├── message-segments.ts — flattenMessageSegments: user-text / text / reasoning / tool /
            │                    work-group segments for the bubble renderer.
            └── tools/
                ├── types.ts   — WorkspaceToolsContext closures + fileMetadata/fileSummary schemas.
                ├── workspace-tools.ts — listFiles/readFile/writeFile/editFile/renameFile/deleteFile
                │                    with caps, truncation, and data-workspace writes.
                └── tavily-tools.ts — webSearch + extractUrl (raw fetch, timeouts, error mapping).
```

## 5. Domain Models, Data Schemas & State Invariants

### 5.1 Client-side entities (Dexie, IndexedDB v5 — `StrataAIChatDB`)

- **Conversation** (table `conversations`, PK `id`; indexes `userId`, `updatedAt`, `createdAt`): id (UUID), userId (optional — legacy rows predate scoping and remain visible), title (auto-derived from first message, 40-char truncation, "New Chat" default), model (catalog id), thinkingLevel (optional), pinned (optional boolean, sorts first), files (embedded WorkspaceFile array — the full workspace snapshot lives ON the conversation row, not a separate table), activeFileId, createdAt/updatedAt (ISO strings; updatedAt drives sidebar ordering).
- **DBMessage** (table `messages`, PK `id`; indexes `chatId`, `userId`, `timestamp`): the AI SDK `UIMessage` (role, content, parts incl. tool parts + metadata) extended with chatId, userId, timestamp. `metadata` carries `usage`/`stepTotalUsage`/`modelId`/`isCompactedSummary`. Ordering is by `timestamp`, which `persistMessages` fabricates as `Date.now() + index` (strictly increasing, no UUID tie-break collisions). Storage-only fields are stripped on read (`getChatMessages`).
- **WorkspaceFile** (embedded in Conversation.files, validated by `WorkspaceFileSchema`): id, name (case-insensitive uniqueness enforced by the upsert algebra), content (string; truncated at 10,000 chars on write), language (detected from extension by `detectLanguage`, default markdown), createdAt, updatedAt.
- **Key invariants:** a conversation holds ≤3 files, ≤10k chars each, ≤50k chars total; file identity is id-OR-case-insensitive-name (upsert/replace semantics everywhere — `isSameFilename` trims + lowercases); deleting a conversation atomically deletes its messages in one Dexie transaction (`deleteConversation`); `activeFileId` always falls back to the first remaining file (or undefined); `saveWorkspaceFile` skips no-op writes; `updateConversationFiles` always bumps `updatedAt` so the chat surfaces to the top of the sidebar.
- **Persistence-side effects:** every message mutation also bumps the conversation's `updatedAt`; the sidebar query sorts pinned-first then `updatedAt` desc; the conversation cap (5) is enforced at the "new chat" action only.

### 5.2 Server-side entities (Postgres, `better_auth` schema)

- **user**: id (TEXT PK), name, email (UNIQUE), emailVerified (bool, default false — verification disabled), image, timestamps.
- **session**: id (TEXT PK), token (UNIQUE), expiresAt, ipAddress/userAgent, userId FK → user ON DELETE CASCADE (sessions die with the user).
- **account**: providerId/accountId (email/password provider), userId FK CASCADE, password hash column, token columns, timestamps.
- **verification**: identifier/value/expiresAt (unused by current config but required by Better Auth).
- **message_log** (quota ledger, NOT a Better Auth table): id UUID `gen_random_uuid()` PK, user_id FK → user ON DELETE CASCADE, created_at TIMESTAMPTZ default NOW(); composite index `(user_id, created_at)` backs both count queries and the 7-day purge.
- **Relationship summary:** user 1:N session · user 1:N account · user 1:N message_log · message_log has NO client-side counterpart (quota only). No soft-delete pattern anywhere; deletion is hard + cascaded.

### 5.3 State machines & enums

- **Assistant turn:** submitted → streaming (word-paced) → finished (finishReason: 'stop' | 'step-limit' | other) → persisted. `step-limit` triggers up to 2 auto-continuation passes (each a fresh full request with the "Please continue completing the task where you left off" instruction); exceeding 2 resets the counter and waits for user input; the counter resets on every user send.
- **Tool lifecycle (per tool call):** input-streaming → input-available → call → output-available (modern AI SDK 7 shapes; legacy `result` states also handled by the extractor + resolver). UI status derived as loading/success/error (`success === false` or `error` string ⇒ error; `output-error` state ⇒ error).
- **Workspace file ops:** create (writeFile, action 'created'|'replaced') → edit (editFile: exact → whitespace-normalized → anchor-matched strategies; ambiguity = error with guidance) → rename (collision-checked case-insensitively, language re-detected) → delete (fileId/name removed, active fallback). Cap rejections: file count (create), per-file size (editFile rejects, writeFile truncates), total workspace size (editFile rejects).
- **Quota windows:** 5-hour window (cap 10) and 7-day window (cap 50); a check is allowed only if BOTH have room; `retryAfter` = seconds until the oldest entry leaves the exhausted window; both windows tracked in the same `message_log` rows (5h is a subset of 7d counts); the purge deletes >7-day rows before counting.
- **Thinking levels:** minimal / low / medium / high, per-model allowed sets (`MODEL_THINKING_LEVELS`), persisted in localStorage + conversation row; invalid stored levels fall back to the model default via `getValidThinkingLevelForModel`; DeepSeek collapses onto low/high.
- **Vision support:** models declare `supportsVision` (every Gemini entry true; DeepSeek V4 Flash false); `getModelSupportsVision(modelId)` gates the composer attach button, and the agent runner strips image parts from replayed history for text-only providers.
- **Theme state:** light (default) ↔ dark, keyed by `localStorage['strata-theme']`; dark = `.dark` class + `html[data-theme="dark"]` attribute with `color-scheme: dark`.

### 5.4 Limits & caps enforcement matrix

| Cap | Constant (`lib/limits.ts`) | Enforced at | Enforcement behavior |
|-----|---------------------------|-------------|----------------------|
| Message length | `MAX_MESSAGE_CHARS` 2000 | client counter + server 400 | Client disables send; server rejects with 400 |
| Images per message | `MAX_IMAGES_PER_MESSAGE` 4 | client attach gate + server 400 | Attach UI stops at 4; route rejects with 400 |
| Image input size | `MAX_IMAGE_INPUT_BYTES` 5 MB | client validation | Oversized files rejected at pick time |
| Image output size | `MAX_IMAGE_OUTPUT_BYTES` 1.5 MB (`MAX_IMAGE_DATA_URL_CHARS` 2 M on the wire) | client encoder + server 400 | Compression loop (quality + dimensions) fits the budget; route rejects oversized data URLs |
| Image dimension | `MAX_IMAGE_DIMENSION` 1280 px | client encoder | Long edge capped during compression |
| Files per workspace | `MAX_FILES_PER_WORKSPACE` 3 | tool + hook | writeFile rejects with guidance; UI create guard |
| Per-file size | `MAX_FILE_CHARS` 10000 | tool + hook | writeFile truncates; editFile rejects (result too large); editor truncates |
| Total workspace size | `MAX_WORKSPACE_TOTAL_CHARS` 50000 | editFile tool only | editFile rejects with remaining-budget math |
| Conversations per user | `MAX_CONVERSATIONS_PER_USER` 5 | sidebar "New Chat" action | Action no-ops + UI hint |
| 5h quota | `QUOTA_5H_LIMIT` 10 | server route (atomic) | 429 + retryAfter; UI ring/blocked send |
| Weekly quota | `QUOTA_WEEK_LIMIT` 50 | server route (atomic) | 429 + retryAfter; UI ring/blocked send |
| Context occupancy | `NEAR_LIMIT_PERCENT` 80 | client metrics + system prompt | UI warning + "be concise" prompt mode; 100% hard-blocks send |
| Agent steps | — (route clamp) | server clamp 1..30 | Default 25; `isStepCount` stops the loop |
| Auto-continuations | — (reconciler) | client ref counter | ≤2 passes after `step-limit` |

### 5.5 Assistant-message metadata contract (`ChatMetadata`)

| Field | Producer | Consumer | Semantics |
|-------|----------|----------|-----------|
| `usage` | server `messageMetadata` (finish part) | `token-usage.ts`, TokenUsagePopover | Provider-reported usage of the FINAL step only (active context snapshot) |
| `stepTotalUsage` | server (finish part) | cost + session analytics | Cumulative API tokens across all tool steps (never displayed as active) |
| `modelId` | server / `useCompaction` | per-model cost breakdowns | Catalog id of the serving model |
| `isCompactedSummary` | server (`extraMetadata`) + client stamp | `sliceMessagesAfterCompaction`, CompactionDivider, token reset | Marks the compaction anchor message |

## 6. Routing & Page Architecture (App Router)

| Path / Route Group | Rendering Type (RSC / Client / Static) | Runtime (Node / Edge) | Auth level (Public / Protected / Admin) | Purpose & key child components |
|--------------------|-----------|---------|-----------|--------------------------------|
| `/` | RSC (dynamic) | Node | Public (proxy bypass) | Public landing page: session resolved server-side → `LandingClient` (sticky `LandingHeader` with theme toggle + Sign In / Open Studio, `LandingHero` with contour grid + floating tool badges, `LandingArtifacts` #artifacts, `LandingPhilosophy` #philosophy, `LandingSpecimens` #specimens, `LandingCTA`, `LandingFooter`). "Open Studio" routes authenticated users to the latest Dexie conversation or a fresh `/chat-id/<uuid>` |
| `/auth` | RSC (dynamic) | Node | Public | Pure redirect to `/auth/signin`, preserving `callbackUrl` query param (awaits `searchParams`) |
| `/auth/signin` | Client (dynamic, Suspense-wrapped) | Node | Public | Email/password sign-in: `AuthShell` + `SignInForm`, `useSignIn`, bounces signed-in users to callbackUrl |
| `/auth/signup` | Client (dynamic, Suspense-wrapped) | Node | Public | Registration: `AuthShell` + `SignUpForm`, `useSignUp`, redirects on success |
| `/chat-id/[id]` | Client (dynamic, entire subtree) | Node | Protected | The app shell: `Sidebar` (conversation list, cap 5, pin/rename/delete, theme toggle, sign-out, quota ring), `ChatHeader` (title, token usage popover, workspace files button, mobile toggles), `ChatPanel` (hero empty state with suggestion chips + `ChatBubble` list + quota card + typing dots), floating `ChatInput` composer (text + model selector + up to 4 image attachments, slash menu), `WorkspaceDrawer` (file selector, editor with top-right char counter, code viewer, footer). Uses `use(params)`; `StickToBottom` owns all scrolling |
| `/not-found` (global) | RSC (dynamic) | Node | Public | Milo-styled 404 with back-home CTA |
| `GET/POST /api/auth/[...all]` | Route Handler (N/A — no page) | Node | Public (auth endpoints) | Better Auth catch-all: sign-in, sign-up, session, callbacks |
| `POST /api/agent` | Route Handler (streaming SSE; N/A — no page) | Node | Protected + quota | Agent turn: session → quota increment → zod → image-part validation → history slice → `runAgentResponse`; UI-message SSE + `X-RateLimit-*` headers |
| `POST /api/agent/compact` | Route Handler (streaming SSE; N/A — no page) | Node | Protected + quota | Compaction turn: same shell → `runCompactionResponse` (dedicated Flash Lite, 3500 output cap, `isCompactedSummary` metadata) |
| `GET /api/user/rate-limit` | Route Handler (N/A — no page) | Node | Protected | Read-only quota snapshot for client hydration/refresh |
| `/robots.txt` / `/sitemap.xml` | Static (MetadataRoute: `robots.ts` / `sitemap.ts`) | Node (build-time) | Public | SEO: crawl rules disallowing agent API paths + sitemap of public routes (landing, signin, signup) |

- **Chat page composition (leaf components under `/chat-id/[id]`):** the page wires `useChatSession` (one orchestrator returning ~24 props) into `ChatHeader` (title/token popover/workspace entry), `ChatPanel` (memoized; welcome-message pool hashed by chatId; suggestion chips dispatch a `insert-chat-prompt` custom event that `ChatInput` listens for; `CompactionDivider` markers around `isCompactedSummary` messages; `QuotaErrorCard` above the composer), `ChatInput` (auto-growing textarea, 2000-char counter, image attachments up to 4 with client-side compression, `/` slash menu with `SLASH_COMMANDS`, send/stop — internally composed of `composer/AttachmentPreviews`, `ComposerStatusRow`, `ComposerToolbar`), `Sidebar` (conversation CRUD + user footer), and `WorkspaceDrawer` (slide-over canvas with `WorkspaceFileSelector`, `WorkspaceEditor`/`CodeViewer` with top-right char limit indicators, footer with action buttons).
- **Cross-component events:** `open-workspace-drawer` (window listener in the chat page) and `insert-chat-prompt` (window listener in `ChatInput`) are the only two custom DOM events — do not add more without a strong reason.
- **Notes:** no parallel or intercepting routes exist; there are no `loading.tsx`/`error.tsx` boundaries (the only error UI is the client-side `QuotaErrorCard` + in-stream error message replacement); all pages render on the Node runtime (no edge runtime anywhere); route groups `(auth)`/`(dashboard)`/`(marketing)` from the generic outline do not exist — the root `/` is a public landing page (proxy bypass), the product's single app page is `/chat-id/[id]`, and auth is a plain `/auth` folder.

### 6.1 Chat-shell component inventory (all `'use client'`, all presentational)

| Component | Responsibility | Key props / conventions |
|-----------|---------------|-------------------------|
| `ChatPanel` (React.memo) | Message list + hero empty state + quota card + typing dots | `messages`, `isLoading`, `isNewChat`, `chatInputNode`; welcome message hashed from `chatId`; chips dispatch `insert-chat-prompt` |
| `ChatBubble` (`message/`) | One message row: segments → user-text / user-images / work-group / final text | Renders via `flattenMessageSegments`; delegates image thumbnails to `UserMessageAttachments`; streaming caret on last assistant |
| `UserMessageAttachments` (`message/`) | Thumbnail row of attached user images (React.memo) | `images: ImageAttachmentInfo[]`; data-URL sources; `rounded-xl` + `shadow-button` chips |
| `ChatInput` (React.memo) | Composer ORCHESTRATOR: textarea, 2000-char counter, image attachments (4 cap), slash menu, send/stop | Delegates to `composer/AttachmentPreviews`, `ComposerStatusRow`, `ComposerToolbar`; `onSendMessage`, `onTriggerCompaction`, quota/context gating; listens for `insert-chat-prompt` |
| `AttachmentPreviews` (`composer/`) | Thumbnail grid of pending image attachments with remove buttons | 4-cap enforcement; sources are the compressed data URLs |
| `ComposerStatusRow` (`composer/`) | Status line above the toolbar (typing indicator, token/context meter, quota hint) | Presentational; driven by `useChatSession` props |
| `ComposerToolbar` (`composer/`) | Image attach button (vision-gated), model selector menu, send/stop | Disabled states from quota/context gating |
| `ChatHeader` | Title, context window popover, workspace files drawer button, mobile sidebar toggle, mobile new chat button | `title`, `files`, `activeFileId`, `model`, `tokenUsage`, `onOpenFile`, `onOpenDrawer`, `onOpenSidebar`, `onNewChat` |
| `ToolCallCard` (`message/`) | Renders ONE resolved tool invocation | Consumes `ToolCardProps` from `resolveToolDisplay` — config-agnostic, never edited |
| `tools/resolver.tsx` | Tool-name normalization → config/icon/badge/summary builders | `toolMeta` table (config + summary builder per tool) + `TOOL_ALIASES`; add new tools here |
| `tools/summaries.tsx` | Per-tool summary builders (`build*`) + `SummaryLine` primitive | Consumed by `resolver.tsx`; 9 builders incl. bespoke listFiles/webSearch/extractUrl |
| `ThoughtAccordion` (`message/`) | Collapsible reasoning/thought text | Streams while loading; collapses on finish |
| `WorkGroupCard` (`message/`) | Collapsed "work performed" block (reasoning + tools + narration) | Rendered from the `work-group` segment |
| `MarkdownRenderer` (`ui/`) | THE single markdown render path for every surface | Props: `content`, `variant` (assistant/user/thought/canvas), `isStreaming`, `className`, `enableSnippetCopy` (canvas-only today); owns snippet-copy state internally via `useCopyClipboard` so copies never re-render parents; delegates streaming to `SmoothStreamText` |
| `SmoothStreamText` (`ui/`) | Progressive markdown rendering of streaming text | Word-chunk aware; caret animation; leaf consumed only by `MarkdownRenderer` |
| `SlashCommandMenu` (`composer/`) | `/` command popup (`SLASH_COMMANDS` incl. `/compact`) | Keyboard-navigable; appends command text |
| `CompactionDivider` (`message/`) | "Compaction started/completed" separators | Rendered around `isCompactedSummary` messages |
| `RateLimitRing` (`sidebar/`) | Live "X left" circular quota indicator | Reads `rateLimitData` |
| `QuotaErrorCard` (`message/`) | Dismissible exhausted-quota banner | Keyed by retryAfter+message; `onDismiss` |
| `TokenUsagePopover` | Active context %, session totals, per-model cost breakdown | From `calculateTokenMetrics` |
| `ModelSelectorMenu` (`composer/`) | Model + thinking-level picker in `ComposerToolbar` (upward dropdown, mobile gear icon fallback) | Groups by `MODEL_FAMILIES`; clamps levels |
| `MessageActionsMenu` (`message/`) | Per-message copy (via `lib/clipboard.ts`: `stripMarkdown` + `copyToClipboard`) / context actions | — |
| `Sidebar` + `ConversationList/Item` | Chat list: pinned-first, rename/pin/delete, cap hint | All actions via `useConversations` props |
| `NewChatButton` | New conversation creation | Respects `isMaxConversationsReached` |
| `WorkspaceDrawer` + subcomponents | Canvas: file tabs, editor (with top-right char counter `X / 10,000 chars`), code viewer, empty state, footer | `files`, `activeFileId`, CRUD callbacks; motion slide-over |
| `SidebarHeader/Footer` | Brand block + user menu (sign-out, theme toggle) | Session + quota + theme props |

### 6.2 Landing-page component inventory (all `'use client'`, under `components/landing/`)

| Component | Responsibility | Key conventions |
|-----------|---------------|-----------------|
| `LandingClient` | Landing orchestrator: Header → Hero → Artifacts → Philosophy → Specimens → CTA → Footer | Props `userId?` (server-resolved); `handleOpenStudio` Dexie-queries latest conversation → `router.push` or fresh `generateId()` chat |
| `LandingHeader` | Sticky top nav: brand, anchor links (`#artifacts` / `#philosophy` / `#specimens`), theme toggle, Sign In link / Open Studio button | Uses `useTheme`; `buttonHoverProps`; brand "Studio" chip |
| `LandingHero` | Editorial atelier hero: architectural contour-grid background + coordinate registration marks, headline "The workshop for thought that outlasts the chat.", 6 floating orbital tool badges (writeFile / webSearch / editFile / extractUrl / compactContext / readFile) with infinite float loops, mobile tools strip, CTA "Open the Atelier" / "Enter Workspace" | `SURROUNDING_TOOLS` config array (`TargetAndTransition` float animations); `staggerContainerVariants` / `fadeUpVariants`; badges hidden on mobile in favor of the strip |
| `LandingArtifacts` | "+ 02 / The Material Output" (#artifacts): 3 artifact cards — The Context Index Card (`/compact`, -84% tokens), The Living Manuscript (hover-triggered marginalia annotation bubble), The Field Ledger (Tavily realtime) | `marginaliaVariants` popup via `AnimatePresence`; `artifactHoverProps`; mono typewriter styling throughout |
| `LandingPhilosophy` | "+ 03 / The Three Tenets" (#philosophy): Atelier Not Slot Machine / Durable Files Not Disposable Bubbles / Surgical Compaction Not Context Rot | `TENETS` array; `cardVariants` |
| `LandingSpecimens` | "+ 04 / The Engine Specimens" (#specimens): calibration plates for Google Gemini 3.5, DeepSeek V4, Tavily with spec rows | `SPECIMENS` array; `specimenHoverProps`; per-spec accent tokens |
| `LandingCTA` | "+ 05 / The Invitation" — "Pull up a chair to the studio desk."; "Return to Workspace" / "Open the Studio" buttons + Create Account link (no starter-prompt chips) | Ambient `primary/10`→`secondary/10` glow; `buttonHoverProps` |
| `LandingFooter` | Minimal footer: brand + anchor links (#artifacts/#philosophy/#specimens) | Presentational |
| `animations.ts` | Landing-specific motion presets: softSpring/gentleSpring/tactileSpring, fadeUp, card, staggerContainer, `marginaliaVariants` (annotation bubble pop), `artifactHoverProps`/`specimenHoverProps`, `viewportOnce` | Types from `motion/react` only |

## 7. Data Flow, Server Actions & Integration Map

### 7.1 Server Actions map — there are NONE

This codebase intentionally ships zero Server Actions (no `"use server"` directives exist). All mutations are:
1. **Route Handler POSTs** for model work (`/api/agent`, `/api/agent/compact`) — streamed, quota-gated.
2. **Client-side Dexie writes** for all local persistence (conversations, messages, files, pins, titles, model overrides) executed directly from hooks (`useConversations`, `useModelSettings`, `useWorkspaceFiles`, `chat-reconciler`).
3. **Better Auth client calls** (`signIn.email`, `signUp.email`, `signOut`) for identity.
Any new "mutation" must follow one of these three lanes — introducing `use server` would create a second mutation authority and break the thin-shell route pattern.

### 7.2 Route Handler validation & error protocol

- **Pipeline (both agent routes):** auth 401 → rate-limit 429 (with `Retry-After` + `X-RateLimit-*` headers; quota is consumed BEFORE body validation to prevent free probing) → malformed JSON 400 → zod `safeParse` 400 with `.flatten()` details → semantic 400 (message > 2,000 chars; image count > 4; disallowed image MIME; image data URL over 2 M chars) → stream.
- **Agent route extras:** `maxSteps` clamped to 1..30 (default 25); messages pruned with `sliceMessagesAfterCompaction` (single source of truth, shared by both endpoints — the client transport never mutates the payload).
- **Webhooks & public endpoints:** none exist today. The only non-auth routes are `/api/agent`, `/api/agent/compact`, and `/api/user/rate-limit` — all session-gated. Inbound-webhook integration guidance lives in §11 Recipe C.
- **HTTP contract table:**

| Status | Meaning | Body shape | Headers |
|--------|---------|-----------|---------|
| 200 | Streaming SSE UI-message stream | UI message chunks (text/plain stream) | `X-RateLimit-Remaining-5h`, `X-RateLimit-Remaining-Week` |
| 401 | No valid session | `{ error }` JSON | — |
| 429 | Quota exhausted | `{ error, message, retryAfter }` JSON | `Retry-After`, `X-RateLimit-Remaining-5h: 0`, `X-RateLimit-Remaining-Week`, `X-RateLimit-Retry-After` |
| 400 | Malformed JSON / zod failure / message too long / image-attachment violations | `{ error, details }` JSON | — |

- **Client error mapping (`chat-error-handler.ts`):** network → "check your connection"; 401 → session expired; 400/character-limit → shorten message; 429 → quota card; otherwise generic retry copy. The in-flight assistant message is replaced with the error text and persisted, so errors survive reload.
- **Quota header contract:** the client transport parses headers on EVERY response and syncs `RateLimitContext`; missing headers on non-stream errors default to full quota so the UI never lies downward.

### 7.3 Third-party integrations

| Integration | Surface | Failure & rate-limit mitigation |
|-------------|---------|--------------------------------|
| Google Gemini (`@ai-sdk/google`) | All Gemini/Gemma models via `resolveAgentModel` | SDK-native; 30-step cap bounds spend; quota gate prevents runaway calls; abort signal from request propagates |
| Fireworks (DeepSeek V4 Flash) | Same agent pipeline, separate provider | Same caps; cross-provider metadata sanitized on replay (see §8) |
| Tavily search + extract (raw fetch) | `webSearch` / `extractUrl` tools | 30s/45s `AbortSignal.timeout`; multi-shape error extraction (401/429/432/433 status map); missing key degrades to a friendly tool error instead of crashing the agent; extract results truncated to 18k chars; URL protocol normalization before calling |
| Supabase Postgres (pooler) | Auth + quota | Single shared pool per concern (`auth.ts`, `rate-limit.ts`); transactions with explicit ROLLBACK/COMMIT; 7-day purge keeps counts accurate; healthcheck script for deployments |
| Better Auth | Sessions | Cookie cache (5 min) reduces DB reads; sessions cascade-deleted with users |

### 7.4 Tool contract map (server-side tool → client effect)

| Tool | Input highlights | Output shape | Side effects |
|------|------------------|--------------|--------------|
| `listFiles` | — | `{ count, files[] }` (metadata) | none |
| `readFile` | `nameOrId`, optional `section` | `{ exists, content? , error? }` | none (section = H1–H6 regex extract) |
| `writeFile` | `name`, `content`, `language?` | `{ action: created\|replaced, file }` | onUpdateFile + `data-workspace` file-updated |
| `editFile` | `nameOrId`, `explanation`, `searchString`, `replaceString` | `{ success, strategyUsed, file?, error? }` | onUpdateFile + `data-workspace` file-updated |
| `renameFile` | `nameOrId`, `newName` | `{ success, oldName, newName, file?, error? }` | onUpdateFile + `data-workspace` file-updated |
| `deleteFile` | `nameOrId` | `{ deleted, fileId?, name?, error? }` | onDeleteFile + `data-workspace` file-deleted |
| `webSearch` | `query`, `searchDepth`, `topic`, `maxResults`, `timeRange`/`days`, `include/excludeDomains` | `{ success, results[], error? }` | Tavily REST call (30s timeout) |
| `extractUrl` | `urls` (1–3), `extractDepth`, `query`, `chunksPerSource`, `format` | `{ success, extracted[], failed[], error? }` | Tavily REST call (45s timeout), 18k-char truncation |

File mutations all run through `createMutableWorkspace` closures (in-memory per request) AND emit `data-workspace` parts so the client canvas updates mid-stream; the persisted source of truth is reconciled later from the finished message by `message-extractor.ts` (`{ file }`, `{ files }`, or `{ deleted: true }` shapes are auto-discovered).

### 7.5 Quota math (worked example)

A user with 3 messages in the last 5 hours and 9 in the last 7 days sends a message: the transaction purges >7-day rows, counts 5h (3 < 10) and 7d (9 < 50), INSERTs a row, and returns `remaining5h: 6`, `remainingWeek: 40`, `allowed: true`. The 5h check hits first when both are near their caps; `retryAfter` is always computed against the oldest row in the exhausted window. The `/api/user/rate-limit` GET is the only read-only path (never increments).

## 8. Unique Project Patterns, Optimizations & Quirks

- **`createUIStreamResponder` (agent-runner.ts) — the single collapse point:** every `streamText` concern (model resolution, metadata sanitization, reasoning wiring, system-prompt re-injection per step, word-paced smoothing, tool-delta coalescing, step caps, lifecycle logging, UI-message SSE wrapping, quota headers, usage stamping) lives in ONE shared function; `runAgentResponse` and `runCompactionResponse` are just delta configs. New endpoints must reuse it — never hand-roll a second stream assembly.
- **`coalesceToolInputDeltas` transform:** buffers `tool-input-delta` chunks per tool-call id and flushes them once at `tool-input-end`/`tool-call`. Prevents AI SDK 7's message reducer from running O(N·length) `parsePartialJson` + `fixJson` per token on large tool args, which froze the UI. Delicate: must stay ahead of `smoothStream` in the transform array and preserve `providerMetadata`; logs coalescing stats at `[agent]` prefix.
- **`sanitizeMessagesForProvider`:** strips `providerMetadata` / `callProviderMetadata` / `resultProviderMetadata` keys belonging to providers other than the active one. Fixes Fireworks rejecting Gemini thought signatures re-emitted as `extra_content` on tool-call parts ("Extra inputs are not permitted"). The active provider's keys are intentionally kept (Gemini thought round-trip).
- **StringEditEngine fallback ladder:** exact → whitespace-normalized (CRLF + whitespace-run collapse, line-trimmed matching) → anchor-matched (first/last line within a ±5-line drift window). Every strategy refuses ambiguous multi-matches with instructive errors. This is the safety net that makes agent edits non-destructive; the system prompt instructs `readFile` before `editFile` and verbatim `searchString` copying.
- **Per-step system prompt re-injection:** `prepareStep` rebuilds `buildSystemInstruction` with the CURRENT workspace file list and token budget before every tool-loop step, so the model sees file changes without re-sending the full history — combined with `isStepCount` this makes long agent runs stable.
- **Active-context token accounting:** `metadata.usage` = final step only (avoids multi-step N-pass inflation); `stepTotalUsage` keeps the real API totals for cost; compaction resets the active meter to a 1,500-token system baseline + summary output; `calculateTokenCost` uses catalog pricing per model, grouping breakdowns by model id.
- **Refs-as-live-values in memoized closures:** the `DefaultChatTransport` and `chatRef` are created once (useMemo) but read model/thinkingLevel/files through refs updated by effects — this avoids transport re-creation on every keystroke while keeping payloads current (`eslint-disable react-hooks/refs` documented in-place).
- **Dexie write coalescing:** `useWorkspaceFiles.handleUpdateFile` debounces 150ms into a pending-map, batching rapid streaming-driven file updates into one DB write; `saveWorkspaceFile` also short-circuits no-op writes.
- **Auto-continuation loop:** `finishReason === 'step-limit'` silently re-invokes the agent (≤2 passes, 300ms apart) with a canned continuation prompt; the counter is per-user-turn and ref-based. Race-condition sensitivity: must reset on user send and never fire while `isCompacting`.
- **Compaction client protocol:** the compaction stream bypasses `useChat`'s transport entirely — a manual `fetch` + `parseJsonEventStream` + `readUIMessageStream` loop that stamps `isCompactedSummary` onto a stable `compact-<ts>` message id, then reconciles via the same `reconcileFinishedStep`. Server prunes history with `sliceMessagesAfterCompaction` on the NEXT requests. Compaction failures render + persist an in-stream error message.
- **SSR quota hydration:** root layout resolves session + `getRateLimitStatus` and passes `initialData` into `RateLimitContext`; the provider normalizes via a stable key string (avoids effect loops from fresh prop identity) and refetches `/api/user/rate-limit` client-side when SSR data is absent; state resets during render when `userId`/key changes (no effect needed).
- **Timestamps as ordering keys:** message order derives from fabricated `Date.now()+idx` timestamps — sorting by timestamp reproduces conversation order exactly; mutating this scheme risks reordering history.
- **Segmented message rendering (`flattenMessageSegments`):** during streaming every part renders ungrouped and live; on finish, all pre-answer output (intermediate narration, reasoning, tool cards) folds into one collapsible `work-group` segment, leaving only the final text as the bubble body. The memo recompute on `isStreaming` flip drives the collapse.
- **Tool display normalization (`tools/resolver.tsx`):** one `toolMeta` table maps each canonical tool to a `{ config, summary }` pair (icon, accent tokens, badge, and a builder from `tools/summaries.tsx`); raw names are normalized case/dash/underscore-insensitively via `TOOL_ALIASES` (`websearch`, `tavily`, `extractpage`, `listf`, `editf`); unknown tools render a generic card — `ToolCallCard` itself is config-agnostic and must stay untouched.
- **Client-side image attachments + server backstop:** images (JPEG/PNG/WebP/GIF, ≤4 per message, ≤5 MB input) are validated and re-encoded in the browser by `lib/image-utils.ts` — a canvas loop downscales to a 1280 px long edge and steps JPEG quality 0.85→0.3 (PNG for alpha) until the data URL fits a 1.5 MB budget (2 M chars on the wire). Pure helpers (`countImageParts`, `findImagePartViolations`) are shared with the `/api/agent` route so its 400 backstop mirrors the UI gate exactly. `getModelSupportsVision` disables attach on text-only models (DeepSeek), and `stripImageContentForTextOnlyProviders` removes image parts from replayed history so old image conversations survive a provider switch. Attachments render as a `user-images` segment (thumbnail row via `message/UserMessageAttachments`) above the user text.
- **`smoothStream` word-pacing + `SmoothStreamText`:** the server emits word-chunked deltas (25ms delay) and the client renders markdown progressively (via `MarkdownRenderer` → `SmoothStreamText`) with a streaming caret — this pair is the perceived-latency win; changing the delay or chunking affects the whole UX.
- **Known gotchas to not break:** (a) quota is incremented BEFORE zod validation (ordering matters for abuse protection and tests); (b) `sliceMessagesAfterCompaction` must remain server-side only; (c) the trailing empty assistant message after a quota cut-off is dropped by an effect keyed on `quotaError`; (d) `StickToBottom` owns all scroll — manual `scrollIntoView` loops are forbidden; (e) keep the resolver alias list in sync when adding tools; (f) `createMutableWorkspace` closures mutate one in-memory array per request — never share across requests; (g) `persistMessages` must keep the `Date.now()+idx` stamping; (h) Dexie schema changes require a new `version(n)` block, never an edit to an existing one; (i) keep image caps/whitelist in `lib/limits.ts` in sync across the client encoder, the attach UI, and the route backstop — the data-URL char gate (`MAX_IMAGE_DATA_URL_CHARS`) is the wire mirror of `MAX_IMAGE_OUTPUT_BYTES`.

## 9. Global State, Forms & UI Conventions

- **Client state strategy:** no external store. Three mechanisms: (1) React Context (`RateLimitContext`) for app-global quota; (2) hooks + `useLiveQuery` (Dexie) for entity state — Dexie IS the store; (3) URL params only for `callbackUrl`; `sessionStorage` for sidebar open state; `localStorage` for theme/model/thinking prefs. Server-actions state (`useActionState`) is unused — forms use local state machines instead.
- **`RateLimitContext` state shape:** `rateLimitData { remaining5h, remainingWeek, retryAfter? }` + `quotaError { message, retryAfter? }`; derived `buildQuotaErrorFromData` (null when a window has room); consumers: `useChatSession` (pre-send gating), `ChatInput` (disabled send + ring), `Sidebar` (ring), `QuotaErrorCard` (dismissible display).
- **Form handling:** React Hook Form is NOT used. `useAuthForm` is a shared client state machine (pending/error/success + redirect) parameterized by a `submitFn` (Better Auth client call) and a `validateFn` (plain string checks: required fields, password ≥8 chars). New forms should follow this pattern or plain controlled inputs + zod on the API side.
- **Validation protocol:** zod lives at the API boundary (request bodies) and inside tool schemas; the client rarely re-validates (server 400 messages are mapped to friendly copy). Character limits are enforced client-side for UX (counters, truncation) and server-side for truth (reject).
- **Telemetry/logging:** no Sentry/PostHog/analytics. Logging is deliberate `console.log`/`console.error` with prefix tags (`[agent]`, `[compaction]`, `[useChatSession]`, `[rate-limit API error]`, `[useCompaction]`) for lifecycle events and stream errors — keep the prefix convention.
- **Error management:** no Next error boundaries in the tree; errors surface as (a) `QuotaErrorCard` (dismissible, keyed by retryAfter+message), (b) in-stream friendly error assistant messages persisted to Dexie, (c) `ConfirmDialog` for destructive confirmations (delete chat). No toast library.
- **Styling conventions (Milo):** semantic tokens only — colors from the `@theme` block (never hex/Tailwind color names), type scale `text-micro|caption|label|body|subheading|heading|title|display` (never raw `text-xs`...`text-2xl` or arbitrary `text-[11px]`), shadows `shadow-button|card|card-lg` (+ glow variants), radius remap (rounded-lg 12px / xl 20px / 2xl 32px), `font-display`/`font-sans` for headings/body, `text-surface` for white-on-primary. Dark mode = `.dark` class + `html[data-theme="dark"]` attribute + `color-scheme: dark`; Prism token styles are Milo-themed in globals.css.
- **Markdown hierarchy:** `components/ui/createMarkdownComponents.tsx` maps h1→`text-title font-display`, h2→`text-heading font-display`, h3→`text-subheading`, p/li→`text-body`, code→`text-micro font-mono`, table/blockquote→`text-caption`; `prose` classes are forbidden (no typography plugin); fenced code blocks get copy buttons and Prism highlighting.
- **Theme:** `useTheme` uses `useSyncExternalStore` over the DOM class, syncing across tabs via a custom `strata-theme-change` event + `storage` events; the root layout injects an inline script to apply the saved theme before hydration (anti-flash).
- **Performance conventions:** `React.memo` on `ChatPanel` and `ChatInput`; `useMemo` for token metrics; deterministic hash (not `Math.random`) picks the welcome message per chatId; random placeholder prompts avoid consecutive repeats. Motion presets are centralized (never inline variants) in `components/chat/animations.ts` (hero stagger, accordion, popover, pill, attachment-thumb variants) and `components/landing/animations.ts` (fadeUp/card/stagger + marginalia bubble + artifact/specimen hover props + `viewportOnce`); accordions use pure-ease height transitions with strict overflow containment for jitter-free collapse; z-index layering is deliberate — scroll button z-10 < composer z-20 < open message-action trigger z-40 < dropdowns z-50.

## 10. Non-Negotiable Architectural Rules & Anti-Patterns

Future agents MUST adhere to these directives:

1. **All model-serving stream config MUST flow through `createUIStreamResponder` (`lib/ai/agent-runner.ts`).** Never assemble a second `streamText` pipeline in a route; routes are thin auth/quota/validation shells only.
2. **All mutations MUST follow one of three lanes:** (a) Route Handler POST for anything touching models/quota; (b) Dexie helpers in `lib/db/db.ts` for local persistence; (c) Better Auth client for identity. **No new `"use server"` files, no direct `pg`/Dexie access from components.**
3. **Never import `@ai-sdk/google`, `@ai-sdk/fireworks`, `pg`, or `better-auth` (server) into client code.** Provider wiring lives only in `lib/ai/providers.ts`; client auth only via `lib/auth-client.ts`.
4. **Keep `sliceMessagesAfterCompaction` server-side and applied in BOTH `/api/agent` and `/api/agent/compact`.** The client transport must never mutate the outgoing message payload; pruning is the single server-side source of truth.
5. **Never hardcode colors, hex values, Tailwind color names, raw text-size classes, or arbitrary shadows in components.** Semantic Milo tokens only (see §9). New colors/text sizes are added as `@theme` vars in `globals.css`.
6. **Never write manual scroll effects** (`useEffect` + `scrollIntoView`); `StickToBottom` in the chat page owns scrolling.
7. **All dynamic route params and searchParams MUST be awaited** (`use(params)`, `await searchParams`) and validated (zod at the API boundary) before use.
8. **Magic numbers are forbidden in tests and business code** — import constants from `@/lib/limits` (e.g. `QUOTA_5H_LIMIT`, `MAX_FILES_PER_WORKSPACE`, `10000`, `3`, `12000`).
9. **Keep pages presentational:** components must not query Dexie, fetch sessions, or navigate; pages call hooks and pass props. Parent layouts must not be marked `'use client'` — push interactivity to leaf components.
10. **Preserve the agent-runner stream transform order** (`smoothStream` word-pacing then `coalesceToolInputDeltas`) and the `prepareStep` system-prompt re-injection — both are load-bearing for streaming UX and tool correctness.
11. **Maintain per-user isolation invariants:** new Dexie records get stamped with `userId`; legacy unscoped records stay visible; server queries always filter by session `user.id`.
12. **Rate-limit/quota ordering is contractual:** consume quota before body validation; echo `X-RateLimit-*` headers on every response; never bypass `checkAndIncrementRateLimit` on agent routes.
13. **Tests:** keep `--isolate` in test scripts; route tests must `mock.module` auth/rate-limit/agent-runner before a dynamic import; use `mockImplementation` + `mockClear` in `afterEach` (never `mockReset`).
14. **Package manager is bun only.** Never run npm/yarn/npx commands.
15. **Never re-print full workspace file contents into chat messages** — the system prompt enforces metadata-only listings and chat/canvas separation; keep tool outputs on `fileSummarySchema` (content excluded).
16. **`ToolCallCard.tsx` requires zero modifications when adding tools** — register display configs + summary builders in `components/chat/tools/resolver.tsx` instead.
17. **All Markdown rendering MUST go through `MarkdownRenderer` (`components/ui/MarkdownRenderer.tsx`).** Never add new `ReactMarkdown`/`remark-gfm` import sites in components; the renderer owns snippet-copy state internally (`enableSnippetCopy` — currently canvas-only) and delegates streaming to `SmoothStreamText`; the component map (`components/ui/createMarkdownComponents.tsx`) and the streaming leaf (`components/ui/SmoothStreamText.tsx`) live in `components/ui/`.
18. **All server-side database access MUST flow through the two shared `pg` Pool instances** (`lib/auth.ts` for identity, `lib/rate-limit.ts` for quota). No inline SQL, no ad-hoc `new Pool(...)` in routes, components, or tools; `serverExternalPackages: ['pg']` keeps the driver server-side only.
19. **Never introduce `use cache`, `cacheLife`/`cacheTag` profiles, PPR, ISR, or revalidation directives** without revisiting the local-first premise (§3.5) — the browser (Dexie + storage) is the app's cache layer by design.

## 11. Feature Development Recipes (AI Agent Playbooks)

### Recipe A — Creating a new feature page

1. Decide the route: if it renders inside the chat shell it is composed as props within `/chat-id/[id]`; if standalone, create `src/app/<feature>/page.tsx`.
2. For standalone pages, wrap session-dependent logic in a hook (`useSession()`), render a spinner until `isPending` resolves, and redirect unauthenticated users to `/auth?callbackUrl=...` — mirroring `page.tsx`/chat-id page guards. The proxy already gates unauthenticated access, but pages re-check.
3. If the page needs query params on the client, wrap the component in `Suspense` (see `/auth/signin/page.tsx` pattern) so `useSearchParams` can pre-render; server pages `await searchParams` instead; dynamic `params` on client pages use `use(params)`.
4. Keep the page thin: call hooks for all data (Dexie `useLiveQuery` for entity reads), pass data + callbacks down to presentational components in `components/<feature>/`.
5. Style exclusively with Milo tokens (`text-*` scale, `surface-*`, `primary`/`secondary`, `shadow-button/card`); add a `metadata`/`viewport` export only on server pages; do not add `'use client'` to shared layouts.
6. Add the route to the proxy matcher only if it needs the session gate or API protection (or is a public webhook); otherwise it stays open.
7. If the page introduces pure logic (limit math, parsing, ordering), add a `__tests__` suite following `helpers.ts` conventions; import constants from `@/lib/limits`.
8. Verify: `bun run lint` and `bun run build` both pass before finishing.

### Recipe B — Adding a mutation flow (example: a server-backed setting)

1. **Local-only mutations (default):** add a helper to `src/lib/db/db.ts` (e.g. the existing `updateConversationModel` pattern: `db.conversations.update(id, {...})` + bump `updatedAt`); expose it through the owning hook (`useModelSettings`, `useConversations`, `useWorkspaceFiles`) and call it from a component callback. No route, no validation beyond the hook's guard.
2. **Model/quota-backed mutations:** (a) extend `agentRequestBodySchema` in `lib/schemas.ts` with the new field; (b) add validation in the route (or create `src/app/api/<name>/route.ts` with the same auth → `checkAndIncrementRateLimit` → zod shell); (c) for agent behavior changes, add the tool or directive in `lib/ai/tools/` + `lib/ai/prompts.ts` and register it in `createWorkspaceTools` + `resolver.tsx` (never in `ToolCallCard`); (d) client side, add the action to the appropriate hook and reflect optimistic state — the codebase pattern is: update local state immediately, persist via Dexie, never roll back on server errors (errors surface as in-stream messages or the quota card).
3. **Quota semantics:** any new server "message-like" action must consume the same quota windows so caps stay coherent; update `buildQuotaError` copy if copy changes; echo `X-RateLimit-*` headers.
4. **Schema changes (Dexie):** add a new `version(n).stores(...)` block in `db.ts` mirroring the full table shapes (never edit an existing version); keep `userId` indexes for per-user isolation; legacy-scoped records remain readable by the existing `!c.userId || c.userId === userId` filters.
5. **Schema changes (Postgres):** extend `scripts/better-auth-schema.sql` + `scripts/migrate-better-auth-schema.ts`, run `bun run db:migrate` and `bun run db:test`.
6. **Tests:** mirror `api-agent-route.test.ts` for route validation (mock auth/rate-limit/agent-runner before dynamic import); `rate-limit.test.ts` pattern for SQL-shape dispatch; unit tests for any new pure functions.

### Recipe C — Integrating an external API / webhook

1. **Server-only secrets:** read the key from `process.env` inside the integration module; add it to `.env.example`; never expose it via `NEXT_PUBLIC_*` or client code.
2. **Outbound calls (agent tools):** follow `tavily-tools.ts`: a shared `callXApi` helper with `AbortSignal.timeout` combined with the request signal, non-OK body-text capture, a status→friendly-message map, and a `{ success, data?, error? }` return shape so the agent can react to failures instead of crashing. Register the tool in `createWorkspaceTools` (barrel `lib/ai/tools.ts`), add a directive to `buildSystemInstruction` in `lib/ai/prompts.ts`, and a display config + summary builder in `resolver.tsx`.
3. **Inbound webhooks:** create `src/app/api/<provider>/route.ts` with a handler that (a) verifies signatures — raw-body HMAC against the provider's secret BEFORE parsing (never verify on a re-stringified body), (b) responds 2xx fast (queue or defer heavy work), (c) never trusts caller-supplied identity — resolve the user server-side, (d) logs with the `[<name>]` prefix convention. Add the path to the proxy matcher if it must be public — it must, for provider callbacks, because the proxy 401s non-allowlisted `/api/*`.
4. **Failure mitigation:** retry with capped backoff for transient network errors; degrade gracefully for missing keys (friendly error, not throw); document the provider's error shapes in the module header comment.
5. **Verification:** add a route test with a forged signature (expect 401/400) and a valid signature fixture (expect 200), following the `mock.module` + dynamic import pattern; if the webhook touches quota, unit-test the SQL shape against `rate-limit.test.ts` conventions.

---

*Maintain this file when architecture changes: new routes, new tools, schema bumps (Dexie version increments and Postgres migrations), provider additions, and quota policy changes all require updates here.*