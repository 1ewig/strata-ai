# Strata AI — Agentic Workspace & Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.10-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7.0-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1.11-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.6-purple?style=for-the-badge)](https://www.better-auth.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-f472b6?style=for-the-badge&logo=bun)](https://bun.sh/)

**Strata AI** is a production-grade, local-first agentic workspace studio designed for creating, inspecting, editing, researching, and managing multi-file workspaces. Powered by **Google Gemini** and **Fireworks-hosted open-weight models** (such as DeepSeek V4 Flash) via **Vercel AI SDK 7**, Strata AI combines autonomous multi-step tool execution with local IndexedDB persistence, a 3-tier surgical string edit engine, dedicated high-reasoning context compaction, and a fluid streaming UX featuring provider-accurate active context accounting and a context-window guard.

* **Production Application:** [strata-ai-five.vercel.app](https://strata-ai-five.vercel.app)
* **Repository:** [github.com/1ewig/strata-ai](https://github.com/1ewig/strata-ai)
* **Architecture Guide:** [docs/SUMMARY.md](docs/SUMMARY.md)
* **AI SDK 7 Guide:** [docs/ai-sdk-nextjs-guide.md](docs/ai-sdk-nextjs-guide.md)

---

## Interface Preview

### Workspace Studio Dashboard
![Strata AI Workspace Studio](./public/hero.webp)

### Agent Execution & Multi-Tool Reasoning
![Agent in Action with Chain-of-Thought and Tool Cards](./public/agent-in-action.webp)

---

## Key Capabilities

### 1. Autonomous Agentic Workspace Tools
The agent inspects and modifies the workspace through 8 schema-validated tool factories (`src/lib/ai/tools/`):
* **Workspace Management:** `listFiles`, `readFile`, `writeFile`, `editFile`, `renameFile`, and `deleteFile`.
* **3-Tier Surgical String Edit Engine (`StringEditEngine`):** `editFile` uses a fallback hierarchy (exact match -> whitespace normalization -> 2-point anchor bounded matching) for precise edits without rewriting entire files.
* **Live Workspace Streaming:** Tools emit custom `data-workspace` Server-Sent Events (SSE) via `createUIMessageStream`. The client `onData` handler updates the Workspace Drawer and IndexedDB in real time as each tool finishes executing, without waiting for the entire LLM response to conclude.
* **Real-Time Web Intelligence:** `webSearch` (Tavily Search with basic/advanced depth, domain filters, and optional raw content) and `extractUrl` (Tavily Extract clean Markdown parser, up to 3 URLs per call).

### 2. Context Compaction Engine (`/compact`)
* **Dedicated High-Speed Model:** Compaction runs exclusively on **`gemini-3.1-flash-lite`** with **`high`** reasoning effort (`COMPACTION_MODEL_ID` / `COMPACTION_THINKING_LEVEL`) with a 3,500 max output token allowance, regardless of the active chat model.
* **Goal-Oriented Distillation Schema:** Synthesizes history across structured sections: `## Current Goal`, `## Key Decisions & Constraints`, `## Progress So Far`, `## Open Questions / TODOs`, `## Important Facts & Artifacts`, `## Workspace State`, `## Recent Trajectory`, and `## Continuation Notes`.
* **Server-Side Pruning:** Slices history after the latest `isCompactedSummary` anchor via `sliceMessagesAfterCompaction` so neither the agent nor subsequent compactions re-read pre-compaction history.
* **Meter Reset:** Compaction resets active context occupancy to a baseline (~1,500 system tokens + summary output), instantly restoring headroom.

### 3. Active Context Accounting & Context-Window Guard
* **Provider-Reported Usage:** Captures exact token counts (`metadata.usage`) using AI SDK 7's `messageMetadata` stream option following the Claude Code / OpenCode / Codex active context standard.
* **Live Meter & Cost Breakdown:** Chat header surfaces active tokens against the 128k context window limit (`formatTokens(active) / formatContextWindow(limit)`). The `TokenUsagePopover` breaks down prompt tokens, generation tokens, headroom, total USD cost, and per-model expense.
* **Context-Window Guard & Inline Action:** When active tokens exceed the model's 128k window (`isContextWindowExhausted`), further direct sends are blocked, and `ChatInput` presents an inline `"Compact history"` action button to distill context in-place.

### 4. Local-First Client Persistence (Dexie IndexedDB v5)
* Complete chat histories, workspace files, and metadata persist client-side via Dexie.js with indexed `userId` isolation across accounts.
* Client-side state survives page reloads and network drops without server round-trips for workspace file state.

### 5. Milo EdTech Design System
* Custom design tokens defined in `@theme` in `src/app/globals.css`:
  * **Colors:** Electric fiery orange primary (`#FF5520` / `#FF5C28` dark), warm golden amber secondary (`#FFAA1D`), semantic surfaces, and soft fills.
  * **Typography Scale:** `text-micro` (11px), `text-caption` (12px), `text-label` (14px), `text-body` (16px), `text-subheading` (18px), `text-heading` (20px), `text-title` (24px), `text-display` (32px).
  * **Radius Remap:** `rounded-lg` (12px), `rounded-xl` (20px), `rounded-2xl` (32px).
  * **Elevation:** `shadow-button`, `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`.
* Dark and light theme support with fluid CSS transitions and no Tailwind color hardcoding.

### 6. Authentication & Sliding-Window Quota Enforcement
* **Better Auth 1.6** on Supabase PostgreSQL (transaction pooler) with secure session handling and middleware guards.
* **Database-Backed Quota:** Enforces sliding-window rate limits (10 messages per 5 hours, 50 messages per 7 days).
* **SSR Hydration:** Server layout injects initial quota data to eliminate client hydration waterfalls; responses sync live quota headers (`X-RateLimit-*`) with countdown reset timers.

---

## Workspace Tools Reference

All workspace tool implementations reside in `src/lib/ai/tools/`:

| Tool | Parameters | Description |
|------|------------|-------------|
| `listFiles` | *(none)* | Returns metadata (`id`, `name`, `language`, `charCount`) for all workspace files. |
| `readFile` | `nameOrId`, `section?` | Reads full content or extracts a specific Markdown section via regex heading match. |
| `writeFile` | `name`, `content`, `language?` | Creates a new file or completely overwrites an existing file in the workspace. |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | Surgically edits file content using the 3-tier `StringEditEngine`. |
| `renameFile` | `nameOrId`, `newName` | Renames an existing file with collision validation. |
| `deleteFile` | `nameOrId` | Removes a target file from the workspace. |
| `webSearch` | `query`, `searchDepth?`, `topic?`, `maxResults?`, `includeRawContent?`, `includeImages?`, `timeRange?`, `includeDomains?`, `excludeDomains?` | Real-time web search via Tavily API with snippets, raw content, images, and publish dates. |
| `extractUrl` | `urls` (1–3), `extractDepth?` | Extracts clean Markdown content from up to 3 target web pages simultaneously. |

---

## Model Catalog & Thinking Levels

All models operate with a **128k token context window (131,072 tokens)** and **64k maximum output (65,536 tokens)**:

| Model ID | Label | Provider | Thinking Levels | Default Level |
|----------|-------|----------|-----------------|---------------|
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | Google | minimal, low, medium, high | low |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | Google | minimal, high | minimal |
| `gemini-3-flash-preview` | Gemini 3 Flash | Google | minimal, low, medium, high | low |
| `gemma-4-31b-it` | Gemma 4 31B | Google | none | — |
| `gemma-4-26b-a4b-it` | Gemma 4 26B | Google | none | — |
| `accounts/fireworks/models/deepseek-v4-flash-0731` | DeepSeek V4 Flash | Fireworks | low, high | high |

*Note: Context compaction (`/compact`) is hardwired to `gemini-3.1-flash-lite` with `high` thinking effort.*

---

## Guardrails & Workspace Limits

Centralized in `src/lib/limits.ts`:

* **Message Character Limit:** 2,000 characters per user turn.
* **Per-File Character Limit:** 10,000 characters per workspace document.
* **Total Workspace Character Limit:** 50,000 characters across all workspace files.
* **Max Files per Workspace:** 3 active documents.
* **Max Conversations per User:** 5 active conversations.
* **Context Warning Threshold:** Flips to near-limit warning mode at 80% occupancy.
* **Context Hard Cap:** 131,072 tokens (blocks new sends and presents the `"Compact history"` action).

---

## System Architecture

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

---

## Getting Started

### Prerequisites
* **Bun** installed globally (`curl -fsSL https://bun.sh/install | bash` or `npm install -g bun`)
* Google Gemini API key
* Supabase project (PostgreSQL database pooler)
* Tavily API key (for web search and extraction)
* Fireworks API key (optional, for DeepSeek models)

### 1. Clone & Install Dependencies

```bash
git clone git@github.com:1ewig/strata-ai.git
cd strata-ai
bun install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

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

### 3. Run Database Migrations

Set up the `better_auth` schema and rate-limit tables in Supabase PostgreSQL:

```bash
bun run db:migrate   # Run Better Auth & schema migration
bun run db:test      # Verify database connection and tables
```

### 4. Start Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Command | Action |
|--------|---------|--------|
| `bun run dev` | `next dev` | Start Next.js Turbopack development server |
| `bun run build` | `next build` | Create production build with type checking |
| `bun run start` | `node .next/standalone/server.js` | Start standalone production server |
| `bun run lint` | `eslint .` | Run ESLint across entire codebase |
| `bun run clean` | `next clean` | Remove `.next` cache and build artifacts |
| `bun run db:migrate` | `bun run scripts/migrate-better-auth-schema.ts` | Run PostgreSQL database schema migration |
| `bun run db:test` | `bun run scripts/test-db.ts` | Test database connection and table integrity |

---

## Technical Documentation

* **[docs/SUMMARY.md](docs/SUMMARY.md):** Canonical system context, detailed stream assembly flow, domain models, and extension recipes.
* **[docs/ai-sdk-nextjs-guide.md](docs/ai-sdk-nextjs-guide.md):** In-depth technical architecture guide for building agentic applications with Vercel AI SDK 7, Turbopack, and Next.js 16.

---

## License

MIT © [1ewig](https://github.com/1ewig)