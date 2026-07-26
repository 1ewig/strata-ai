# Strata AI — Agentic AI Workspace & Document Studio

An AI-powered agentic workspace studio built with Next.js 16, Vercel AI SDK 7, and Google Gemini. Features conversational chat with 5 general-purpose workspace file management tools (`listFiles`, `readFile`, `writeFile`, `editFile`, `deleteFile`), client-side Dexie IndexedDB persistence, an interactive slide-over Workspace Drawer, and a modular tool-display UI.

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
- **Stateless API route** — full message history + active workspace files sent in each request with `abortSignal` and `smoothStream`
- **Closure-based agent tools** — `listFiles`, `readFile`, `writeFile`, `editFile`, `deleteFile` use single-source-of-truth workspace closure context
- **3-tier edit engine** — `ResumeEditEngine` performs exact, whitespace-normalized, and anchor matching for verbatim targeted edits
- **Resolver pattern** — `components/chat/tools/resolver.tsx` owns tool-display cards; `ToolCallCard` is a pure presentation shell
- **Dexie UIMessage & Workspace persistence** — native AI SDK message objects and multi-file collections stored in IndexedDB across reloads
