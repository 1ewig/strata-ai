# Strata AI — Agentic Workspace & Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**Strata AI** is a state-of-the-art, local-first agentic workspace studio designed for creating, analyzing, editing, and managing dynamic multi-file workspaces. Powered by **Google Gemini** and **Fireworks-hosted open-weight models** (e.g. DeepSeek V4 Flash) via **Vercel AI SDK 7**, Strata AI combines autonomous multi-step tool execution with local IndexedDB persistence, a 3-tier surgical string edit engine, and a fluid, non-glitchy streaming UX.

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
- **Real-Time Live Workspace Updates**: Tools emit custom `data-workspace` SSE stream events via AI SDK 7's `createUIMessageStream` (`writer.write`). Client `onData` handler updates the Workspace Drawer and IndexedDB in real-time the instant a tool finishes executing, without waiting for the inference run to complete.
- **Significantly Reduced Context Footprint**: System prompts inject lightweight file metadata (`name`, `language`, `charCount`, `id`) rather than raw content. The agent calls `readFile` only when precise code context is required.
- **3-Tier Surgical Edit Engine (`StringEditEngine`)**: Performs precise string manipulation through exact matching, whitespace normalization, and 2-point anchor bounded matching without breaking document structure.
- **Local-First Client Persistence**: Complete conversation histories, dynamic file states, and user preferences persist client-side via **Dexie.js (IndexedDB v5)** with per-user session isolation—no server round-trips for workspace state.
- **Enhanced Friendly Error Handling**: Technical API errors, session expirations, network drops, and character limits are captured and transformed into clean, polite assistant message bubbles that cleanly replace loading states.
- **Auto-Continuation Execution Loop**: Automatically detects step-limit finish reasons (`finishReason === 'step-limit'`) and dispatches multi-pass continuation requests for complex agent tasks up to 75 steps.
- **Word-Paced Smooth Streaming & Token Fade**: Powered by `smoothStream` (25ms pacing), server-side `coalesceToolInputDeltas()` transform (buffers tool argument chunks to prevent AI SDK partial JSON re-parsing freezes), and `SmoothStreamText` with smooth CSS token opacity & blur fade transitions (`animate-token-fade`, 750ms) to ensure continuous, natural token flow without jarring chunk bursts.
- **DOM-Observer Auto-Scroll**: Leverages `use-stick-to-bottom` (`ResizeObserver`/`MutationObserver`) for reliable, non-glitchy chat scrolling that respects manual user scroll interventions.
- **Polymorphic Tool UI Resolver & Compact Tool Outputs**: Isolates visual presentation logic in `src/components/chat/tools/resolver.tsx` with AI SDK 7 lifecycle state resolution, compact metadata-only tool outputs (`fileSummarySchema`), concise file/URL summaries, and a custom `areToolCallCardPropsEqual` comparator in `ToolCallCard.tsx` that skips 100% of intermediate re-renders while multi-KB file arguments stream in.
- **Single Collapsed Work Card**: Reasoning, tool calls, and intermediate narration stream live and ungrouped while the agent works, then fold into one auto-collapsing "Worked for Xs" `WorkGroupCard` once inference ends — only the final answer remains as a message bubble.
- **Guarded Destructive Actions**: A reusable portaled `ConfirmDialog` confirms sign-out, workspace file deletion, and chat deletion before destructive actions execute.
- **Streaming Stop Control**: The send button morphs into a stop button while the agent is streaming, letting users cancel long inference runs mid-flight.
- **Decoupled Pure Presentation Components**: UI components (`Sidebar.tsx`, `theme-toggle.tsx`, auth forms, `user-button.tsx`) contain zero business logic — pages call specialized custom React hooks (`useConversations`, `useLatestConversationRedirect`, `useSignIn`, `useSignUp`, `useSignOut`, `useTheme`) and pass data + callbacks down as props. Hot streaming surfaces (`ChatBubble`, `WorkspaceDrawer`, `ChatInput`, `Sidebar`) are `React.memo`'d with stable `useCallback` handlers to skip re-renders on every stream delta.
- **Secure Email/Password Auth & Quota Enforcement**: Better Auth 1.6 on Supabase PostgreSQL with proxy-level session guards, plus database-backed 5-hour/7-day sliding window rate limiting (10 msgs / 5h, 50 msgs / week) with server-side SSR initial hydration, real-time streaming header sync, live countdown reset timers, and inline input alerts.

---

## 🤖 Workspace Tool Suite

The agent interacts with user workspaces and the web via 8 core tools — factories live in `src/lib/ai/tools/` (`workspace-tools.ts`, `tavily-tools.ts`), bundled by the `src/lib/ai/tools.ts` barrel:

| Tool | Parameters | Output / Action |
|------|------------|-----------------|
| `listFiles` | *(none)* | Returns count & metadata list (`id`, `name`, `language`, `charCount`) for all workspace files. |
| `readFile` | `nameOrId`, `section?` | Reads full file or extracts a target heading section via regex. |
| `writeFile` | `name`, `content`, `language?` | Creates a new file or completely replaces existing file contents. |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | Surgically edits code blocks using the 3-tier `StringEditEngine`. |
| `renameFile` | `nameOrId`, `newName` | Renames an existing file with collision checking. |
| `deleteFile` | `nameOrId` | Removes a target file from the current workspace collection. |
| `webSearch` | `query`, `searchDepth?`, `topic?`, `maxResults?`, `includeRawContent?`, `includeImages?`, `timeRange?`, `includeDomains?`, `excludeDomains?` | Real-time web search via Tavily (`searchDepth: "advanced"` default) — ranked results with content snippets, optional raw page content, images, and publish dates (the app's own model synthesizes the answer). |
| `extractUrl` | `urls` (1–3), `extractDepth?` | Extracts clean Markdown content from target web pages via Tavily Extract (up to 3 URLs per call, 45s timeout). |

---

## 📐 Architecture & Data Flow

```
User Input in ChatInput
  │
  ▼
useChatSession.handleSendMessage(text)
  │
  ▼
chat.sendMessage({ text }) ──► DefaultChatTransport (POST /api/agent)
  │                              │ Body: { messages, model, thinkingLevel, files }
  │                              ▼
  │                        POST /api/agent
  │                              ├── Zod body validation
  │                              ├── Closure Context: WorkspaceToolsContext(mutableFiles, writer)
  │                              ├── createUIMessageStream + writer.write({ type: "data-workspace" })
  │                              ├── streamText() + smoothStream(25ms)
  │                              └── prepareStep: re-injects metadata system prompt
  │                              ▼
  │                        SSE Response Stream (createUIMessageStreamResponse)
  ▼
useChat UI Stream Update + onData ◄───┘
  │
  ▼
onFinish(message, allMessages)
  ├── Persist native UIMessage objects to Dexie IndexedDB
  ├── Extract file creations/edits via extractFilesFromMessage()
  ├── Extract file deletions via extractDeletedFilesFromMessage()
  └── Merge & persist updated workspace file collection in Dexie
```

---

## ⚙️ Model Support & Thinking Levels

Strata AI supports dynamic hot-swapping between flagship Gemini models and open-weights models across multiple providers:

- **Gemini Flagship Models**: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`
- **Gemma Open-Weights Models**: `gemma-4-31b-it`, `gemma-4-26b-a4b-it`
- **Fireworks-Hosted Models**: `accounts/fireworks/models/deepseek-v4-flash-0731` (DeepSeek V4 Flash 0731 — fast open-weight reasoning via Fireworks AI; requires `FIREWORKS_API_KEY`)
- **Configurable Thinking Levels**: Fine-tune agent reasoning depth (`minimal`, `low`, `medium`, `high`, model-dependent — Gemma models support none, DeepSeek V4 Flash exposes `low`/`high`).

---

## 🔒 Free-Tier Guardrails & Limits

Centralized in `src/lib/limits.ts` for client-side UX enforcement, API validation, and tool safety:

- **Max Prompt Input**: 2,000 characters per message (`maxLength={2000}` on `<textarea>` + API HTTP 400 validation).
- **Max File Size**: 10,000 characters per workspace document (`WorkspaceDrawer` + tool clamping).
- **Max Total Workspace Size**: 50,000 characters total across all workspace files.
- **Max Conversations per User**: 5 active conversations (cap enforced in the `useConversations` hook; `Sidebar` renders the disabled button and list counter).
- **Max Files per Workspace**: 3 files per workspace (`WorkspaceDrawer` creation guard and AI tool rejection).

---

## 🚀 Quick Start & Development

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/1ewig/strata-ai.git
cd strata-ai
bun install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key-here"

# Required: Fireworks API Key (for Fireworks-hosted models like DeepSeek V4 Flash)
FIREWORKS_API_KEY="your-fireworks-api-key-here"

# Required: Supabase Project
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Required: Supabase PostgreSQL Pooler connection string
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Required: Better Auth
BETTER_AUTH_SECRET="your-secret-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Tavily API Key (for web search & page extraction)
TAVILY_API_KEY="tvly-your-tavily-api-key-here"

# Optional: Default Model ID
NEXT_PUBLIC_GEMINI_MODEL="gemini-3.5-flash-lite"

# Optional: Base URL
APP_URL="http://localhost:3000"
```

See `.env.example` for the full annotated reference.

### 3. Set Up Database

The app uses Supabase PostgreSQL for authentication and rate limiting:

```bash
# Create the Better Auth schema and tables
bun run db:migrate

# Optional: verify the database connection and schema
bun run db:test
```

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be prompted to sign up / sign in with email + password — no email verification required.

---

## 📚 Technical Documentation

For in-depth architectural breakdown, data flow details, and engineering design decisions:

- [📘 Complete Chatbot & Agentic AI Guide (`docs/ai-sdk-nextjs-guide.md`)](docs/ai-sdk-nextjs-guide.md) — Beginner-to-advanced tutorial: build a chatbot, then a multi-tool agent with AI SDK 7 + Next.js 16, including streaming UX, provider abstraction, persistence, performance optimization, and best practices.
- [📄 System Context & Architecture Guide (`docs/SUMMARY.md`)](docs/SUMMARY.md) — Canonical architecture guide: stack, data flow, domain models, routing, conventions, and extension recipes.

---

## 📄 License

MIT © [1ewig](https://github.com/1ewig)
