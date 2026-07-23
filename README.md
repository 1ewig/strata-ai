# ResumeFlow — AI Resume Tailoring Agent

An AI-powered resume builder and optimiser built with Next.js, Vercel AI SDK 7, and Google Gemini. Features conversational chat with 4 tools (`writeResume`, `readResume`, `deleteResume`, `editResume`), client-side Dexie persistence, and a modular tool-display UI.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| AI SDK | `ai@^7.0.0` + `@ai-sdk/google@^4.0.0` |
| UI | Tailwind CSS 4 + `lucide-react` |
| Persistence | Dexie.js 4 (IndexedDB) |
| Schemas | Zod 4 |
| Runtime | Node.js 22+, bun |

## Models

gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.6-flash, gemini-3.1-flash-lite, gemini-3-flash-preview, gemma-4-31b-it, gemma-4-26b-a4b-it

## Quick Start

```bash
bun install
# Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local
bun run dev
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details.

Key patterns:
- **Stateless API route** — full message history + resume sent in each request
- **contextSchema + closure tools** — `writeResume`/`readResume`/`deleteResume` use `toolsContext`; `editResume` uses mutable closures for multi-step edits
- **3-tier edit engine** — `ResumeEditEngine` tries exact, whitespace-normalized, then anchor matching
- **Resolver pattern** — `components/chat/tools/resolver.tsx` owns all tool-display logic; `ToolCallCard` is a pure 87-line shell
- **Dexie UIMessage persistence** — native AI SDK message objects stored in IndexedDB, survives refresh
