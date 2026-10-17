# AGENTS.md

Operating guidelines for AI agents in this repository. Full architecture lives in [docs/SUMMARY.md](docs/SUMMARY.md).

## Prioritize Parallel Tool Use (CRITICAL)

Always prefer issuing multiple tool calls in parallel within a single turn — especially file reads and writes, searches, and inspections. Only run calls sequentially when one genuinely depends on another's output.

## Clean Codebase & Separation of Concerns (CRITICAL)

- **Single Responsibility:** Keep every module focused on one concern. When a component, hook, or file starts doing too much, extract the rest into a co-located file, hook, or helper.
- **Respect the Layers:** Route files and top-level components compose; hooks (`src/hooks/`) own fetching, Dexie, auth, and router logic; UI components stay presentational and receive data as props. Never bury side effects in the view layer.
- **Co-locate by Domain:** Group related files in domain folders (`components/chat/header/`, `chat/input/`, `chat/message/`, `chat/tools/`). Shared pure helpers live in `src/lib/`, hooks in `src/hooks/`, contexts in `src/contexts/`, constants in `src/constants/`.
- **No Duplication or Dead Code:** Extract repeated logic into a shared helper/hook. Delete unused files, shims, and superseded code instead of leaving them behind.
- **Thin Entry Points:** Keep route files and page shells minimal — they wire pieces together, they don't implement.
- **Prefer Composition:** Break large components into smaller ones; use scoped contexts for cross-cutting UI state instead of prop drilling.

## Design Tokens (CRITICAL)

Never hardcode typography, color, spacing, or other theme values — no hex codes, no Tailwind palette names (`emerald`, `slate`, etc.), no raw size classes (`text-sm`/`text-lg`). Use the semantic tokens defined in `src/app/globals.css` (`@theme`). Read that file to learn the available tokens and pick the right one.

## Runtime

Use **bun** only. Never run `npm`, `yarn`, or `npx`.

> Run `bun run lint`, `bun run typecheck`, and `bun run build` after making changes — all must pass before finishing.
