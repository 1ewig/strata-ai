# Strata AI — Agentic Workspace & Living Document Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-strata--ai--five.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://strata-ai-five.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel AI SDK 7](https://img.shields.io/badge/Vercel%20AI%20SDK-v7.0-000000?style=for-the-badge&logo=vercel)](https://sdk.vercel.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4.1.11-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%201.4-f472b6?style=for-the-badge&logo=bun)](https://bun.sh/)
[![Tests](https://img.shields.io/badge/Tests-484%20passing%20(36%20suites)-success?style=for-the-badge&logo=bun)](https://bun.sh/)

**Strata AI** is a conversational workspace studio where AI does not just reply—it builds. 

Instead of ephemeral chat messages that disappear into a scrollback void, Strata AI pairs an autonomous reasoning assistant with a dedicated multi-file canvas drawer. Ask the agent to conduct research, formulate an architecture, draft code, or edit existing files, and watch it reason step-by-step, invoke real-time tools, and assemble durable living documents in your workspace.

All your conversations and files stay completely private, persisting locally inside your browser's IndexedDB.

---

![Strata AI Workspace Studio](public/images/workspace-empty-state.webp)

---

## The Strata Experience

### 1. Flexible Model Selection, Attachments & Controllable Thinking
Switch seamlessly between flagship frontier models like **Gemini 3.5 Flash Lite** and open-weight powerhouses like **GLM 5.3 Flash** and **DeepSeek V4.1 Flash**. Attach images for visual breakdown or upload PDFs, markdown reports, and source code files directly into the prompt—the agent analyzes attachments natively, extracting context and referencing documents while planning its work. Dial reasoning effort up or down—from rapid responses for quick iterations to deep, multi-step deliberation on intricate architectural challenges.

![Model Picker, Effort Control and Attachment Entry](public/images/model-selector-menu.webp)

### 2. Account, Usage & Theme
Your account lives one click away in the sidebar footer. The account dropup surfaces the signed-in profile, live usage quota across both the rolling 5-hour and 7-day windows with their reset countdowns, a light/dark switch, and sign-out—without ever leaving the conversation.

![Account Dropup with Usage Quota and Theme Control](public/images/account-menu-usage.webp)

### 3. Autonomous Reasoning & Multi-Step Tool Execution
When tasked with complex objectives, Strata AI does not generate guesswork. It runs autonomous loops—searching the live web, inspecting existing files, making surgical diffs, and verifying outputs. Every thought and tool invocation streams in real time through an intuitive, collapsible accordion.

![Autonomous Reasoning and Tool Pipeline](public/images/agent-reasoning-and-tools.webp)

### 4. Living Workspace Drawer & Document Viewer
Files drafted by the agent live on a dedicated slide-over canvas drawer. Markdown documents render inline with a **Source** toggle for the raw text, while code files get syntax highlighting across 25 languages, line numbers, and live character counting. Inspect, download, or edit any file side-by-side with your conversation.

![Rendered Document Preview in the Workspace Drawer](public/images/workspace-document-preview.webp)

### 5. Structured Outputs & Work Summaries
Once an agent turn completes, intermediate thoughts and tool executions neatly fold away into a single summary card. Your chat remains uncluttered, presenting polished answers with the sources behind them, the files they produced, and clear takeaways.

![Synthesized Answer with Sources and Created File](public/images/chat-response-table.webp)

---

## Quickstart

### Prerequisites
- **[Bun](https://bun.sh/)** (v1.4+) installed (`curl -fsSL https://bun.sh/install | bash` or `npm install -g bun`)
- A **Google Gemini** API key
- A **Supabase** PostgreSQL database connection string

### 1. Clone & Install
```bash
git clone git@github.com:1ewig/strata-ai.git
cd strata-ai
bun install
```

### 2. Configure Environment
Create a `.env.local` file in the root directory:
```env
# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"
FIREWORKS_API_KEY="your-fireworks-key-optional"
TAVILY_API_KEY="your-tavily-key-optional"

# Database & Auth
DATABASE_URL="postgresql://postgres:password@host:6543/postgres"
BETTER_AUTH_SECRET="your-32-char-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Initialize Database & Run
```bash
bun run db:migrate   # Set up Better Auth schema & rate-limiting table
bun run dev          # Launch the dev server at http://localhost:3000
```

---

## Technical Documentation & Invariants

Strata AI is built around a disciplined architecture: zero server actions, local-first client persistence via Dexie, unified SSE streaming with AI SDK 7, rAF-throttled 60fps streaming message rendering, memoized historical turns, GPU-isolated `table-fixed` canvas drawer, atomic sliding-window quotas in PostgreSQL, the custom Milo Design System, and 36 isolated test suites (484 passing tests).

For comprehensive architectural specifications, data schemas, streaming protocols, and agent operating rules, refer to:

👉 **[docs/SUMMARY.md](docs/SUMMARY.md)**

---

## Development Commands

| Command | Action |
|---|---|
| `bun run dev` | Start the Next.js development server |
| `bun run build` | Build the Next.js application for production (`next build`) |
| `bun run typecheck` | Fast multi-core type checking via `bun check` |
| `bun run lint` | Run Oxlint across the codebase |
| `bun run test` | Run the full test suite with module isolation (`bun test --isolate`, 36 suites, 484 tests) |
| `bun run db:migrate` | Initialize or update the PostgreSQL database schema |
| `bun run db:test` | Run database connection and schema healthcheck |

---

## License

MIT © [1ewig](https://github.com/1ewig)