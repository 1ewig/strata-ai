# AGENTS.md

Quick reference for AI agents working in this repo.

## Runtime & Commands

This project uses **bun** as its runtime and package manager. Never use `npm`/`yarn`/`npx`.

| Command | Action |
|---------|--------|
| `bun run dev` | Start Next.js dev server |
| `bun run lint` | Run ESLint (`eslint .`) |
| `bun run test` | Run unit & integration test suite (`bun test`) |
| `bun run build` | Production build (`next build`) |
| `bun run start` | Start production server |
| `bun run db:migrate` | Run Better Auth `better_auth` schema PostgreSQL migration |
| `bun run db:test` | DB connection + schema healthcheck |

Always run `bun run lint` and `bun run build` after making changes — both must pass before finishing.

## Styling — Milo Design System (CRITICAL)

The app ships light + dark themes (light default; dark via `theme-toggle.tsx` toggling the `.dark` class **and** the `html[data-theme="dark"]` attribute with `color-scheme: dark`), built on the "Milo" EdTech palette defined in the `@theme` block in `src/app/globals.css` — a warm studio linen light theme and a warm espresso dark theme.

- **NEVER hardcode colors, hex values, arbitrary shadows, or Tailwind color names (e.g. `emerald`, `rose`, `red-*`, `amber`, `cyan`, `violet`, `slate`) in components.** Use semantic tokens only.
- **Tokens** (see `globals.css` for full list):
  - `primary` (electric fiery orange `#FF5520` / `#FF5C28` dark) — CTAs, active states, avatars, streaming indicators, spinners
  - `secondary` (high-contrast amber `#D98200` light / `#FFAA1D` dark) — highlights, playful accents
  - `danger` / `warning` / `info` — errors, alerts, informational accents
  - `surface` (white) — on-brand fills (`text-surface` for white-on-orange buttons/icons)
  - `scrim` — overlay backdrops (not `bg-black/60`)
  - `primary-soft` / `danger-soft` / `accent-*` — tinted background fills
- **Shadows:** use `shadow-button` (soft modern elevation `0 1px 3px rgba(44, 38, 33, 0.10), 0 1px 2px rgba(44, 38, 33, 0.06)` light / `0 1px 3px rgba(0, 0, 0, 0.45)` dark), `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`, `shadow-glow-secondary`. Never arbitrary `shadow-[...]`.
- **Radius remap:** `rounded-lg` = 12px (badges/chips), `rounded-xl` = 20px (buttons/inputs), `rounded-2xl` = 32px (cards).
- **Type scale remap:** use semantic size tokens only — NEVER raw Tailwind size names (`text-xs`/`text-sm`/`text-base`/`text-lg`/`text-xl`/`text-2xl`) or arbitrary `text-[10px]`/`text-[11px]` in components:
  - `text-micro` (11px) — eyebrows, inline code, status badges
  - `text-caption` (12px) — meta lines, tool cards, sidebar items
  - `text-label` (14px) — buttons, form labels/inputs, nav
  - `text-body` (16px) — markdown paragraphs, chat bubbles, drawer body
  - `text-subheading` (18px) — h3, section titles
  - `text-heading` (20px) — h2, empty-state titles
  - `text-title` (24px) — h1
  - `text-display` (32px) — auth hero, 404
- **Markdown hierarchy convention** (mirrors the `MarkdownRenderer` component map in `components/ui/`): `h1`→`text-title font-display`, `h2`→`text-heading font-display`, `h3`→`text-subheading`, `p`/`li`→`text-body`, `code`→`text-micro font-mono`, `table`/`blockquote`→`text-caption`. Never attach `prose` classes (no typography plugin is installed). **All markdown rendering goes through `components/ui/MarkdownRenderer.tsx`** (variants `assistant`/`user`/`thought`/`canvas`; `isStreaming` delegates to `SmoothStreamText`; snippet-copy state is internal, `enableSnippetCopy` is canvas-only) — never add new `ReactMarkdown`/`remark-gfm` sites.
- **Fonts:** `font-display` and `font-sans` (Plus Jakarta Sans). Keep token names (`surface-*`, `text-*`, `edge-*`); add new colors only as `@theme` vars in `globals.css`.

## Architecture

Read `docs/SUMMARY.md` (the canonical system-context & architecture guide) before touching core flow. Key rules:
- **Adding an agent tool:** define the factory in `lib/ai/tools/` (workspace tools in `workspace-tools.ts`, web tools in `tavily-tools.ts`) with `tool()` + explicit schemas, use the `WorkspaceToolsContext` closure pattern (if accessing workspace files), register in `createWorkspaceTools()` in the `lib/ai/tools.ts` barrel, add a directive in `lib/ai/prompts.ts`, and add a config entry in `components/chat/tools/resolver.tsx`. **`ToolCallCard.tsx` requires zero modifications.** The agent route builds the workspace closures via `createMutableWorkspace` in `lib/ai/workspace.ts`, and session-side persistence reuses its `upsertFileIntoWorkspace` / `removeFileFromWorkspace` helpers from `chat-reconciler.ts` and `db.ts`.
- **Agent stream assembly:** `lib/ai/agent-runner.ts` owns all `streamText` configuration and collapses it into a single shared `createUIStreamResponder` used by **`runAgentResponse`** (`/api/agent`) and **`runCompactionResponse`** (`/api/agent/compact`). It handles model resolution, cross-provider metadata sanitization (`sanitizeMessagesForProvider`), system-prompt re-injection, tool wiring, streaming transforms (`smoothStream` + `coalesceToolInputDeltas` to prevent AI SDK partial JSON re-parsing freezes on tool args), `stopWhen` step cap, lifecycle logging, and SSE wrapping + quota headers. Both routes are thin HTTP/auth/validation shells that only delegate to it.
- **Context compaction:** a `/compact` slash command that streams a dense, structured summary of the conversation + workspace into a new `metadata.isCompactedSummary` message. `useCompaction.triggerCompaction` POSTs to `/api/agent/compact` (auth + rate-limited, consumes 1 quota message); `runCompactionResponse` streams via dedicated `gemini-3.1-flash-lite` with high reasoning effort and `buildCompactionInstruction(files)` with `maxOutputTokens: 3500` and finish metadata `{ isCompactedSummary: true }`. Both endpoints prune history server-side with `sliceMessagesAfterCompaction` (the client transport never mutates the outgoing payload). New files: the compact route, `components/chat/CompactionDivider.tsx`, `components/chat/SlashCommandMenu.tsx`, `hooks/useCompaction.ts`, and `lib/ai/message-segments.ts`; `token-usage.ts` resets the active context meter after a compaction summary.
- **Model providers:** models declare `provider: 'google' | 'fireworks'` in `lib/models.ts`; server-side provider wiring (model factory, reasoning mapping, `providerOptions`) lives ONLY in `lib/ai/providers.ts` (`resolveAgentModel`), consumed by the agent stream in `lib/ai/agent-runner.ts`. Never import `@ai-sdk/google`/`@ai-sdk/fireworks` into client code.
- **File persistence:** workspace tool outputs return compact metadata (`fileSummarySchema`) to keep message parts lightweight, while live content updates stream via `data-workspace` SSE events. Tool results returning `{ file }`, `{ files }`, or `{ deleted: true }` are auto-discovered by `lib/ai/message-extractor.ts`.
- **Chat architecture hooks:** `useChatSession.ts` is a modular orchestrator delegating to `useChatTransport.ts` (network/header layer only — history pruning is server-side), `chat-error-handler.ts` (friendly error message mapping), `chat-reconciler.ts` (message & file delta persistence via `persistMessages`), `useModelSettings.ts`, `useWorkspaceFiles.ts`, and `useCompaction.ts`.
- **Dexie Database:** IndexedDB v5 schema (`db.ts`) with indexed `userId` fields on `conversations` and `messages` for per-user session isolation.
- **Component & Hook Separation (mandatory):** Keep UI components purely presentational — no Dexie queries, session fetching, auth calls, or navigation logic inside them. Pages call the hooks (`useConversations.ts`, `useLatestConversationRedirect.ts`, `useSignIn.ts`/`useSignUp.ts` (which share `useAuthForm.ts`), `useSignOut.ts`, `useTheme.ts`) and pass data + callbacks down as props.
- **Auto-scroll:** handled by `<StickToBottom>` in `app/chat-id/[id]/page.tsx`. Do not write manual `useEffect` + `scrollIntoView` loops.
- **Auth:** Better Auth 1.6 on Supabase Postgres pooler; session via `auth.api.getSession({ headers })`; pre-render guards in `proxy.ts`.

## General Conventions

- Write files with clear, helpful code comments.
- No emojis in code or files.
- Follow existing patterns and file conventions; check neighboring files before writing new code.

## Testing Conventions

- `bun test` runs with `--isolate` (each file gets a fresh module registry) — this is required because `mock.module` leaks between files otherwise. Keep that flag in the `test`/`test:watch` scripts.
- Shared fixtures live in `__tests__/helpers.ts` (`makeFile`, `runTool`, `setupWorkspaceTools`, `jsonResponse`); import them instead of re-declaring local copies.
- Import limit constants from `@/lib/limits` in tests — never hardcode magic numbers (e.g. `10000`, `3` files, `12000` chars).
- Route tests (`api-agent-route.test.ts`, `api-agent-compact-route.test.ts`) mock `@/lib/auth`, `@/lib/rate-limit`, and `@/lib/ai/agent-runner` with `mock.module` before a dynamic `await import()` of the route. Use `mockImplementation` + `mockClear` in `afterEach` (not `mockReset`, which wipes implementations).
- `rate-limit.test.ts` mocks the `pg` module with a scriptable fake pool/client; keep the SQL-shape dispatch (`BEGIN`/`COUNT(*)`/`ORDER BY`/`INSERT`) in sync with `lib/rate-limit.ts`.
