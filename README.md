# Strata AI — Agentic Workspace & Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**Strata AI** is a state-of-the-art, local-first agentic workspace studio designed for creating, analyzing, editing, and managing dynamic multi-file workspaces. Powered by **Google Gemini** and **Fireworks-hosted open-weight models** (e.g. DeepSeek V4 Flash) via **Vercel AI SDK 7**, Strata AI combines autonomous multi-step tool execution with local IndexedDB persistence, a 3-tier surgical string edit engine, and a fluid, non-glitchy streaming UX — including provider-accurate active context window accounting with per-model cost tracking and a context-window guard that keeps every run within budget.

🚀 **Live Production App:** [strata-ai-five.vercel.app](https://strata-ai-five.vercel.app)  
📁 **Repository:** [github.com/1ewig/strata-ai](https://github.com/1ewig/strata-ai)

---

## 📸 Interface & Agent Preview

### Workspace Studio Homepage
![Strata AI Workspace Studio](./public/hero.webp)

### Agent Execution & Multi-Tool Reasoning
![Agent in Action with Chain-of-Thought and Tool Cards](./public/agent-in-action.webp)

---

## 🌟 Key Features & Capabilities
- **Autonomous Agentic Workspace Tools**: 8 schema-validated tools enabling the AI to inspect, read, create, surgically edit, rename, and delete workspace documents, plus perform real-time Tavily web searches (`webSearch`, advanced depth, domain/time filters, raw-content mode) and deep Markdown page extraction (`extractUrl`).
- **Provider-Accurate Active Context Window Accounting**: Every assistant message carries its real provider-reported usage (`metadata.usage`) via AI SDK 7's `messageMetadata` stream option. Following the Claude Code, OpenCode, and Codex standard, the chat header displays the real-time **active context window occupancy** (`Context window: active tokens / context window`) with a detailed breakdown of prompt input, generation output, and remaining headroom in its popover — without inflating historical turns.
- **Per-Model Token Cost Tracking**: Each catalog model carries per-1M-token pricing (`lib/models.ts` / `metadata.json`). A compact `TokenUsagePopover` shows the running conversation at cost in USD alongside a per-model cost breakdown, so users can see exactly how much each turn and each model consumed.
- **Context-Window Guard**: Once active context occupancy crosses the active model's 128k context window, further sends in that conversation are gracefully blocked — the composer swaps to an inline "Context window reached. Start a new chat to continue." warning and disables submission, prompting the user to start a fresh chat.
- **Real-Time Live Workspace Updates**: Tools emit custom `data-workspace` SSE stream events via AI SDK 7's `createUIMessageStream` (`writer.write`). The client `onData` handler updates the Workspace Drawer and IndexedDB in real time the instant a tool finishes executing, without waiting for the inference run to complete.
- **Significantly Reduced Context Footprint**: System prompts inject lightweight file metadata (`name`, `language`, `charCount`, `id`) rather than raw content. The agent calls `readFile` only when precise code context is required.
- **3-Tier Surgical Edit Engine (`StringEditEngine`)**: Performs precise string manipulation through exact matching, whitespace normalization, and 2-point anchor bounded matching without breaking document structure.
- **Local-First Client Persistence**: Complete conversation histories, dynamic file states, and user preferences persist client-side via **Dexie.js (IndexedDB v5)** with per-user session isolation—no server round-trips for workspace state.
- **Enhanced Friendly Error Handling**: Technical API errors, session expirations, network drops, and character limits are captured and transformed into clean, polite assistant message bubbles that cleanly replace loading states.
- **Auto-Continuation Execution Loop**: Automatically detects step-limit finish reasons (`finishReason === 'step-limit'`) and dispatches multi-pass continuation requests for complex agent tasks up to 75 steps.
- **Word-Paced Smooth Streaming & Live Markdown**: Powered by `smoothStream` (25ms pacing), server-side `coalesceToolInputDeltas()` transform (buffers tool argument chunks to prevent AI SDK partial JSON re-parsing freezes), and `SmoothStreamText` with live Markdown formatting and an active streaming caret to ensure continuous, formatted, and natural token flow without jarring chunk bursts.
- **DOM-Observer Auto-Scroll**: Leverages `use-stick-to-bottom` (`ResizeObserver`/`MutationObserver`) for reliable, non-glitchy chat scrolling that respects manual user scroll interventions.
- **Polymorphic Tool UI Resolver & Compact Tool Outputs**: Isolates visual presentation logic in `src/components/chat/tools/resolver.tsx` with AI SDK 7 lifecycle state resolution, compact metadata-only tool outputs (`fileSummarySchema`), concise file/URL summaries, and a custom `areToolCallCardPropsEqual` comparator in `ToolCallCard.tsx` that skips re-renders while multi-KB file arguments stream in.
- **Single Collapsed Work Card**: Reasoning, tool calls, and intermediate narration stream live and ungrouped while the agent works, then fold into one auto-collapsing "Worked for Xs" card once inference ends — only the final answer remains as a message bubble.
- **Guarded Destructive Actions**: A reusable portaled `ConfirmDialog` confirms sign-out, workspace file deletion, and chat deletion before destructive actions execute.
- **Streaming Stop Control**: The send button morphs into a stop button while the agent is streaming, letting users cancel long inference runs mid-flight.
- **Decoupled Pure Presentation Components**: UI components contain zero business logic — pages call specialized custom hooks and pass data + callbacks down as props. Hot streaming surfaces are `React.memo`'d with stable handlers to skip re-renders on every stream delta.
- **Secure Email/Password Auth & Quota Enforcement**: Better Auth on Supabase PostgreSQL with proxy-level session guards, plus database-backed 5-hour/7-day sliding window rate limiting (10 msgs / 5h, 50 msgs / week) with SSR initial hydration, streaming header sync, live countdown reset timers, and inline input alerts.

---

## 🤖 Workspace Tool Suite

The agent interacts with user workspaces and the web via 8 core tools — factories live in `lib/ai/tools/` (`workspace-tools.ts`, `tavily-tools.ts`), bundled by the `lib/ai/tools.ts` barrel:

| Tool | Parameters | Output / Action |
|------|------------|-----------------|
| `listFiles` | *(none)* | Returns count & metadata list (`id`, `name`, `language`, `charCount`) for all workspace files. |
| `readFile` | `nameOrId`, `section?` | Reads full file or extracts a target heading section via regex. |
| `writeFile` | `name`, `content`, `language?` | Creates a new file or completely replaces existing file contents. |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | Surgically edits code blocks using the 3-tier `StringEditEngine`. |
| `renameFile` | `nameOrId`, `newName` | Renames an existing file with collision checking. |
| `deleteFile` | `nameOrId` | Removes a target file from the current workspace collection. |
| `webSearch` | `query`, `searchDepth?`, `topic?`, `maxResults?`, `includeRawContent?`, `includeImages?`, `timeRange?`, `includeDomains?`, `excludeDomains?` | Real-time web search via Tavily (`searchDepth: "basic"` default for fast, 1-credit lookups; `"advanced"` for 2-credit deep research) — ranked results with content snippets, optional raw page content, images, and publish dates (the app's own model synthesizes the answer). |
| `extractUrl` | `urls` (1–3), `extractDepth?` | Extracts clean Markdown content from target web pages via Tavily Extract (up to 3 URLs per call, 45s timeout). |

---

## 📐 Architecture Overview

<details>
<summary>High-level request flow</summary>

```
User message → useChatSession.handleSendMessage
  → chat.sendMessage → DefaultChatTransport (POST /api/agent)
  → runAgentResponse (lib/ai/agent-runner.ts):
       resolveAgentModel → buildSystemInstruction(files)
       createUIMessageStream + writer.write({ type: "data-workspace" })
       streamText + smoothStream(25ms) + coalesceToolInputDeltas()
       messageMetadata: attach per-message provider usage
  → SSE response (createUIMessageStreamResponse), streaming headers
  → useChat UI stream + onData
  → onFinish: persist native UIMessage → Dexie; extract file create/edit/delete
       deltas and merge into the conversation's files array
```

</details>

Concurrency and streaming details, domain models, persistence touchpoints, and extension recipes live in the [System Context & Architecture Guide](docs/SUMMARY.md).

---

## ⚙️ Model Support, Thinking Levels & Context Windows

All catalog models are capped at a **128k-token context window (131,072 tokens)** and **64k max output (65,536 tokens)** — the token budget the context-window guard enforces per conversation.

- **Gemini flagship models**: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`
- **Gemma open-weight models**: `gemma-4-31b-it`, `gemma-4-26b-a4b-it`
- **Fireworks-hosted**: `accounts/fireworks/models/deepseek-v4-flash-0731` (DeepSeek V4 Flash 0731 — requires `FIREWORKS_API_KEY`)
- **Configurable thinking levels**: `minimal` / `low` / `medium` / `high` (model-dependent — Gemma models support none, DeepSeek V4 Flash exposes `low`/`high`).

---

## 🔒 Free-Tier Guardrails & Limits

Centralized in `lib/limits.ts` for client-side UX enforcement, API validation, and tool safety:

- **Message length**: 2,000 characters per message (`maxLength={2000}` on `<textarea>` + HTTP 400 validation).
- **Per-file size**: 10,000 characters per workspace document.
- **Total workspace size**: 50,000 characters across all workspace files.
- **Conversations per user**: 5 active conversations (cap enforced in the `useConversations` hook).
- **Files per workspace**: 3 files per workspace.
- **Token budget (per conversation)**: every model's context window is 128k tokens; active context occupancy is shown live in the header (with a detailed cost breakdown popover), and once exhausted the app refuses further sends ("Context window reached. Start a new chat to continue.").

---

## 🚀 Quick Start & Development

### 1. Clone & Install Dependencies

```bash
git clone git@github.com:1ewig/strata-ai.git
cd strata-ai
bun install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key-here"

# Required for Fireworks-hosted models (DeepSeek etc.)
FIREWORKS_API_KEY="your-fireworks-api-key-here"

# Required: Supabase project (auth & rate-limiting)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Required: Supabase PostgreSQL connection string (auth + rate-limit tables)
DATABASE_URL="postgresql://postgres.user:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Required: Web search access
TAVILY_API_KEY="tvly-your-tavily-api-key-here"

# Optional: default model override
NEXT_PUBLIC_GEMINI_MODEL="gemini-3.5-flash-lite"

# Better Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

See `.env.example` for the authoritative reference.

### 3. Set Up Database (Auth + Rate Limiting)

```bash
bun run db:migrate   # create the better_auth schema & tables
bun run db:test      # optional: verify connection + schema
```

### 4. Run the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with email + password (no verification needed).

Other scripts: `bun run build`, `bun run start`, `bun run lint`, `bun run clean`.

---

## 📚 Technical Documentation

- [📘 Complete Chatbot & Agentic AI Guide](docs/ai-sdk-nextjs-guide.md) — Beginner-to-advanced tutorial on building with AI SDK 7 + Next.js 16.
- [📄 System Context & Architecture Guide](docs/SUMMARY.md) — canonical architecture, data flow, domain models, and extension recipes.

---

## 📄 License

MIT © [1ewig](https://github.com/1ewig)