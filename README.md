# Strata AI — Agentic Workspace & Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.10-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7.0-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1.11-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.6-purple?style=for-the-badge)](https://www.better-auth.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-f472b6?style=for-the-badge&logo=bun)](https://bun.sh/)

**Strata AI** is a chat-first tool that uses an AI agent to create, read, edit, rename, and delete files inside a small per-conversation workspace. You talk to a model — Google Gemini or a Fireworks-hosted open-weight model such as DeepSeek V4 Flash — and it carries out the file work for you, streaming its reasoning, tool calls, and progress into the UI as it goes.

Server-side state is deliberately minimal: chat history and workspace files live in the browser's IndexedDB, and the only server-side persistence is the auth identity and message-quota log. File state survives reloads without a server round trip.

- **Live demo:** [strata-ai-five.vercel.app](https://strata-ai-five.vercel.app) · **Repository:** [github.com/1ewig/strata-ai](https://github.com/1ewig/strata-ai)

---

## Quickstart

### Prerequisites

- **Bun** installed globally (`curl -fsSL https://bun.sh/install | bash` or `npm install -g bun`)
- A **Google Gemini** API key
- A **Supabase** project (PostgreSQL database pooler)
- A **Tavily** API key for web search and extraction (optional)
- A **Fireworks** API key for DeepSeek-hosted models (optional)

### 1. Install dependencies

```bash
git clone git@github.com:1ewig/strata-ai.git
cd strata-ai
bun install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root (see `.env.example` for the authoritative list):

```env
# Google Gemini API Key (Required)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."
# Fireworks API Key (Required for DeepSeek models)
FIREWORKS_API_KEY="fw_..."
# Tavily API Key (Required for web search & extraction)
TAVILY_API_KEY="tvly-..."
# Supabase Postgres Database (Required for Better Auth + rate limiting)
DATABASE_URL="postgresql://postgres.user:password@aws-0-region.pooler.supabase.com:6543/postgres"
# Better Auth Configuration
BETTER_AUTH_SECRET="your-secure-random-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Default Model Override (Optional)
NEXT_PUBLIC_GEMINI_MODEL="gemini-3.5-flash-lite"
```

### 3. Set up the database

Create the `better_auth` schema and rate-limit tables in Supabase PostgreSQL:

```bash
bun run db:migrate   # Run Better Auth & schema migration
bun run db:test      # Verify database connection and tables
```

### 4. Start the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Key Features

### 1. Agentic file operations and web research

The assistant runs multi-step agentic loops and can invoke 8 schema-validated tools (6 workspace tools plus `webSearch` and `extractUrl`). A single user turn runs up to 25 tool steps, and when that cap is hit the client automatically asks the agent to continue (up to 2 more passes, roughly 75 effective steps). The model is expected to chain operations — `readFile` then `editFile`, or `webSearch` then `extractUrl` — before drafting workspace files.

- **Workspace management:** `listFiles`, `readFile`, `writeFile`, `editFile`, `renameFile`, `deleteFile`.
- **Web intelligence:** `webSearch` (Tavily search with basic/advanced depth, topic and recency filters, domain allow/deny lists) and `extractUrl` (Tavily Extract, up to 3 URLs per call, clean Markdown output, per-page failure reporting).
- **Surgical edits:** `editFile` routes through a 3-tier string-edit engine (exact → whitespace-normalized → 2-point anchor-bounded matching) so the agent makes precise changes without rewriting whole files.
- **Multi-language support:** 24+ languages with automatic language detection from the filename (HTML, TypeScript, JavaScript, JSX, TSX, CSS, SCSS, JSON, Python, SQL, Shell, YAML, Markdown, Rust, Go, C/C++, Java, Kotlin, PHP, Ruby, Swift, XML, Dockerfile, plain text).

### 2. Image attachments with vision input

Attach up to 4 images (JPEG, PNG, WebP, or GIF) to any message on a vision-capable model. Images are validated and compressed entirely in the browser — a canvas pipeline downscales the longest edge to 1,280 px and steps quality down until the image fits a compact budget — so nothing heavy ever reaches the API. Gemini models accept attachments; DeepSeek V4 Flash is text-only, so the attach button is hidden and any image history is gracefully stripped on replay. The server mirrors the client gates (count, MIME whitelist, and size) with a 400 backstop, and attached images render as a thumbnail row in the chat bubble.

### 3. Streaming UX and live workspace updates

Tokens arrive word-paced (`smoothStream`, 25 ms) so replies read like continuous prose. While the model works, the UI streams its reasoning inside a collapsible "Thinking" accordion and shows compact tool-execution cards for each call; once a turn finishes, all pre-answer output folds into a single collapsible "Worked for Xs" group, leaving just the final answer bubble.

File changes stream in while the model is still working: workspace tools emit custom `data-workspace` Server-Sent Events (SSE) over the AI SDK UI-message stream, and the client updates the Workspace Drawer and IndexedDB in real time as each tool finishes, without waiting for the whole response to conclude.

### 4. Workspace Studio Drawer

A slide-over panel next to the chat gives you a file switcher with language tags, a line-numbered, syntax-highlighted code viewer (PrismJS), a raw text editor with a live header character counter, an empty-state canvas, and a footer with copy-to-clipboard, edit-mode toggle, and file metadata. Files can be previewed as Markdown or edited as raw text.

### 5. Context compaction (`/compact`)

A dedicated endpoint distills the conversation and workspace state into a structured summary stored as an assistant message. Compaction always runs on `gemini-3.1-flash-lite` with high reasoning effort and a 3,500-token output cap, regardless of the active chat model. The summary follows a fixed section outline (Current Goal, Key Decisions & Constraints, Progress So Far, Open Questions / TODOs, Important Facts & Artifacts, Workspace State, Recent Trajectory, Continuation Notes). History before the latest summary is pruned server-side, and the active context-window meter resets to a small baseline plus the summary's real output.

### 6. Context-window accounting and guard

The server attaches provider-reported token usage to finished messages. The chat header shows a live "active tokens / context window" meter (all models use a 128k window) with a popover breaking down input tokens, output tokens, headroom, estimated USD cost, and per-model expense. When active tokens cross the model's context window, further sends are blocked and the composer offers an inline "Compact history" action.

### 7. Local-first persistence

Chat histories, workspace files, and metadata persist client-side via Dexie (IndexedDB, schema v5) with per-user isolation. Conversations survive reloads and network drops, and workspace file state never needs a server round trip.

### 8. Authentication and message quotas

Better Auth 1.6 on Supabase PostgreSQL handles email/password sessions, with a Next.js proxy guarding signed-in routes. A sliding-window quota (10 messages per 5 hours, 50 per 7 days) is enforced server-side per user and surfaced in the UI as a live "X left" ring and countdown error cards; the root layout hydrates the initial quota server-side to avoid a client fetch waterfall.

### 9. Milo design system

A custom design system defined in `@theme` in `src/app/globals.css`: a warm studio-linen light theme and a warm espresso dark theme, toggled via the `.dark` class and `html[data-theme="dark"]` attribute. All colors, shadows, radii, and type sizes use semantic tokens (fiery-orange primary, amber secondary, `text-micro` through `text-display`), with spring-based micro-interactions via `motion`.

![Workspace Studio Dashboard](./public/hero.webp)

![Agent Execution & Multi-Tool Reasoning](./public/agent-in-action.webp)

---

## Tech Stack

| Layer | Technology / Library | Purpose |
|-------|----------------------|---------|
| Framework | Next.js 16.2.10 (App Router, `src/` layout) | SSR, dynamic routes, streaming API routes; standalone build |
| UI | React 19.2.7 | Runtime; the app is almost entirely Client Components |
| Language | TypeScript 6.0.3 (strict) | Type safety; path alias `@/*` → `./src/*` |
| Runtime | Bun | Dev server, build, lint, and migration scripts |
| AI SDK | Vercel AI SDK 7 (`ai`, `@ai-sdk/react`) | LLM streaming, tool calling, UI-message SSE protocol |
| Model providers | `@ai-sdk/google`, `@ai-sdk/fireworks` | Gemini models and Fireworks-hosted DeepSeek V4 Flash |
| Web search | Tavily REST API (direct `fetch`) | `webSearch` and `extractUrl` agent tools |
| Client database | Dexie 4 + `dexie-react-hooks` | IndexedDB persistence of conversations, messages, files |
| Server database | Supabase PostgreSQL via `pg` Pool | Better Auth identity + rate-limit log (`better_auth` schema) |
| Auth | Better Auth 1.6.25 + `nextCookies()` | Email/password sessions, cookie handling, session cache |
| Styling | Tailwind CSS 4.1 + `@tailwindcss/postcss` | Utility-first UI on the Milo `@theme` design tokens |
| Animations | `motion` 12 | Drawer slides, spring micro-interactions |
| Markdown | `react-markdown` 10 + `remark-gfm` 4 | Chat and drawer Markdown rendering |
| Syntax highlighting | PrismJS 1.30 | Multi-language highlighting in chat and the code viewer |
| Validation | Zod 4 | API body parsing and every tool input/output schema |
| Icons | lucide-react | Iconography |
| Auto-scroll | `use-stick-to-bottom` | Chat scroll behavior (no manual scroll effects) |
| Testing | `bun test` (15 suites in `__tests__/`) | Unit + route-integration tests | `bun run test` / `bun run test:watch` (`--isolate` flag); shared fixtures in `__tests__/helpers.ts`; constants imported from `@/lib/limits` |

---

## How the Agent Works

The system is intentionally client-centric: the API routes are stateless shells that reconstruct the workspace from the request body on every call.

```
User Input / Composer
  │
  ├──> useChatSession (Orchestrator)
  │      ├──> useChatTransport (Network & rate-limit header parser)
  │      │      └──> POST /api/agent ──> runAgentResponse (lib/ai/agent-runner.ts)
  │      │             ├── resolveAgentModel (Google / Fireworks)
  │      │             ├── buildSystemInstruction (Metadata-only file list + token budget)
  │      │             ├── createWorkspaceTools (Mutable workspace closure)
  │      │             └── createUIStreamResponder (smoothStream + coalesceToolInputDeltas)
  │      │                   └── SSE stream + data-workspace events
  │      │
  │      ├──> useCompaction (Context Compaction)
  │      │      └──> POST /api/agent/compact ──> runCompactionResponse
  │      │             ├── sliceMessagesAfterCompaction (Server-side history pruning)
  │      │             └── gemini-3.1-flash-lite (High reasoning effort, maxOutputTokens: 3500)
  │      │
  │      └──> chat-reconciler (Persistence & State Sync)
  │             └──> Dexie.js (IndexedDB v5: conversations & messages tables)
```

Highlights worth knowing:

- **Stateless API routes.** `/api/agent` and `/api/agent/compact` verify the session, enforce the quota, validate the body with Zod, then delegate all streaming configuration to `lib/ai/agent-runner.ts`. Tools operate on an in-memory file array rebuilt from the request body; nothing is persisted server-side.
- **Provider-agnostic wiring.** Model ids in `lib/models.ts` declare a provider (`google` or `fireworks`); `lib/ai/providers.ts` resolves the provider-specific model, reasoning mapping, and `providerOptions`. Client code never imports the provider SDKs.
- **Live content via SSE, reconciliation on finish.** File content persists mid-stream through `data-workspace` events; on `onFinish`, `lib/ai/message-extractor.ts` reconciles deletions and metadata-only summaries into the conversation's file list.
- **Cross-provider sanitization.** Provider metadata from a previous provider (e.g. a stored Gemini thought signature) is pruned before history is replayed into a Fireworks request.
- **Server-side history pruning.** Both endpoints slice the message list to start at the latest compaction summary, so the model never re-reads pre-summary history.
- **Multimodal with graceful fallback.** Vision-capable Gemini models consume image attachments (validated + compressed client-side); text-only DeepSeek hides the attach button, and the agent runner strips image parts from replayed history so conversations survive provider switches.

For a deep dive, read [docs/SUMMARY.md](docs/SUMMARY.md), the canonical system-context and architecture guide.

---

## Workspace Tools Reference

All tool implementations live in `src/lib/ai/tools/`.

| Tool | Parameters | Description |
|------|------------|-------------|
| `listFiles` | *(none)* | Returns metadata (`id`, `name`, `language`, `charCount`) for all workspace files. |
| `readFile` | `nameOrId`, `section?` | Reads full content or extracts a specific Markdown section via regex heading match. |
| `writeFile` | `name`, `content`, `language?` | Creates a new file or overwrites an existing one with automatic language detection. |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | Surgically edits file content using the 3-tier `StringEditEngine`. |
| `renameFile` | `nameOrId`, `newName` | Renames a file with collision validation and automatic language re-indexing. |
| `deleteFile` | `nameOrId` | Removes a file from the workspace. |
| `webSearch` | `query`, `searchDepth?`, `topic?`, `maxResults?`, `timeRange?`, `days?`, `includeDomains?`, `excludeDomains?` | Real-time web search via Tavily returning ranked results with titles, URLs, dates, and snippets. |
| `extractUrl` | `urls` (1–3), `extractDepth?`, `query?`, `chunksPerSource?`, `format?` | Extracts clean Markdown from up to 3 target URLs with protocol normalization and optional section filtering. |

---

## Model Catalog & Thinking Levels

All models share a 128k-token context window (131,072 tokens) and 64k maximum output (65,536 tokens).

| Model ID | Label | Provider | Vision | Thinking Levels | Default Level |
|----------|-------|----------|--------|-----------------|---------------|
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | Google | Yes | minimal, low, medium, high | low |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | Google | Yes | minimal, high | minimal |
| `gemini-3-flash-preview` | Gemini 3 Flash | Google | Yes | minimal, low, medium, high | high |
| `gemma-4-31b-it` | Gemma 4 31B | Google | Yes | none | — |
| `gemma-4-26b-a4b-it` | Gemma 4 26B | Google | Yes | none | — |
| `accounts/fireworks/models/deepseek-v4-flash-0731` | DeepSeek V4 Flash | Fireworks | No | low, high | high |

Notes:

- Context compaction is hardwired to `gemini-3.1-flash-lite` with `high` thinking effort.
- DeepSeek V4 Flash's reasoning maps to Fireworks' `reasoning_effort` (the model also supports a `max` effort, but the AI SDK's top-level reasoning option cannot express it, so the app exposes only low/high).
- Vision-capable models accept image attachments (up to 4 per message); DeepSeek is text-only, so the composer hides the attach button and image parts are stripped from replayed history on that provider.
- Model and thinking-level preferences persist in `localStorage`; a conversation's own `model`/`thinkingLevel` values take priority when set.

---

## Guardrails & Workspace Limits

Centralized in `src/lib/limits.ts`:

| Constraint | Limit |
|------------|-------|
| Message character limit | 2,000 per user turn |
| Images per message | 4 (JPEG, PNG, WebP, GIF) |
| Image input size | 5 MB per image (rejected at pick time) |
| Image output size | 1.5 MB per image (client-compressed) |
| Image dimension | 1,280 px long edge (client-compressed) |
| Per-file character limit | 10,000 per workspace document |
| Total workspace character limit | 50,000 across all files |
| Max files per workspace | 3 active documents |
| Max conversations per user | 5 active conversations |
| Context warning threshold | 80% context-window occupancy |
| Context hard cap | 131,072 tokens (blocks sends, offers "Compact history") |

---

## Available Scripts

All scripts run through Bun.

| Script | Command | Action |
|--------|---------|--------|
| `bun run dev` | `next dev` | Start the Next.js dev server |
| `bun run build` | `next build` | Create a production build with type checking |
| `bun run start` | `node .next/standalone/server.js` | Serve the standalone production build |
| `bun run lint` | `eslint .` | Run ESLint across the codebase |
| `bun run test` | `bun test --isolate` | Run the unit & integration test suite (15 suites in `__tests__/`) |
| `bun run test:watch` | `bun test --isolate --watch` | Re-run tests on file changes |
| `bun run clean` | `next clean` | Clear the `.next` cache and build artifacts |
| `bun run db:migrate` | `bun run scripts/migrate-better-auth-schema.ts` | Run the PostgreSQL schema migration |
| `bun run db:test` | `bun run scripts/test-db.ts` | Test the database connection and table integrity |

---

## Documentation

- **[docs/SUMMARY.md](docs/SUMMARY.md):** canonical system-context and architecture guide — data flow, stream assembly, domain models, and extension recipes.
- **[docs/ai-sdk-nextjs-guide.md](docs/ai-sdk-nextjs-guide.md):** in-depth walkthrough of building agentic apps with Vercel AI SDK 7, Turbopack, and Next.js 16, grounded in this codebase.

---

## License

MIT © [1ewig](https://github.com/1ewig)