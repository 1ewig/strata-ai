# AGENTS.md

Quick reference for AI agents working in this repo.

## Runtime & Commands

This project uses **bun** as its runtime and package manager. Never use `npm`/`yarn`/`npx`.

| Command | Action |
|---------|--------|
| `bun run dev` | Start Next.js dev server |
| `bun run lint` | Run ESLint (`eslint .`) |
| `bun run build` | Production build (`next build`) |
| `bun run start` | Start production server |
| `bun run db:migrate` | Run Better Auth `better_auth` schema PostgreSQL migration |
| `bun run db:test` | DB connection + schema healthcheck |

Always run `bun run lint` and `bun run build` after making changes — both must pass before finishing.

## Styling — Milo Design System (CRITICAL)

The app ships light + dark themes (light default; dark via `theme-toggle.tsx` + the `.dark` token set), built on the "Milo" EdTech palette defined in the `@theme` block in `src/app/globals.css`.

- **NEVER hardcode colors, hex values, arbitrary shadows, or Tailwind color names (e.g. `emerald`, `rose`, `red-*`, `amber`, `cyan`, `violet`, `slate`) in components.** Use semantic tokens only.
- **Tokens** (see `globals.css` for full list):
  - `primary` (orange `#F15A2B`) — CTAs, active states, avatars, streaming indicators, spinners
  - `secondary` (sunshine yellow `#FFC229`) — highlights, playful accents
  - `danger` / `warning` / `info` — errors, alerts, informational accents
  - `surface` (white) — on-brand fills (`text-surface` for white-on-orange buttons/icons)
  - `scrim` — overlay backdrops (not `bg-black/60`)
  - `primary-soft` / `danger-soft` / `accent-*` — tinted background fills
- **Shadows:** use `shadow-button` (hard offset `0 4px 0 #231F3A`), `shadow-card`, `shadow-card-lg`, `shadow-glow-primary`, `shadow-glow-secondary`. Never arbitrary `shadow-[...]`.
- **Radius remap:** `rounded-lg` = 12px (badges/chips), `rounded-xl` = 20px (buttons/inputs), `rounded-2xl` = 32px (cards).
- **Fonts:** `font-display` (Fredoka) for headings/logo, `font-sans` (Nunito) for body. Keep token names (`surface-*`, `text-*`, `edge-*`); add new colors only as `@theme` vars in `globals.css`.

## Architecture

Read `docs/SUMMARY.md` (the canonical system-context & architecture guide) before touching core flow. Key rules:
- **Adding an agent tool:** define in `lib/ai/tools.ts` with `tool()` + explicit schemas, use the `WorkspaceToolsContext` closure pattern (if accessing workspace files), register in `createWorkspaceTools()`, add a directive in `lib/ai/prompts.ts`, and add a config entry in `components/chat/tools/resolver.tsx`. **`ToolCallCard.tsx` requires zero modifications.**
- **File persistence:** tool results returning `{ file }`, `{ files }`, or `{ deleted: true }` are auto-discovered by `lib/ai/message-extractor.ts` — no changes needed for new tools.
- **Chat architecture hooks:** `useChatSession.ts` is a modular orchestrator delegating to `useChatTransport.ts`, `chat-error-handler.ts` (friendly error message mapping), `chat-reconciler.ts` (message & file delta persistence), `useModelSettings.ts`, and `useWorkspaceFiles.ts`.
- **Auto-scroll:** handled by `<StickToBottom>` in `app/chat-id/[id]/page.tsx`. Do not write manual `useEffect` + `scrollIntoView` loops.
- **Auth:** Better Auth 1.6 on Supabase Postgres pooler; session via `auth.api.getSession({ headers })`; pre-render guards in `proxy.ts`.

## General Conventions

- Write files with clear, helpful code comments.
- No emojis in code or files.
- Follow existing patterns and file conventions; check neighboring files before writing new code.
