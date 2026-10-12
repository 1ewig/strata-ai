# Strata AI — System Architecture & Agent Guide

## 1. Domain & Architecture Overview
Strata AI is a local-first conversational workspace studio. Users prompt an AI agent that executes 8 Zod-validated tools across multi-step autonomous loops (up to 30 steps/turn) to create, edit, rename, and preview multi-file workspaces (24+ languages) in a canvas drawer.

- **Storage Model:** Local-first browser IndexedDB (Dexie v5) stores all conversations, messages, and workspace files. Zero user document storage on the server.
- **Server Role:** Stateless proxy/gateway, Better Auth session validation, atomic PostgreSQL message quota sliding windows, and unified AI SDK 7 streaming.
- **Compaction:** `/compact` slash command summarizes chat history and workspace state into an anchor message, pruning pre-compaction history server-side on subsequent turns.

## 2. Tech Stack & Environment
- **Framework & Runtime:** Next.js 16.4.0 (App Router, Node.js runtime, standalone), React 19.2.7, TypeScript 7.0.2. Strict Bun package manager (Bun 1.4+, never npm/yarn/npx).
- **AI Engine:** Vercel AI SDK 7 (`ai`), `@ai-sdk/google` (Gemini 3.5/3.1 Flash Lite, Gemini 3 Flash, Gemma 4), `@ai-sdk/fireworks` (DeepSeek V4 Flash).
- **Web Research:** Tavily REST API (`webSearch`, `extractUrl`).
- **Databases:** Client Dexie 4.4 (`StrataAIChatDB` v5); Server Supabase PostgreSQL (`better_auth` schema via `pg` Pool).
- **Auth & Rate Limiting:** Better Auth 1.6 (`emailAndPassword`, `nextCookies`, 5-min cookie cache); PostgreSQL atomic sliding-window quota ledger.
- **UI & Design System:** Tailwind CSS 4.1 + Milo Design System (strict semantic tokens in `globals.css`), PrismJS 1.30, `motion` 12, `use-stick-to-bottom` 1.1.6, `unpdf` 1.8.1.
- **Observability:** Langfuse 5.10 via OpenTelemetry NodeSDK in `src/instrumentation.ts`.

### Environment Variables
`GOOGLE_GENERATIVE_AI_API_KEY`, `FIREWORKS_API_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GEMINI_MODEL`, `TAVILY_API_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL`.

## 3. Security, Authentication & Quota Math
- **3-Layer Security:**
  1. *Proxy Gate (`src/proxy.ts`):* Fast session cookie pre-check via `getSessionCookie`. Injects security headers (`nosniff`, `DENY`, `strict-origin`).
  2. *Route Guard (`withAgentRouteGuards`):* Cryptographic session check against PostgreSQL via `auth.api.getSession`.
  3. *Client-side RLS:* Verifies `conversation.userId === session.user.id` on `/chat-id/[id]`.
- **Sliding-Window Quota (`better_auth.message_log`):**
  - Limits: 10 msgs / 5 hours (`QUOTA_5H_LIMIT`), 50 msgs / 7 days (`QUOTA_WEEK_LIMIT`).
  - Request purges logs > 7 days, checks both windows, and atomically inserts a row.
  - Upstream LLM failure automatically triggers `safeAsyncRefundRateLimit(messageLogId)` to delete the log row.
  - Quota response headers on every stream: `X-RateLimit-Remaining-5h`, `X-RateLimit-Remaining-Week`, `Retry-After`.

## 4. Key Directory Map
```
src/
├── app/                  # App Router: layout, page (landing), chat-id/[id], api/
├── components/
│   ├── chat/             # ChatPanel, composer/, message/, tools/ (resolver)
│   ├── workspace/        # WorkspaceDrawer, WorkspaceEditor, CodeViewer
│   ├── sidebar/          # ConversationList, RateLimitRing, Sidebar
│   └── ui/               # MarkdownRenderer, SmoothStreamText, ConfirmDialog
├── contexts/             # RateLimitContext (sliding-window state)
├── hooks/                # useChatSession, useConversations, useWorkspaceFiles
└── lib/
    ├── ai/               # agent-runner, route-guards, providers, prompts, tools/
    ├── db/               # Dexie StrataAIChatDB v5
    ├── auth.ts           # Server Better Auth (pg Pool)
    ├── auth-client.ts    # Client Better Auth
    ├── limits.ts         # Limit constants
    ├── models.ts         # Model catalog & pricing
    └── edit-engine.ts    # StringEditEngine 3-strategy matcher
```

## 5. Client & Server Data Schemas
### Client: Dexie (Schema v5)
- `conversations` (PK: `id` UUID): `userId`, `title` (max 40 chars), `model`, `thinkingLevel`, `files` (array of `WorkspaceFile`, max 3 files, max 50k chars total), `activeFileId`, `createdAt`, `updatedAt`.
- `messages` (PK: `id`): `chatId` (indexed), `userId`, `timestamp` (ISO, strictly monotonic), `role` (`user`|`assistant`|`system`), `content`, `parts` (UI parts), `metadata` (`ChatMetadata`: `usage`, `stepTotalUsage`, `modelId`, `isCompactedSummary`).
- `WorkspaceFile`: `id`, `name` (case-insensitive unique), `content` (max 10k chars), `language`, `createdAt`, `updatedAt`.

### Server: PostgreSQL (`better_auth` Schema)
- `user`, `session`, `account`, `verification` (standard Better Auth tables).
- `message_log`: `id` (UUID PK), `user_id` (FK `user.id`), `created_at` (TIMESTAMPTZ, indexed `(user_id, created_at)`).

## 6. System Limits & Constraints (`src/lib/limits.ts`)
| Resource | Limit Constant | Boundary | Failure Behavior |
|---|---|---|---|
| User Prompt | `MAX_MESSAGE_CHARS = 2000` | Client input & Route guard | Send button disabled; 400 Bad Request |
| Attachments | `MAX_ATTACHMENTS_PER_MESSAGE = 4` | File picker & Route guard | Picker blocked; 400 Bad Request |
| Image Upload | `MAX_IMAGE_INPUT_BYTES = 5 MB` | Client canvas compressor | Downscaled to max 1280px / 1.5MB |
| Document Upload | `MAX_DOCUMENT_INPUT_BYTES = 5 MB` | Client ingestion & Sanitizer | Extracted text capped at 25,000 chars |
| Files per Workspace | `MAX_FILES_PER_WORKSPACE = 3` | Tool validator & UI | `writeFile` rejected; UI button disabled |
| File Length | `MAX_FILE_CHARS = 10,000` | Tool validator & Editor | `editFile` rejected; editor input blocked |
| Workspace Total | `MAX_WORKSPACE_TOTAL_CHARS = 50,000` | `editFile` tool validator | Edits exceeding combined cap rejected |
| User Conversations | `MAX_CONVERSATIONS_PER_USER = 5` | Sidebar action | Action blocked with limit notification |
| Message Quotas | 10 per 5h / 50 per 7d | Atomic Postgres transaction | 429 with `Retry-After`; `QuotaErrorCard` |
| Agent Max Steps | Clamped 1 to 30 (default 25) | `agent-runner.ts` | Stops on `step-limit`; max 2 auto-continuations |

## 7. Routes & Component Boundaries
- **Server Components (RSC):** `src/app/layout.tsx` (shell, fonts, anti-flash script, RateLimitProvider), `src/app/page.tsx` (landing shell), `src/app/auth/page.tsx` (sanitized redirect to signin), `src/app/not-found.tsx`, `robots.ts`, `sitemap.ts`.
- **Client Components ('use client'):** `src/app/chat-id/[id]/page.tsx`, `components/chat/*`, `components/workspace/*`, `components/sidebar/*`, `components/auth/*`, `components/landing/*`, `components/ui/*`. Dynamic route params unwrapped via React 19 `use(params)`.
- **Route Handlers:**
  - `POST /api/agent`: Protected streaming endpoint running `createUIStreamResponder` with tool loop.
  - `POST /api/agent/compact`: Protected streaming endpoint running compaction summary via Gemini 3.1 Flash Lite.
  - `GET /api/user/rate-limit`: Protected read-only quota usage snapshot.
  - `ALL /api/auth/[...all]`: Better Auth handler (`toNextJsHandler`).

## 8. Streaming Protocol & Tool Execution
- **Protocol:** AI SDK 7 UI message SSE stream (`text/plain`).
- **Stream Part Types:** `text` (paged by `smoothStream`), `reasoning` (`ThoughtAccordion`), `tool-call`/`tool-input-delta` (buffered by `coalesceToolInputDeltas`), `data-workspace` (instant canvas updates), `error`, `finish`.
- **Tools (Registered in `resolver.tsx`):**
  - `listFiles()`: Returns workspace file summaries.
  - `readFile(nameOrId, section?)`: Reads full content or markdown heading section.
  - `writeFile(name, content, language?)`: Creates or replaces file; emits `file-updated`.
  - `editFile(nameOrId, explanation, searchString, replaceString)`: 3-strategy replacement (Exact -> Whitespace-normalized -> Anchor-matched); emits `file-updated`.
  - `renameFile(nameOrId, newName)`: Validates name collisions; emits `file-updated`.
  - `deleteFile(nameOrId)`: Removes file; emits `file-deleted`.
  - `webSearch(query, ...)`: Tavily search with timeout & error mapping.
  - `extractUrl(urls, ...)`: Tavily content extractor (max 3 URLs, 18k char cap).

## 9. Non-Negotiable Rules & Invariants
1. **Zero Server Actions:** No `"use server"`. State mutations strictly use Route Handlers (streaming/quota), Dexie (local entities), or Better Auth client methods.
2. **Unified Stream Responder:** All model execution must use `createUIStreamResponder` (`lib/ai/agent-runner.ts`) with `smoothStream` and `coalesceToolInputDeltas`.
3. **Milo Design Tokens Only:** No hardcoded hex or default Tailwind colors (`emerald`, `rose`, `zinc`, etc.). Use semantic tokens (`primary`, `surface-base`, `text-primary`, `edge-subtle`).
4. **Milo Type Scale Only:** No raw sizes (`text-xs`/`text-sm`/`text-base`). Use: `text-micro` (11px), `text-caption` (12px), `text-label` (14px), `text-body` (16px), `text-subheading` (18px), `text-heading` (20px), `text-title` (24px), `text-display` (32px).
5. **Centralized Markdown:** All markdown MUST render via `MarkdownRenderer.tsx` (`components/ui/MarkdownRenderer.tsx`).
6. **Tool Card Decoupling:** Never edit `ToolCallCard.tsx` when adding tools. Register display configurations and summaries in `components/chat/tools/resolver.tsx`.
7. **Presentational Purity:** UI components are purely presentational. Queries, auth calls, and router logic live in page hooks and pass down as props.
8. **Auto-Scroll Exclusivity:** All chat auto-scrolling is owned by `<StickToBottom>` in `src/app/chat-id/[id]/page.tsx`. No manual scroll loops.
9. **Runtime & Commands:** Always use `bun`. Run `bun run lint` (`oxlint`), `bun run typecheck` (`bun check`), and `bun run build` (`next build`).
