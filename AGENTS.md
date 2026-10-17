# AGENTS.md

Operating guidelines and critical rules for AI agents in this repository. For comprehensive architecture, data flows, and playbooks, refer to [docs/SUMMARY.md](docs/SUMMARY.md).

## Prioritize Parallel Tool Use (CRITICAL)

Always prefer issuing multiple tool calls in parallel within a single turn — especially file reads and writes, searches, and inspections. Only run calls sequentially when one genuinely depends on another's output.

## Runtime & Commands

Always use **bun**. Never run `npm`, `yarn`, or `npx`.

| Command | Action |
|---------|--------|
| `bun run dev` | Start Next.js dev server |
| `bun run lint` | Run Oxlint (`oxlint`) |
| `bun run typecheck` | Run TypeScript checking (`bun check`) |
| `bun run test` | Run unit & integration test suite (`bun test --isolate`) |
| `bun run build` | Production build (`next build`) |
| `bun run start` | Start production server |
| `bun run db:migrate` | Run Better Auth PostgreSQL schema migration |
| `bun run db:test` | DB connection + schema healthcheck |

> **Always run `bun run lint` and `bun run build` after making changes — both must pass before finishing.**

## Styling — Milo Design System (CRITICAL)

The app ships light + dark themes (light default; dark via `.dark` class + `html[data-theme="dark"]`).

- **Zero Hardcoded Colors:** Never hardcode hex values or use Tailwind color names (`emerald`, `rose`, `slate`, `zinc`, `red-*`, `amber`, etc.). Use semantic tokens: `primary`, `secondary`, `surface-*`, `text-*`, `edge-*`, `danger`, `warning`, `info`, `scrim`.
- **Type Scale Tokens Only:** Never use raw Tailwind size names (`text-xs`/`text-sm`/`text-base`/`text-lg`/`text-xl`/`text-2xl`) or arbitrary pixel sizes. Use semantic tokens:
  - `text-micro` (11px) — eyebrows, inline code, status badges
  - `text-caption` (12px) — meta lines, tool cards, sidebar items
  - `text-label` (14px) — buttons, form labels/inputs, nav
  - `text-body` (16px) — markdown paragraphs, chat bubbles, drawer body
  - `text-subheading` (18px) — h3, section titles
  - `text-heading` (20px) — h2, empty-state titles
  - `text-title` (24px) — h1
  - `text-display` (32px) — auth hero, 404
- **Elevation & Radius:** Use `shadow-button`, `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`. Radius: `rounded-lg` (12px), `rounded-xl` (20px), `rounded-2xl` (32px).
- **Markdown Rendering:** All markdown MUST render through `components/ui/MarkdownRenderer.tsx`. Never add direct `ReactMarkdown` or `remark-gfm` imports.

## Core Architectural Invariants

- **No Server Actions:** Zero `"use server"` directives. State mutations use (1) Route Handlers for streaming/quota, (2) Dexie (`lib/db/db.ts`) for local entities, or (3) Better Auth client methods.
- **Unified Stream Assembly:** All model streaming must flow through `createUIStreamResponder` (`src/agent/core/runner.ts`) with `smoothStream` and `coalesceToolInputDeltas`.
- **Route Guards & Quota:** Wrap agent routes with `withAgentRouteGuards` (`src/agent/guards/route-guards.ts`). Auto-refund rate limits on upstream inference failure.
- **Tool Card Isolation:** Do not edit `ToolCallCard.tsx` when adding tools; register display configs and summaries in `components/chat/tools/resolver.tsx`.
- **Auto-scroll:** Handled exclusively by `<StickToBottom>` in `src/components/ChatPageClient.tsx`. No manual scroll loops.
- **Async Next.js 16 APIs:** Unwrap dynamic route `params` with `use(params)` in client components, `await searchParams`/`headers()` in RSCs.
- **General Rules:** No emojis in code or files. Follow neighboring patterns. Preserve existing comments.

## Clean Codebase & Separation of Concerns (CRITICAL)

- **Single Responsibility:** Keep every module focused on one concern. When a component, hook, or file starts doing too much, extract the rest into a co-located file, hook, or helper.
- **Respect the Layers:** Route files and top-level components compose; hooks (`src/hooks/`) own fetching, Dexie, auth, and router logic; UI components stay presentational and receive data as props. Never bury side effects in the view layer.
- **Co-locate by Domain:** Group related files in domain folders (`components/chat/header/`, `chat/input/`, `chat/message/`, `chat/tools/`). Shared pure helpers live in `src/lib/`, hooks in `src/hooks/`, contexts in `src/contexts/`, constants in `src/constants/`.
- **No Duplication or Dead Code:** Extract repeated logic into a shared helper/hook. Delete unused files, shims, and superseded code instead of leaving them behind.
- **Thin Entry Points:** Keep route files and page shells minimal — they wire pieces together, they don't implement.
- **Prefer Composition:** Break large components into smaller ones; use scoped contexts (e.g. `ChatInputContext`) for cross-cutting UI state instead of prop drilling.

## Testing Conventions

- Run tests with `--isolate` (`bun test`).
- Import shared fixtures from `__tests__/helpers.ts` (`makeFile`, `runTool`, `setupWorkspaceTools`, `jsonResponse`).
- Import limit constants from `@/lib/limits` (never hardcode magic numbers).
- Mock `@/lib/auth`, `@/lib/rate-limit`, and `@/agent/core/runner` with `mock.module` before dynamic route imports in route tests.
