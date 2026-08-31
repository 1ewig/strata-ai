# Strata AI — System Context & Architecture Guide

## 1. Executive Summary & Domain Purpose

- **What it is:** Strata AI is a chat-first agentic workspace studio and living document editor. Users create, read, edit, rename, and delete multi-file workspaces spanning 24+ programming and markup languages entirely through a conversational interface with local-first persistence and real-time streaming.
- **Core mechanic:** The conversational agent executes 8 Zod-validated tools (6 workspace tools plus webSearch and extractUrl) across multi-step autonomous loops (up to 30 steps per turn, with up to 2 silent auto-continuations). Chat acts as the command-and-control surface while durable content lives in workspace files on a dedicated canvas drawer. Tool invocations emit lightweight metadata summaries while full file bodies stream live to the client via custom SSE data-workspace events.
- **Target audience:** Technical professionals, researchers, document authors, and power users who require a local-first AI workspace with zero cloud-sync complexity, precise non-destructive file editing, and transparent token accounting.
- **Primary business problems solved:**
  - Durable structured artifacts instead of ephemeral, disposable chat replies.
  - Precise, non-destructive AI edits using a 3-strategy fallback string edit engine.
  - Zero-latency local persistence without server database configuration via IndexedDB (Dexie).
  - Multi-file preview with syntax highlighting and progressive streaming markdown rendering.
  - Context-window exhaustion mitigation via a /compact slash command that synthesizes conversation history and workspace state into a summary anchor, pruning pre-compaction history server-side.
- **Monetization posture & value driver:** Quota-gated messaging based on atomic sliding windows (10 messages per 5 hours, 50 messages per week) enforced in PostgreSQL and mirrored in real-time to the client UI. The server-side message log provides the infrastructure for subscription billing, while token-usage calculators compute exact per-model dollar costs.
- **Non-functional constraints:**
  - **Security:** Better Auth email/password sessions, pre-render cookie validation in the Next.js 16 proxy, independent session verification in all Route Handlers, hardened security headers, server-only LLM API keys, and zero secret leakage to client bundles.
  - **Abuse control:** Database-backed sliding-window rate limits checked atomically before model execution, quota remaining headers on every streaming response, step caps bounding per-turn execution, and automatic quota refunds on upstream inference failures.
  - **Latency and UX:** Word-paced token smoothing (25ms intervals), progressive markdown rendering, collapsible reasoning accordions, memoized UI components, observer-driven scroll anchoring, and metadata-only system prompts minimizing input token overhead.
  - **Privacy and multi-tenancy:** Zero user document storage on the server; all conversation histories and workspace files remain strictly client-side in browser IndexedDB. Server-side data is restricted to authentication credentials and timestamped quota logs.

## 2. Technical Stack & Infrastructure

| Layer | Technology / Library | Purpose in this Project | Key Configuration & Notes |
|---|---|---|---|
| Framework | Next.js 16.2.10 (App Router, src/ layout) | Fullstack React framework, SSR shell, streaming Route Handlers | Standalone output, React strict mode enabled, motion transpiled, TypeScript build errors enforced. Routing gateway managed via src/proxy.ts (Next 16 proxy). |
| Runtime & Boundaries | Node.js Runtime (No Edge functions) | Server-side execution environment for all routes and proxy | All Route Handlers, server components, and proxy run exclusively on Node.js. No Edge runtime exports exist. |
| React & Language | React 19.2.7 & TypeScript 6.0.3 | Core UI runtime and strict static type checking | React 19 compiler-ready paradigms, @/* mapped to ./src/*, bundler module resolution, strict type checking. |
| Runtime & Package Manager | Bun (Strictly enforced) | Development server, builds, linter, tests, and DB scripts | Package manager is bun only (never npm/yarn/npx). Test runs require the --isolate flag for module mock isolation. |
| AI SDK Core | ai @ 7.0.0 | Unified LLM streaming, tool execution, and UI protocol | Manages streamText, tool definitions, smoothStream, step counting, UI message stream creation, and model message conversions. |
| Google Provider | @ai-sdk/google @ 4.0.0 | Primary LLM provider for Gemini and Gemma models | Serves Gemini 3.5 Flash Lite, Gemini 3.1 Flash Lite, Gemini 3 Flash Preview, Gemma 4 31B IT, and Gemma 4 26B A4B IT. Configured with thinkingConfig. |
| Fireworks Provider | @ai-sdk/fireworks @ 3.0.22 | Secondary LLM provider for DeepSeek models | Serves DeepSeek V4 Flash 0731. Maps thinking levels to reasoning_effort with interleaved reasoning history. |
| Web Research | Tavily REST API (Native fetch) | Real-time web search and content extraction | Provides webSearch and extractUrl tools with abort signal composition, 18k character result truncation, and structured error mapping. |
| Client Database | Dexie 4.4 & dexie-react-hooks | Local-first browser IndexedDB storage | Database StrataAIChatDB on Schema v5 with userId indexes for per-user isolation, live queries, and monotonic message ordering. |
| Server Database | Supabase PostgreSQL via pg Pool | Better Auth identity storage and message quota logging | Pooled connection via DATABASE_URL on port 6543, forcing search_path to better_auth,public with 7-day retention cleanup. |
| Authentication | Better Auth 1.6.25 & nextCookies | Session management, password hashing, and cookie caching | Server instance in lib/auth.ts with 5-minute cookie cache; client instance in lib/auth-client.ts. Catch-all route at /api/auth/[...all]. |
| Styling & Theme | Tailwind CSS 4.1 & PostCSS | Milo Design System utility tokens and dark theme | Warm studio linen light theme and espresso dark theme configured via globals.css @theme block. Semantic tokens for color, typography, and elevation. |
| State Management | React Context & Dexie Live Queries | Global quota state and local entity synchronization | RateLimitContext for server-hydrated quota tracking; useChatSession orchestrator for streaming and workspace file state. |
| Schema Validation | Zod 4.4.3 | Boundary validation for API requests and tool inputs | Validates agent request bodies, workspace file schemas, and inline tool arguments. |
| Markdown & Syntax | react-markdown 10 & PrismJS 1.30 | Markdown parsing and syntax-highlighted code display | Centralized rendering via MarkdownRenderer with custom Milo typography mappings; PrismJS supporting 24+ programming languages. |
| Document Ingestion | unpdf 1.8.1 | Universal text extraction from PDF attachments | Extracts text from PDF files in both browser and Node.js runtimes without worker configuration. |
| Animations | motion 12 & framer-motion 13 | Smooth drawer transitions, micro-interactions, and hero | Standardized motion presets in animations.ts modules; all runtime imports use motion/react. |
| Scrolling Engine | use-stick-to-bottom 1.1.6 | Chat message list anchoring and scroll affordance | Provides StickToBottom container managing auto-scroll and floating scroll-to-bottom pill visibility. |
| Observability | Langfuse 5.10 (@langfuse/otel, @langfuse/tracing) | OpenTelemetry LLM tracing and cost tracking | NodeSDK and LangfuseSpanProcessor registered in src/instrumentation.ts with immediate export mode and trace attribute propagation. |

### Environment Variables Matrix

- **GOOGLE_GENERATIVE_AI_API_KEY:** Required server secret for Gemini and Gemma inference.
- **FIREWORKS_API_KEY:** Required server secret for Fireworks DeepSeek model access.
- **DATABASE_URL:** Required server connection string for Supabase PostgreSQL pooler.
- **BETTER_AUTH_SECRET:** Required server secret (minimum 32 characters) for session signing and encryption.
- **BETTER_AUTH_URL:** Optional server URL for Better Auth authentication base.
- **NEXT_PUBLIC_APP_URL:** Required public URL for Better Auth client initialization.
- **NEXT_PUBLIC_GEMINI_MODEL:** Optional public default model override (defaults to gemini-3.5-flash-lite).
- **TAVILY_API_KEY:** Optional server secret for Tavily search and content extraction tools.
- **LANGFUSE_SECRET_KEY / LANGFUSE_PUBLIC_KEY / LANGFUSE_BASE_URL:** Optional server configuration for Langfuse telemetry.

### Test Suite Inventory (18 Suites in __tests__/, executed via bun test --isolate)

- **api-agent-route.test.ts:** Validates authentication, rate limiting, Zod schema validation, message size limits, and step clamping for POST /api/agent.
- **api-agent-compact-route.test.ts:** Validates authentication, rate limiting, and execution pipeline for POST /api/agent/compact.
- **rate-limit.test.ts:** Validates PostgreSQL transaction logic, 5-hour and 7-day quota counts, retry-after calculations, and refund mechanics.
- **error-classifier.test.ts:** Tests classification of Google, Fireworks, network, and authentication errors into typed ClassifiedError shapes.
- **workspace-tools.test.ts:** Tests file limits, character caps, truncation rules, case-insensitive collision handling, and section extraction.
- **edit-engine.test.ts:** Tests exact, whitespace-normalized, and anchor-matched string replacement strategies in StringEditEngine.
- **message-extractor.test.ts:** Tests extraction of file updates and deletions from tool invocations and compaction history slicing.
- **message-segments.test.ts:** Tests grouping of streaming parts, reasoning blocks, tool cards, and completed work-group segments.
- **token-usage.test.ts:** Tests active context occupancy, session token aggregation, cost computation, and post-compaction resets.
- **tavily-tools.test.ts:** Tests query formatting, timeout handling, error mapping, and character truncation for web search and extraction.
- **image-utils.test.ts:** Tests client-side image validation, canvas downscaling, quality compression loops, and server-side byte limits.
- **document-utils.test.ts:** Tests document MIME type validation, file size bounds, attachment counts, and server violation extractors.
- **image-drop.test.ts:** Tests drag-and-drop file ingestion, MIME type filtering, and composer attachment state integration.
- **workspace.test.ts:** Tests immutable and mutable workspace operations, case-insensitive lookups, and upsert logic.
- **languages.test.ts:** Tests file extension mapping and programming language detection across 24+ formats.
- **limits.test.ts:** Tests quota error builders, character counter formatting, and limit constant integrity.
- **models.test.ts:** Tests model catalog definitions, vision support flags, thinking configurations, and pricing lookups.
- **schemas.test.ts:** Tests Zod schema validation for agent request payloads and workspace file structures.

## 3. High-Level Architectural Mental Model & Data Flow

### 3.1 End-to-End Turn Lifecycle

```
[User Input in ChatInput]
  │  (Text, Images <= 4, Documents <= 4)
  ▼
[useChatSession / handleSendMessage]
  │  1. Reset auto-continuation counter to 0
  │  2. Verify local rateLimitData (5h & 7d caps) and context occupancy (< 100%)
  │  3. Auto-title conversation on first message (40 chars max)
  │  4. Dispatch UI message with file parts (data URLs) and text parts
  ▼
[useChat Transport -> POST /api/agent]
  │  (Transport reads model, thinkingLevel, and files from refs without re-instantiation)
  ▼
[src/proxy.ts Gateway]
  │  1. Validate session cookie presence via getSessionCookie
  │  2. Return JSON 401 for /api/* or 302 redirect for pages if unauthenticated
  │  3. Inject security headers (nosniff, DENY frame options, strict-origin referrer)
  ▼
[POST /api/agent -> withAgentRouteGuards]
  │  1. Verify cryptographic session with PostgreSQL via auth.api.getSession
  │  2. Parse and validate JSON body via agentRequestBodySchema
  │  3. Prune history before latest compaction summary (sliceMessagesAfterCompaction)
  │  4. Enforce bounds: message length <= 2000 chars, attachments <= 4, image size <= 2M chars
  │  5. Atomically reserve quota via checkAndIncrementRateLimit (returns 429 if full)
  │  6. Clamp maxSteps between 1 and 30 (default 25)
  ▼
[runAgentResponse -> createUIStreamResponder]
  │  1. Resolve model config and sanitize cross-provider metadata (sanitizeMessagesForProvider)
  │  2. For DeepSeek: decode text files, extract PDF text via unpdf, strip binary images
  │  3. Convert to model messages and build metadata-only system prompt with token budget
  │  4. Execute streamText with smoothStream (25ms words) and coalesceToolInputDeltas
  │  5. prepareStep re-injects fresh workspace metadata and token headroom each step
  │  6. Tools execute against createMutableWorkspace closure, emitting data-workspace SSE parts
  │  7. On error: classify error, write error chunk, and trigger safeAsyncRefundRateLimit
  ▼
[SSE Response Stream with Quota Headers]
  │  (X-RateLimit-Remaining-5h, X-RateLimit-Remaining-Week)
  ▼
[Client useChat Stream Processing]
  │  1. onData receives data-workspace events -> updates workspace state immediately
  │  2. UI renders live text, ThoughtAccordion, and ToolCallCard components
  │  3. onFinish -> reconcileFinishedStep persists messages to Dexie with monotonic timestamps
  │  4. If finishReason is step-limit: trigger auto-continuation (up to 2 passes)
```

### 3.2 Compaction Lifecycle

```
[User triggers /compact or Clicks Compact Button]
  │
  ▼
[useCompaction / triggerCompaction]
  │  Bypasses standard useChat transport; issues direct POST to /api/agent/compact
  ▼
[withAgentRouteGuards Pipeline]
  │  Authenticates session -> Validates body -> Deducts 1 quota message -> Executes runner
  ▼
[runCompactionResponse]
  │  Executes createUIStreamResponder with COMPACTION_MODEL_ID (gemini-3.1-flash-lite),
  │  thinking level high, maxOutputTokens 3500, buildCompactionInstruction system prompt,
  │  and finish metadata { isCompactedSummary: true }
  ▼
[Client-Side Stream Reader]
  │  useCompaction reads SSE stream via parseJsonEventStream and readUIMessageStream,
  │  updating a stable message id (compact-<timestamp>) in React state
  ▼
[Persistence & History Truncation]
  │  reconcileFinishedStep saves the summary to Dexie. Subsequent agent calls apply
  │  sliceMessagesAfterCompaction on the server, pruning all dialogue prior to the summary.
  │  Token metrics calculator resets active context occupancy to baseline plus summary size.
```

### 3.3 Streaming Protocol Contract

- **Wire Format:** AI SDK 7 UI-message Server-Sent Events protocol (text/plain event stream), consumed by useChat on standard agent turns and by useCompaction on compaction turns.
- **data-workspace Events:** Custom SSE parts carrying live workspace state updates. Format: `{ event: 'file-updated', file }` or `{ event: 'file-deleted', fileId, name }`. These provide instant canvas updates during tool execution without waiting for turn completion.
- **Tool Summary Metadata:** Tool output parts carry lightweight file summaries (id, name, language, charCount, timestamps) conforming to fileSummarySchema. Full file contents are excluded from message parts to avoid payload bloat.
- **Finish Metadata:** The stream finish event stamps ChatMetadata containing usage (last-step active context snapshot), stepTotalUsage (cumulative multi-step token sum), and modelId. Compaction turns also attach isCompactedSummary: true.
- **Quota Headers:** Every response carries X-RateLimit-Remaining-5h and X-RateLimit-Remaining-Week headers (plus Retry-After on 429), parsed by client transports to synchronize RateLimitContext.

| Stream Part Type | Producer | Client UI Component / Handler |
|---|---|---|
| text | smoothStream word deltas | MarkdownRenderer / SmoothStreamText |
| reasoning | Gemini thoughts / DeepSeek reasoning_content | ThoughtAccordion (collapsible) |
| tool-input-delta | Buffered JSON arg chunks | ToolCallCard loading state |
| tool-call / tool-input-end | Tool invocation event | ToolCallCard via resolveToolDisplay |
| data-workspace | Workspace tools writer | useChat onData -> canvas state update |
| error | classifyProviderError | In-stream error banner / QuotaErrorCard |
| finish | Stream termination | Message metadata stamping & reconciliation |

### 3.4 Server vs. Client Component Boundaries

- **Server Components (RSC):**
  - `src/app/layout.tsx`: Root HTML shell, Plus Jakarta Sans font loading, anti-flash theme script injection, SEO metadata, JSON-LD structured data, and server-side session/quota resolution for RateLimitProvider hydration.
  - `src/app/page.tsx`: Public marketing landing page shell, resolving session state server-side to pass to LandingClient.
  - `src/app/auth/page.tsx`: Public authentication entry point performing server-side redirects to /auth/signin while sanitizing callbackUrl.
  - `src/app/not-found.tsx`: Global 404 error page styled with Milo tokens.
  - `src/app/robots.ts` & `src/app/sitemap.ts`: Build-time MetadataRoute generators for search engine indexing.
- **Client Components ('use client'):**
  - Permitted and required across the entire interactive application: `src/app/chat-id/[id]/page.tsx`, all components under `components/chat/`, `components/workspace/`, `components/sidebar/`, `components/auth/`, `components/landing/`, and `components/ui/`.
  - Rationale: The core product is a real-time, streaming, multi-file workspace studio driven by IndexedDB live queries, WebSocket/SSE stream processing, and browser canvas state.
- **Async Request APIs:** Dynamic route parameters are typed as Promise<{ id: string }> and resolved using the React 19 `use(params)` hook in client pages. Server components resolve searchParams and headers via `await searchParams` and `await headers()`.

### 3.5 Next.js Caching & Rendering Strategy

- **Dynamic Per-Request Execution:** All application pages and API routes execute dynamically on every request. Server-side caching directives (use cache, cacheLife, cacheTag, PPR, ISR, revalidatePath, generateStaticParams) are deliberately absent.
- **Client-Side Entity Caching:** IndexedDB (Dexie) serves as the primary entity store and read model for all user data (conversations, messages, workspace files), ensuring complete offline availability and immediate client-side rendering.
- **Storage-Level Caching:** User preferences (theme, selected model, thinking level) are cached in localStorage; sidebar open/close state is cached in sessionStorage.
- **Server Session Cookie Cache:** Better Auth maintains a 5-minute cookie cache (cookieCache) to validate sessions without issuing database queries on every proxy or API request.

### 3.6 Authentication, Authorization & Session Lifecycle

- **Layer 1 (Proxy Pre-Render Gate):** `src/proxy.ts` performs a fast cookie-presence check using `getSessionCookie(request)`. Missing cookies result in a JSON 401 for API endpoints or a redirect to `/auth?callbackUrl=<path>` for protected pages (excluding `/chat-id/*` to prevent cross-account conversation leaks).
- **Layer 2 (Route Handler Cryptographic Verification):** Every API endpoint independently validates the session using `auth.api.getSession({ headers: req.headers })` against the PostgreSQL database.
- **Layer 3 (Client-Side RLS Isolation):** On `/chat-id/[id]`, the page cross-references `currentConv.userId` with `session.user.id`. If a user attempts to load a conversation belonging to another user, message hydration is blocked and the client redirects to the home route.
- **Session Lifecycle:** Better Auth manages cookie-backed sessions stored in PostgreSQL (`better_auth.session` table) with cascade deletion on user removal. Sign-out via `useSignOut` clears client state and performs a clean redirect to `/auth/signin`.

## 4. Directory Structure Map

```
Strata Ai/
├── AGENTS.md                      # AI agent operating guidelines, Bun commands, and Milo styling rules
├── next.config.ts                 # Next.js 16 configuration: standalone output, transpilePackages, image domains
├── tsconfig.json                  # TypeScript 6 strict configuration with @/* path aliases mapping to ./src/*
├── eslint.config.mjs              # ESLint 9 flat configuration with next core web vitals
├── package.json                   # Project dependencies (Next 16, React 19, AI SDK 7, Better Auth 1.6, Dexie 4.4)
├── bun.lock                       # Bun lockfile establishing deterministic dependency resolution
├── .env.example                   # Authoritative list of required and optional environment variables
├── metadata.json                  # Extension and application manifest mirroring lib/models.ts pricing
├── scripts/
│   ├── better-auth-schema.sql     # PostgreSQL DDL for better_auth schema and message_log quota table
│   ├── migrate-better-auth-schema.ts # Migration runner executing SQL schema migrations (bun run db:migrate)
│   ├── test-db.ts                 # Database connectivity and schema healthcheck script (bun run db:test)
│   ├── test-langfuse.ts           # Langfuse OpenTelemetry connectivity test script
│   └── test-tavily-tools.ts       # Standalone verification script for Tavily search and extract tools
├── __tests__/                     # 18 isolated test suites covering routes, tools, engines, and limits
│   ├── helpers.ts                 # Shared test fixtures (makeFile, runTool, setupWorkspaceTools, jsonResponse)
│   └── types.d.ts                 # Ambient TypeScript definitions for test runners
├── docs/                          # Architectural documentation, AI SDK guides, and resume bullet banks
└── src/
    ├── instrumentation.ts         # Server startup hook initializing OpenTelemetry NodeSDK and Langfuse
    ├── proxy.ts                   # Next.js 16 proxy routing gateway, session cookie gate, and security headers
    ├── app/
    │   ├── globals.css            # Milo Design System tokens, @theme variables, Prism styles, and animations
    │   ├── layout.tsx             # Root RSC: font setup, theme script, SEO metadata, and RateLimitProvider
    │   ├── page.tsx               # Root RSC: resolves server session and renders LandingClient
    │   ├── not-found.tsx          # Global 404 page styled with Milo tokens
    │   ├── robots.ts              # SEO crawl rules disallowing internal agent API paths
    │   ├── sitemap.ts             # SEO sitemap listing public marketing and authentication routes
    │   ├── auth/                  # Authentication route group (/auth redirect, /auth/signin, /auth/signup)
    │   ├── chat-id/[id]/page.tsx  # Core application page: Sidebar, ChatHeader, ChatPanel, ChatInput, WorkspaceDrawer
    │   └── api/
    │       ├── auth/[...all]/     # Better Auth catch-all API handler (toNextJsHandler)
    │       ├── agent/route.ts     # POST endpoint streaming agent responses with tool execution
    │       ├── agent/compact/     # POST endpoint streaming context compaction summaries
    │       └── user/rate-limit/   # GET endpoint providing read-only user quota snapshots
    ├── components/
    │   ├── Sidebar.tsx            # Main chat navigation sidebar containing conversation list and quota ring
    │   ├── theme-toggle.tsx       # Dark/light theme switcher component
    │   ├── chat/                  # ChatPanel, ChatHeader, ChatInput composer, and animations
    │   │   ├── composer/          # AttachmentPreviews, ComposerToolbar, ModelSelectorMenu, SlashCommandMenu
    │   │   ├── message/           # ChatBubble, ToolCallCard, ThoughtAccordion, WorkGroupCard, CompactionDivider
    │   │   └── tools/             # Tool display resolver (resolver.tsx) and summary builders (summaries.tsx)
    │   ├── workspace/             # WorkspaceDrawer, WorkspaceEditor, CodeViewer, and file tab management
    │   ├── sidebar/               # ConversationItem, ConversationList, RateLimitRing, and sidebar controls
    │   ├── landing/               # Marketing landing components (LandingHero, LandingNumbers, LandingProcess, etc.)
    │   ├── auth/                  # Authentication forms (SignInForm, SignUpForm, AuthShell, LoadingScreen)
    │   └── ui/                    # MarkdownRenderer, SmoothStreamText, ConfirmDialog, and brand icons
    ├── contexts/
    │   └── RateLimitContext.tsx   # Global React context tracking sliding-window quota and retry states
    ├── hooks/                     # Custom React hooks (useChatSession, useConversations, useWorkspaceFiles, etc.)
    └── lib/
        ├── auth.ts                # Server Better Auth instance configured with PostgreSQL connection pool
        ├── auth-client.ts         # Client Better Auth instance and useSession hook export
        ├── rate-limit.ts          # Atomic sliding-window quota checks, increments, and refund functions
        ├── models.ts              # Model catalog, context window definitions, pricing, and thinking levels
        ├── limits.ts              # System-wide limit constants, character bounds, and quota error builders
        ├── schemas.ts             # Zod validation schemas for API request payloads and workspace files
        ├── token-usage.ts         # Token metric calculations, context occupancy, and cost estimation
        ├── edit-engine.ts         # StringEditEngine implementing 3-strategy fallback string replacement
        ├── languages.ts           # 24+ language metadata definitions and file extension mapping
        ├── syntax-highlighter.ts  # Singleton PrismJS configuration and grammar registrations
        ├── image-utils.ts         # Client-side image validation, compression pipeline, and server part checks
        ├── document-utils.ts      # Document MIME validation, size bounds, and unpdf text extraction
        ├── clipboard.ts           # Text copying utilities with markdown stripping
        ├── id.ts                  # Cryptographic UUID generator with fallback
        ├── db/db.ts               # Dexie database instance, Schema v5, and CRUD persistence helpers
        └── ai/
            ├── agent-runner.ts    # Unified streamText pipeline (createUIStreamResponder) for agent and compaction
            ├── route-guards.ts    # Higher-order route wrapper (withAgentRouteGuards) and async refund logic
            ├── error-classifier.ts # Normalization of provider and network errors into ClassifiedError shapes
            ├── sanitization.ts    # Cross-provider metadata pruning, text decoding, and image stripping
            ├── stream-transforms.ts # coalesceToolInputDeltas transform preventing UI JSON parsing freezes
            ├── providers.ts       # Model provider resolution for Google Gemini and Fireworks DeepSeek
            ├── prompts.ts         # System prompt generators with token budget and compaction instructions
            ├── workspace.ts       # Pure workspace file algebra and per-request mutable workspace closures
            ├── chat-reconciler.ts # Turn persistence, file delta extraction, and auto-continuation loops
            ├── chat-error-handler.ts # User-friendly chat error formatting and in-stream error persistence
            ├── message-extractor.ts # Tool delta discovery and server-side history compaction slicing
            ├── message-segments.ts # flattenMessageSegments grouping for bubble and work-group rendering
            └── tools/             # Workspace tool definitions (workspace-tools.ts) and Tavily tools (tavily-tools.ts)
```

## 5. Domain Models, Data Schemas & State Invariants

### 5.1 Client-Side Entities (IndexedDB v5 — StrataAIChatDB)

- **Conversation (Table conversations, PK id):**
  - Fields: id (UUID string), userId (optional string for per-user isolation), title (string, max 40 chars auto-generated from prompt), model (catalog model id), thinkingLevel (optional string), pinned (optional boolean), files (embedded WorkspaceFile[] snapshot), activeFileId (optional string), createdAt (ISO string), updatedAt (ISO string).
  - Invariants: Holds at most 3 files; embedded files array is the primary snapshot of workspace state; updating files bumps updatedAt to re-sort the conversation list.
- **DBMessage (Table messages, PK id):**
  - Fields: id (string), chatId (indexed string FK to conversations), userId (optional indexed string), timestamp (ISO string derived from Date.now() + index), role (user | assistant | system), content (string), parts (array of UI message parts), metadata (ChatMetadata carrying usage, stepTotalUsage, modelId, isCompactedSummary).
  - Invariants: Strictly ordered by timestamp to prevent UUID tie-breaking collisions; deleting a conversation cascades deletion of all associated messages in a single Dexie transaction.
- **WorkspaceFile (Embedded within Conversation.files):**
  - Fields: id (string), name (string, unique per conversation case-insensitively), content (string, max 10,000 characters), language (string detected from extension), createdAt (ISO string), updatedAt (ISO string).
  - Invariants: Combined characters across all files in a conversation cannot exceed 50,000; file matching in tools uses case-insensitive and trimmed name comparisons.

### 5.2 Server-Side Entities (PostgreSQL — better_auth Schema)

- **user:** id (TEXT PK), name (TEXT), email (TEXT UNIQUE), emailVerified (BOOLEAN default false), image (TEXT), createdAt (TIMESTAMPTZ), updatedAt (TIMESTAMPTZ).
- **session:** id (TEXT PK), token (TEXT UNIQUE), expiresAt (TIMESTAMPTZ), ipAddress (TEXT), userAgent (TEXT), userId (TEXT FK to user ON DELETE CASCADE).
- **account:** id (TEXT PK), accountId (TEXT), providerId (TEXT), userId (TEXT FK to user ON DELETE CASCADE), password (TEXT hash), createdAt (TIMESTAMPTZ), updatedAt (TIMESTAMPTZ).
- **verification:** id (TEXT PK), identifier (TEXT), value (TEXT), expiresAt (TIMESTAMPTZ), createdAt (TIMESTAMPTZ), updatedAt (TIMESTAMPTZ).
- **message_log (Quota Ledger):** id (UUID PK default gen_random_uuid()), user_id (TEXT FK to user ON DELETE CASCADE), created_at (TIMESTAMPTZ default NOW()). Composite index on (user_id, created_at) backs sliding-window count queries and retention purges.

### 5.3 Limits & Caps Enforcement Matrix

| Constraint | Limit Constant | Enforcement Boundary | Failure / Rejection Behavior |
|---|---|---|---|
| Message Character Limit | MAX_MESSAGE_CHARS = 2000 | Client Composer & Server Route Guard | Client disables send button; server rejects with 400 Bad Request. |
| Attachments Per Message | MAX_ATTACHMENTS_PER_MESSAGE = 4 | Client Composer & Server Route Guard | File picker blocks extra files; server rejects with 400 Bad Request. |
| Image Input Size | MAX_IMAGE_INPUT_BYTES = 5 MB | Client File Input | Rejects file selection with user notification. |
| Image Output Compressed | MAX_IMAGE_OUTPUT_BYTES = 1.5 MB | Client Canvas Compressor | Downscales dimensions (max 1280px) and steps quality to fit budget. |
| Image Data URL Length | MAX_IMAGE_DATA_URL_CHARS = 2 M | Server Route Guard | Server backstop rejects oversized payloads with 400 Bad Request. |
| Document Input Size | MAX_DOCUMENT_INPUT_BYTES = 5 MB | Client File Input & Server Route Guard | Rejects oversized documents with 400 Bad Request. |
| Document Text Extraction | MAX_DOCUMENT_TEXT_CHARS = 25,000 | Client Ingestion & Sanitizer | Truncates extracted text with notice marker. |
| Files Per Workspace | MAX_FILES_PER_WORKSPACE = 3 | Tool Validator & Workspace Hook | writeFile rejects creation; UI create button disables. |
| Characters Per File | MAX_FILE_CHARS = 10,000 | Tool Validator & Workspace Editor | writeFile truncates; editFile rejects exceeding edits; editor blocks typing. |
| Total Workspace Characters | MAX_WORKSPACE_TOTAL_CHARS = 50,000 | editFile Tool Validator | editFile rejects mutations exceeding combined character budget. |
| Conversations Per User | MAX_CONVERSATIONS_PER_USER = 5 | Sidebar New Chat Action | Action no-ops and surfaces limit toast/dialog. |
| 5-Hour Sliding Quota | QUOTA_5H_LIMIT = 10 messages | PostgreSQL Atomic Transaction | Server returns 429 with Retry-After; client displays QuotaErrorCard. |
| 7-Day Sliding Quota | QUOTA_WEEK_LIMIT = 50 messages | PostgreSQL Atomic Transaction | Server returns 429 with Retry-After; client displays QuotaErrorCard. |
| Context Warning Threshold | NEAR_LIMIT_PERCENT = 80% | Client Token Metrics & System Prompt | Token popover turns amber; system prompt instructs model to be concise. |
| Agent Execution Steps | Clamped 1 to 30 (Default 25) | Agent Route & Runner | isStepCount terminates agent loop; triggers auto-continuation if needed. |

### 5.4 Assistant-Message Metadata Contract (ChatMetadata)

- **usage:** LanguageModelUsage object reporting inputTokens, outputTokens, and totalTokens from the final execution step only, providing the active context occupancy snapshot.
- **stepTotalUsage:** LanguageModelUsage object aggregating cumulative token consumption across all intermediate agent steps for session analytics and cost calculation.
- **modelId:** Exact catalog model string (e.g. gemini-3.5-flash-lite) used to compute dollar costs.
- **isCompactedSummary:** Boolean flag present on compaction summary messages, serving as the anchor for server-side history slicing.

## 6. Routing & Page Architecture (App Router)

### 6.1 Application Route Map

| Route Path | Rendering Type | Runtime | Auth Level | Purpose & Key Child Components |
|---|---|---|---|---|
| `/` | RSC Shell -> Client | Node.js | Public (Proxy Bypass) | Marketing landing page: LandingHeader, LandingHero, LandingNumbers, LandingProcess, LandingEngines, LandingCTA, LandingFooter. Authenticated users route to their latest chat or a new workspace. |
| `/auth` | RSC Redirect | Node.js | Public | Server redirect to /auth/signin, sanitizing callbackUrl to prevent private chat leakage. |
| `/auth/signin` | Client (Suspense) | Node.js | Public | Email/password sign-in: AuthShell, SignInForm, useSignIn hook, redirecting to callbackUrl. |
| `/auth/signup` | Client (Suspense) | Node.js | Public | User registration: AuthShell, SignUpForm, useSignUp hook, creating session and redirecting. |
| `/chat-id/[id]` | Client Dynamic Shell | Node.js | Protected | Main application workspace: Sidebar, ChatHeader, ChatPanel (memoized), ChatInput composer, StickToBottom container, and WorkspaceDrawer. |
| `/not-found` | RSC | Node.js | Public | Custom 404 page styled with Milo tokens and home navigation action. |
| `/robots.txt` | Static MetadataRoute | Node.js | Public | SEO crawl rules allowing public pages and disallowing /api/ agent routes. |
| `/sitemap.xml` | Static MetadataRoute | Node.js | Public | SEO sitemap listing public marketing and authentication URLs. |
| `/api/auth/[...all]` | Route Handler | Node.js | Public | Better Auth catch-all endpoint handling sign-in, sign-up, sign-out, and session validation. |
| `/api/agent` | Route Handler (SSE) | Node.js | Protected + Quota | Streams agent responses with multi-step tool execution, emitting UI message chunks and quota headers. |
| `/api/agent/compact` | Route Handler (SSE) | Node.js | Protected + Quota | Streams context compaction summaries via Gemini 3.1 Flash Lite with high reasoning effort. |
| `/api/user/rate-limit` | Route Handler (JSON) | Node.js | Protected | Read-only endpoint providing current 5-hour and 7-day quota usage snapshots. |

### 6.2 Component Hierarchy & Presentational Conventions

- **Chat Panel (`components/chat/ChatPanel.tsx`):** Memoized message list rendering empty-state hero suggestion chips, ChatBubble rows, QuotaErrorCard alerts, and streaming typing indicators. Listens for custom `insert-chat-prompt` window events.
- **Chat Bubble (`components/chat/message/ChatBubble.tsx`):** Message container decomposing AI SDK parts via `flattenMessageSegments` into user text, thumbnail attachments (`UserMessageAttachments`), collapsible reasoning blocks (`ThoughtAccordion`), tool call summaries (`ToolCallCard`), folded intermediate work (`WorkGroupCard`), and final markdown text.
- **Chat Input Composer (`components/chat/ChatInput.tsx`):** Floating composer orchestrating auto-growing textarea, character countdown, slash command menu (`SlashCommandMenu`), attachment previews (`AttachmentPreviews`), model/thinking selector (`ModelSelectorMenu`), and send/stop actions (`ComposerToolbar`).
- **Workspace Drawer (`components/workspace/WorkspaceDrawer.tsx`):** Slide-over canvas drawer managing file tabs (`WorkspaceFileSelector`), active file editing (`WorkspaceEditor`), syntax-highlighted code display (`CodeViewer`), character limit indicators, and file download/delete actions.
- **Markdown Rendering Engine (`components/ui/MarkdownRenderer.tsx`):** The sole markdown rendering pipeline across chat bubbles and workspace previews. Configures `createMarkdownComponents` for Milo typography tokens, manages internal code snippet copying, and delegates streaming rendering to `SmoothStreamText`.
- **Floating Composer Layout Synchronization:** The chat page measures composer container height using a `ResizeObserver` and dynamically adjusts the bottom padding of `StickToBottom.Content`. This guarantees that message bubbles are never obscured by the floating input bar during typing or mobile keyboard expansion.

## 7. Data Flow, Server Actions & Integration Map

### 7.1 Mutation Lanes (Zero Server Actions Invariant)

This application deliberately contains zero Server Actions (`"use server"` directives are forbidden). All state mutations execute through three designated lanes:
1. **Streaming Model Operations:** Executed via HTTP POST requests to `/api/agent` and `/api/agent/compact`, returning SSE streams while deducting database quota.
2. **Local Entity Persistence:** Executed directly via Dexie helpers (`lib/db/db.ts`) inside React hooks (`useConversations`, `useWorkspaceFiles`, `useModelSettings`, `chat-reconciler`), persisting changes instantly to browser IndexedDB.
3. **Authentication Mutations:** Executed via Better Auth client methods (`signIn.email`, `signUp.email`, `signOut`) communicating with `/api/auth/[...all]`.

### 7.2 Route Guard Pipeline & Error Handling

```
HTTP Request -> withAgentRouteGuards (lib/ai/route-guards.ts)
  │
  ├── 1. auth.api.getSession ({ headers }) ──[ Missing Session ]──> 401 Unauthorized
  │
  ├── 2. req.json() ──[ Malformed JSON Syntax ]──> 400 Bad Request
  │
  ├── 3. agentRequestBodySchema.safeParse() ──[ Schema Failures ]──> 400 Bad Request
  │
  ├── 4. Bounds Check (Chars > 2000, Attachments > 4) ──[ Overflow ]──> 400 Bad Request
  │
  ├── 5. checkAndIncrementRateLimit() ──[ Quota Exhausted ]──> 429 Rate Limit (with Retry-After)
  │
  └── 6. Execute Handler (runAgentResponse / runCompactionResponse)
            │
            └── Catch Upstream Failures ──> safeAsyncRefundRateLimit(messageLogId)
```

| HTTP Status Code | Scenario | Response Body Format | Response Headers |
|---|---|---|---|
| 200 OK | Successful agent or compaction run | UI message SSE stream (text/plain) | X-RateLimit-Remaining-5h, X-RateLimit-Remaining-Week |
| 400 Bad Request | Invalid JSON, Zod validation failure, message/attachment limit violation | JSON: `{ error, details }` | Content-Type: application/json |
| 401 Unauthorized | Missing or expired Better Auth session cookie | JSON: `{ error: "Unauthorized. Please sign in." }` | Content-Type: application/json |
| 429 Too Many Requests | 5-hour (10 msgs) or 7-day (50 msgs) quota window exhausted | JSON: `{ error, message, retryAfter }` | Retry-After, X-RateLimit-Remaining-5h: 0, X-RateLimit-Retry-After |
| 500 Internal Error | Unhandled server or database infrastructure failure | JSON: `{ error: "Internal Server Error" }` | Content-Type: application/json |

### 7.3 Tool Execution Contract

| Tool Name | Key Inputs | Output Summary Payload | Live Client Effect |
|---|---|---|---|
| `listFiles` | None | `{ count, files: FileSummary[] }` | None (reads metadata from memory context). |
| `readFile` | `nameOrId`, `section?` | `{ exists, content?, error? }` | None (extracts full text or H1-H6 markdown section). |
| `writeFile` | `name`, `content`, `language?` | `{ action: 'created' \| 'replaced', file: FileSummary }` | Updates mutable workspace and emits data-workspace file-updated. |
| `editFile` | `nameOrId`, `explanation`, `searchString`, `replaceString` | `{ success, strategyUsed, file: FileSummary, error? }` | Applies StringEditEngine, updates workspace, emits data-workspace file-updated. |
| `renameFile` | `nameOrId`, `newName` | `{ success, oldName, newName, file: FileSummary, error? }` | Validates collision, re-detects language, emits data-workspace file-updated. |
| `deleteFile` | `nameOrId` | `{ deleted: true, fileId, name, error? }` | Removes file from workspace and emits data-workspace file-deleted. |
| `webSearch` | `query`, `searchDepth`, `topic`, `maxResults`, `includeDomains` | `{ success, results: SearchResult[], error? }` | Executes Tavily search with 30s timeout and structured error handling. |
| `extractUrl` | `urls` (1-3), `extractDepth`, `query`, `chunksPerSource` | `{ success, extracted: PageContent[], failed[], error? }` | Extracts web content via Tavily with 45s timeout and 18k char cap. |

### 7.4 Sliding-Window Quota Math

Quota is tracked atomically in the PostgreSQL `better_auth.message_log` table:
1. When a request arrives, the transaction purges entries older than 7 days (`created_at < NOW() - INTERVAL '7 days'`).
2. It counts rows in the last 5 hours (`COUNT(*) WHERE created_at > NOW() - INTERVAL '5 hours'`) against `MAX_5H = 10`.
3. It counts rows in the last 7 days (`COUNT(*) WHERE created_at > NOW() - INTERVAL '7 days'`) against `MAX_WEEK = 50`.
4. If either count meets or exceeds its limit, the transaction fetches the oldest timestamp in that window, calculates `retryAfter = Math.ceil((oldestTime + WindowDuration - Date.now()) / 1000)`, commits, and returns `allowed: false`.
5. If both have room, it inserts a new row (`INSERT INTO message_log (user_id) VALUES (...) RETURNING id`), commits, and returns `allowed: true` with remaining counts and the `messageLogId`.

## 8. Unique Project Patterns, Optimizations & Quirks

- **Consolidated Stream Responder (`createUIStreamResponder` in `lib/ai/agent-runner.ts`):** All `streamText` configuration (model resolution, provider sanitization, reasoning parameter mapping, system prompt rebuilding per step, smoothStream word pacing, tool delta coalescing, step limits, OpenTelemetry tracing, SSE response formatting, and quota header generation) is centralized in one internal function shared by `/api/agent` and `/api/agent/compact`.
- **Inference Failure Quota Refund:** When an upstream LLM provider fails (rate limits, 5xx outages, context overflow, network timeouts), `classifyProviderError` maps the exception and invokes `safeAsyncRefundRateLimit(messageLogId)`. The recorded row is asynchronously deleted from PostgreSQL so users are never penalized for infrastructure failures.
- **Instant Quota Resync:** `RateLimitContext` exposes `checkQuotaStatus()`, which immediately polls `/api/user/rate-limit` upon stream error or completion, clearing false quota lockouts without requiring page refreshes.
- **Tool Input Delta Coalescing (`coalesceToolInputDeltas` in `lib/ai/stream-transforms.ts`):** Buffers incoming `tool-input-delta` JSON chunks per tool call and flushes them in a single batch upon `tool-input-end` or `tool-call`. This prevents AI SDK 7 from running expensive partial JSON parsing routines on every character delta, eliminating main-thread UI freezing during large file writes.
- **Cross-Provider Metadata Sanitization (`sanitizeMessagesForProvider` in `lib/ai/sanitization.ts`):** Strips provider-specific metadata (such as Gemini thought signatures) when switching to models from other vendors (such as Fireworks DeepSeek), preventing provider validation rejections on replayed conversation history.
- **Universal Document & PDF Ingestion:** Gemini models receive native image and PDF data URLs. For text-only DeepSeek, the server sanitization pipeline automatically decodes text document attachments and uses `unpdf` to extract text from PDF attachments into formatted markdown blocks, ensuring document review features work seamlessly across all models.
- **StringEditEngine 3-Strategy Fallback Ladder (`lib/edit-engine.ts`):** Executes file edits through three descending strategies:
  1. *Exact Matching:* Literal string comparison.
  2. *Whitespace-Normalized Matching:* Normalizes CRLF line endings, trims trailing spaces, and collapses whitespace runs.
  3. *Anchor-Matched Fuzzy Matching:* Anchors on the first and last lines within a ±5 line drift window.
  All strategies reject ambiguous multi-matches with informative error guidance, making automated code modifications safe and non-destructive.
- **Per-Step System Prompt Re-Injection:** `prepareStep` in `agent-runner.ts` dynamically rebuilds the system prompt before every tool step, updating the model with current workspace file listings and remaining token budget headroom without re-transmitting previous conversation turns.
- **Active-Context Token Accounting (Claude Code / Codex Paradigm):** Token meters record provider usage from the final execution step only (`metadata.usage`), avoiding artificial multi-step N-pass token inflation while preserving cumulative figures (`metadata.stepTotalUsage`) for billing and cost estimation.
- **Refs-as-Live-Values in Memoized Transport Closures:** `useChatTransport` and `useChatSession` maintain persistent refs for active files, model choices, and thinking levels. The underlying `DefaultChatTransport` is instantiated once and reads current values via refs, avoiding stream re-instantiations during state updates.
- **Dexie 150ms Write Coalescing:** `useWorkspaceFiles` debounces rapid file updates into a pending map with a 150ms trailing timer, batching streaming-driven canvas writes into a single IndexedDB transaction.
- **Silent Auto-Continuation Loop:** When an agent turn stops due to `finishReason === 'step-limit'`, `reconcileFinishedStep` automatically re-invokes the agent (up to 2 passes, with a 300ms delay) using a continuation instruction, allowing complex multi-file tasks to complete autonomously.
- **Segmented Message Rendering (`flattenMessageSegments` in `lib/ai/message-segments.ts`):** While streaming, all parts render live. Upon turn completion, intermediate reasoning, tool cards, and narration fold into a collapsible `WorkGroupCard`, leaving the clean final response visible in the main chat bubble.
- **Config-Agnostic Tool Cards (`components/chat/message/ToolCallCard.tsx`):** `ToolCallCard` contains zero hardcoded tool names. It consumes normalized props from `components/chat/tools/resolver.tsx`, which maps tool names and aliases to icons, badge styles, and summary builders. New tools require zero changes to `ToolCallCard`.
- **Model Catalog Pricing Mirror Invariant:** Per-model token pricing is defined in `lib/models.ts` and mirrored in `metadata.json`. Any updates to model catalogs or pricing must update both files and pass `__tests__/models.test.ts`.

## 9. Global State, Forms & UI Conventions

- **Global State Strategy:**
  - `RateLimitContext`: React Context tracking SSR-hydrated quota status, error states, and retry timestamps.
  - `Dexie Live Queries (`useLiveQuery`)`: Serves as the reactive client-side store for conversation lists, active chat messages, and workspace files.
  - `Browser Storage`: `localStorage` persists theme (`strata-theme`), model (`selectedModel`), and thinking level (`selectedThinkingLevel`); `sessionStorage` persists sidebar visibility (`strata_sidebar_open`).
- **Form Handling Protocol:** Forms avoid heavy form libraries. Authentication forms use `useAuthForm`, a lightweight state machine managing validation (password length >= 8, required strings), loading states, error alerts, and redirect transitions.
- **Telemetry & Logging:** OpenTelemetry instrumentation in `src/instrumentation.ts` dispatches traces directly to Langfuse. Runtime lifecycle logging uses structured console prefixes: `[agent]`, `[compaction]`, `[useChatSession]`, `[rate-limit]`, and `[sanitization]`.
- **Milo Design System Conventions:**
  - **Zero Hardcoded Colors:** All styling must utilize semantic tokens from `globals.css` (@theme block). Tailwind color names (slate, gray, zinc, red, amber, emerald, blue) and arbitrary hex codes are strictly forbidden.
  - **Tokens:** `primary` (electric orange #FF5520 / #FF5C28 dark), `secondary` (amber #D98200 / #FFAA1D dark), `surface-base`, `surface-raised`, `surface-overlay`, `text-primary`, `text-muted`, `text-bright`, `edge-subtle`, `edge-raised`, `danger`, `warning`, `info`.
  - **Typography Scale:** Strict semantic type scale tokens: `text-micro` (11px), `text-caption` (12px), `text-label` (14px), `text-body` (16px), `text-subheading` (18px), `text-heading` (20px), `text-title` (24px), and `text-display` (32px).
  - **Elevation & Radius:** Elevation uses `shadow-button`, `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`. Radius scale maps `rounded-lg` (12px), `rounded-xl` (20px), and `rounded-2xl` (32px).
  - **Dark Mode Implementation:** Toggled by applying both the `.dark` class and the `data-theme="dark"` attribute to `document.documentElement` alongside `color-scheme: dark`.

## 10. Non-Negotiable Architectural Rules & Anti-Patterns

1. **Unified Stream Pipeline:** All model streaming configuration MUST flow through `createUIStreamResponder` (`lib/ai/agent-runner.ts`). Never hand-roll a separate `streamText` assembly in an API route.
2. **Three Mutation Lanes Only:** State mutations MUST strictly follow: (a) Route Handler POSTs for model/quota operations, (b) Dexie helpers in `lib/db/db.ts` for local entities, or (c) Better Auth client methods for identity. Zero Server Actions (`"use server"`) are permitted.
3. **Provider Secret Isolation:** Never import `@ai-sdk/google`, `@ai-sdk/fireworks`, `pg`, or `better-auth` (server) into client components or hooks. Server-only drivers and keys must remain in `src/lib/` or `src/app/api/`.
4. **Server-Side Compaction Pruning:** `sliceMessagesAfterCompaction` MUST execute on the server in both `/api/agent` and `/api/agent/compact`. The client transport must never mutate outgoing message arrays.
5. **Milo Design Tokens Mandatory:** Never use raw Tailwind color classes (`bg-red-500`, `text-zinc-400`), raw text size classes (`text-xs`, `text-sm`, `text-base`), or arbitrary hex values. Use semantic Milo tokens (`text-caption`, `bg-surface-raised`, `text-primary`).
6. **No Manual Scroll Effects:** Never write manual `useEffect` + `scrollIntoView` loops. All message list scrolling and scroll-to-bottom affordances are owned by `<StickToBottom>` in `src/app/chat-id/[id]/page.tsx`.
7. **Async Request Parameter Resolution:** All dynamic route parameters (`params`, `searchParams`, `headers`) MUST be awaited or unwrapped via `use(params)` before accessing properties.
8. **No Magic Numbers:** All character limits, file counts, quota bounds, and timeout durations must be imported from `@/lib/limits`.
9. **Presentational Component Purity:** UI components must remain purely presentational. Components must not execute direct Dexie queries, fetch auth sessions, or trigger router navigation internally; all data and callbacks must be passed down from page hooks. (Exception: `LandingClient` resolving latest chat for studio navigation).
10. **Preserve Stream Transform Order:** `smoothStream` (word pacing) and `coalesceToolInputDeltas` MUST remain in their defined order in `agent-runner.ts` to prevent UI freezing and ensure fluid token rendering.
11. **Per-User Isolation Invariants:** All Dexie mutations must stamp `userId`. Database queries on the server must filter by the authenticated session user ID.
12. **Quota Order Invariant:** Route guards must execute quota reservation (`checkAndIncrementRateLimit`) before processing model execution, and must emit `X-RateLimit-*` headers on every response.
13. **Test Mocking Conventions:** Route tests must mock `@/lib/auth`, `@/lib/rate-limit`, and `@/lib/ai/agent-runner` using `mock.module` prior to dynamic route imports. Tests must run with `bun test --isolate`.
14. **Bun Runtime Exclusivity:** All package management and script execution MUST use `bun`. Never execute `npm`, `yarn`, or `npx`.
15. **Chat vs. Canvas Separation:** The model must never output full file contents into chat messages. Durable file content belongs exclusively in workspace files on the canvas drawer.
16. **Tool Card Isolation:** Never modify `ToolCallCard.tsx` when adding new agent tools. Register display configurations and summary builders in `components/chat/tools/resolver.tsx`.
17. **Centralized Markdown Rendering:** All markdown rendering across the app MUST use `MarkdownRenderer` (`components/ui/MarkdownRenderer.tsx`). Never introduce direct `ReactMarkdown` instances.
18. **Shared Database Connection Pools:** Server-side database queries MUST use the shared `pg` Pool instances in `lib/auth.ts` and `lib/rate-limit.ts`. Never instantiate ad-hoc connection pools.
19. **No Static Cache Directives:** Never introduce `use cache`, `cacheLife`, PPR, ISR, or cache tags. The application read model is intentionally client-local IndexedDB.

## 11. Feature Development Recipes (AI Agent Playbooks)

### Recipe A: Creating a New Feature Page

1. **Route Location:** If the feature lives inside the chat studio, compose it as a sub-component within `src/app/chat-id/[id]/page.tsx`. If it is a standalone view, create `src/app/<feature>/page.tsx`.
2. **Component Architecture:** Build the page as an RSC shell if it resolves server-side data, or as a client component wrapping presentational children in `components/<feature>/`.
3. **Session & Auth Guards:** For protected client pages, use `useSession()` from `@/lib/auth-client`. Show a loading spinner while `isPending` is true, and redirect unauthenticated users to `/auth/signin`.
4. **Data Fetching:** For local entities, use `useLiveQuery` from `dexie-react-hooks` accessing `db` from `@/lib/db/db`. Pass data down as pure props to presentational components.
5. **Styling & Tokens:** Style exclusively with Milo tokens (`bg-surface-base`, `text-body`, `shadow-card`, `rounded-xl`).
6. **Proxy Registration:** If the route requires authentication or security headers, update the matcher in `src/proxy.ts`.
7. **Verification:** Run `bun run lint`, `bun run typecheck`, and `bun run build`.

### Recipe B: Adding a Mutation Flow

1. **Determine Mutation Lane:**
   - *Local Persistence Only:* Add a database helper to `src/lib/db/db.ts` (e.g. `db.conversations.update(...)`), expose it through a specialized hook (`useWorkspaceFiles`, `useConversations`), and invoke it from UI callbacks.
   - *Model / Quota Operation:* Add the action schema to `src/lib/schemas.ts`, create or update a Route Handler wrapping execution with `withAgentRouteGuards`, and connect the client hook to parse the resulting SSE stream.
2. **Optimistic UI Updates:** Apply changes immediately to local React state and IndexedDB. In case of streaming errors, persist friendly error messages into Dexie without rolling back unrelated local edits.
3. **Database Migrations:**
   - *Client (Dexie):* Add a new `this.version(n).stores(...)` block in `src/lib/db/db.ts`. Never modify existing version definitions.
   - *Server (PostgreSQL):* Update `scripts/better-auth-schema.sql` and `scripts/migrate-better-auth-schema.ts`, then run `bun run db:migrate` and `bun run db:test`.
4. **Testing:** Write unit tests in `__tests__/` covering schema parsing, state transitions, and route error handling.

### Recipe B1: Adding a New Agent Tool

1. **Tool Definition:** Create the tool factory in `src/lib/ai/tools/workspace-tools.ts` or `tavily-tools.ts` using `tool()` from `ai` with explicit Zod input and output schemas.
2. **Workspace Binding:** If the tool modifies files, bind it to `WorkspaceToolsContext`, mutate the workspace array, and emit live updates via `writer.write({ type: 'data-workspace', data: ... })`.
3. **Tool Barrel:** Register the tool factory inside `createWorkspaceTools` in `src/lib/ai/index.ts`.
4. **Prompt Directive:** Add operational instructions and behavioral constraints for the tool in `buildSystemInstruction` (`src/lib/ai/prompts.ts`).
5. **Display Resolver:** Add the tool configuration (icon, badge token, accent color) and summary builder to `toolMeta` and `TOOL_ALIASES` in `src/components/chat/tools/resolver.tsx`. Zero changes to `ToolCallCard.tsx`.
6. **Testing:** Add test cases in `__tests__/workspace-tools.test.ts` or `__tests__/tavily-tools.test.ts`.

### Recipe B2: Adding a Slash Command

1. **Command Registration:** Open `src/components/chat/composer/SlashCommandMenu.tsx`.
2. **Registry Entry:** Add a new command object to the `SLASH_COMMANDS` array specifying `id`, `label`, `description`, `icon`, and action handler.
3. **Execution Wiring:** Connect the command handler to the composer callback (e.g. triggering compaction or inserting prompt templates).

### Recipe C: Integrating an External API / Webhook

1. **Secret Isolation:** Store API keys in `.env` and document them in `.env.example`. Access keys exclusively inside server-side Route Handlers or tool modules via `process.env`.
2. **Outbound API Integration:** Follow the pattern in `src/lib/ai/tools/tavily-tools.ts`: use native `fetch`, combine `AbortSignal.timeout` with request signals, parse non-2xx responses into user-friendly error messages, and return `{ success: false, error: ... }` rather than throwing uncaught exceptions.
3. **Inbound Webhook Handlers:**
   - Create `src/app/api/webhooks/<provider>/route.ts`.
   - Read raw request body text and verify cryptographic HMAC signatures against provider secrets before JSON parsing.
   - Return fast 2xx responses and execute side effects asynchronously.
   - Update `src/proxy.ts` to allow unauthenticated access to the webhook endpoint.
4. **Testing:** Create an integration test in `__tests__/` mocking fetch responses and verifying signature validation failures and successes.
