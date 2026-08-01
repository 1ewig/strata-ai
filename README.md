# Strata AI — Agentic Workspace & Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**Strata AI** is a state-of-the-art, local-first agentic workspace studio designed for creating, analyzing, editing, and managing dynamic multi-file workspaces. Powered by **Google Gemini** models via **Vercel AI SDK 7**, Strata AI combines autonomous multi-step tool execution with local IndexedDB persistence, a 3-tier surgical string edit engine, and a fluid, non-glitchy streaming UX.

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

- **Autonomous Agentic Workspace Tools**: 8 schema-validated tools enabling the AI to inspect, read, create, surgically edit, rename, and delete workspace documents, plus perform real-time Tavily web searches (`webSearch`, advanced depth) and deep Markdown page extraction (`extractUrl`).
- **Significantly Reduced Context Footprint**: System prompts inject lightweight file metadata (`name`, `language`, `charCount`, `id`) rather than raw content. The agent calls `readFile` only when precise code context is required.
- **3-Tier Surgical Edit Engine (`ResumeEditEngine`)**: Performs precise string manipulation through exact matching, whitespace normalization, and 2-point anchor bounded matching without breaking document structure.
- **Local-First Client Persistence**: Complete conversation histories, dynamic file states, and user preferences persist client-side via **Dexie.js (IndexedDB v5)** with per-user session isolation—no server round-trips for workspace state.
- **Enhanced Friendly Error Handling**: Technical API errors, session expirations, network drops, and character limits are captured and transformed into clean, polite assistant message bubbles that cleanly replace loading states.
- **Auto-Continuation Execution Loop**: Automatically detects step-limit finish reasons (`finishReason === 'step-limit'`) and dispatches multi-pass continuation requests for complex agent tasks up to 75 steps.
- **Word-Paced Smooth Streaming**: Powered by `smoothStream` (15ms pacing) to ensure continuous, natural token flow without jarring chunk bursts.
- **DOM-Observer Auto-Scroll**: Leverages `use-stick-to-bottom` (`ResizeObserver`/`MutationObserver`) for reliable, non-glitchy chat scrolling that respects manual user scroll interventions.
- **Polymorphic Tool UI Resolver**: Isolates visual presentation logic in `src/components/chat/tools/resolver.tsx`, allowing instant addition of new tools with custom badges, summaries, and action triggers.
- **Decoupled Pure Presentation Components**: UI components (`Sidebar.tsx`, `theme-toggle.tsx`, auth forms, `user-button.tsx`) contain zero business logic — pages call specialized custom React hooks (`useConversations`, `useLatestConversationRedirect`, `useSignIn`, `useSignUp`, `useSignOut`, `useTheme`) and pass data + callbacks down as props.
- **Secure Email/Password Auth & Quota Enforcement**: Better Auth 1.6 on Supabase PostgreSQL with proxy-level session guards, plus database-backed 5-hour/7-day sliding window rate limiting (10 msgs / 5h, 50 msgs / week) with server-side SSR initial hydration, real-time streaming header sync, live countdown reset timers, and inline input alerts.

---

## 🤖 Workspace Tool Suite

The agent interacts with user workspaces and the web via 8 core tools registered in `src/lib/ai/tools.ts`:

| Tool | Parameters | Output / Action |
|------|------------|-----------------|
| `listFiles` | *(none)* | Returns count & metadata list (`id`, `name`, `language`, `charCount`) for all workspace files. |
| `readFile` | `nameOrId`, `section?` | Reads full file or extracts a target heading section via regex. |
| `writeFile` | `name`, `content`, `language?` | Creates a new file or completely replaces existing file contents. |
| `editFile` | `nameOrId`, `searchString`, `replaceString`, `explanation` | Surgically edits code blocks using the 3-tier `ResumeEditEngine`. |
| `renameFile` | `nameOrId`, `newName` | Renames an existing file with collision checking. |
| `deleteFile` | `nameOrId` | Removes a target file from the current workspace collection. |
| `webSearch` | `query`, `searchDepth?`, `topic?`, `maxResults?` | Performs real-time web search via Tavily (`searchDepth: "advanced"`). |
| `extractUrl` | `urls`, `extractDepth?` | Extracts clean Markdown content from target web pages via Tavily Extract. |

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
  │                              ├── Closure Context: WorkspaceToolsContext(mutableFiles)
  │                              ├── streamText() + smoothStream(15ms)
  │                              └── prepareStep: re-injects metadata system prompt
  │                              ▼
  │                        SSE Response Stream (createUIMessageStreamResponse)
  ▼
useChat UI Stream Update ◄──────┘
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

Strata AI supports dynamic hot-swapping between flagship Gemini models and open-weights models:

- **Gemini Flagship Models**: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`
- **Gemma Open-Weights Models**: `gemma-4-31b-it`, `gemma-4-26b-a4b-it`
- **Configurable Thinking Levels**: Fine-tune agent reasoning depth (`minimal`, `low`, `medium`, `high`, model-dependent — Gemma models support none).

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

- [📄 System Context & Architecture Guide (`docs/SUMMARY.md`)](docs/SUMMARY.md) — Canonical architecture guide: stack, data flow, domain models, routing, conventions, and extension recipes.

---

## 📄 License

MIT © [1ewig](https://github.com/1ewig)
