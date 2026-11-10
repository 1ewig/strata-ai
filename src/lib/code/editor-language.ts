/**
 * Pure language resolution for the workspace code editor.
 *
 * Maps a filename to a highlighter-independent description of how the editor
 * should load syntax support. Kept free of CodeMirror imports so the mapping
 * policy is unit-testable without a DOM.
 */

import { detectLanguage } from './languages';

/** Grammars provided by a first-class `@codemirror/lang-*` package. */
export type StaticGrammar = 'html' | 'css' | 'json' | 'python' | 'markdown' | 'sql' | 'yaml';

/** Grammars provided by a `@codemirror/legacy-modes` StreamParser. */
export type LegacyGrammar =
  | 'scss'
  | 'shell'
  | 'ruby'
  | 'dockerfile'
  | 'swift'
  | 'kotlin'
  | 'java'
  | 'c'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'xml';

/** How the editor should obtain syntax support for a file. */
export type EditorLanguageConfig =
  | { kind: 'javascript'; id: string; jsx: boolean; typescript: boolean }
  | { kind: 'static'; id: string; grammar: StaticGrammar }
  | { kind: 'legacy'; id: string; grammar: LegacyGrammar }
  | { kind: 'plain'; id: 'text' };

/** JS/TS family dialects share one Lezer grammar with feature flags. */
const JS_DIALECTS: Record<string, { jsx: boolean; typescript: boolean }> = {
  javascript: { jsx: false, typescript: false },
  jsx: { jsx: true, typescript: false },
  typescript: { jsx: false, typescript: true },
  tsx: { jsx: true, typescript: true },
};

const STATIC_GRAMMARS: Record<string, StaticGrammar> = {
  html: 'html',
  css: 'css',
  json: 'json',
  python: 'python',
  markdown: 'markdown',
  sql: 'sql',
  yaml: 'yaml',
};

/**
 * Legacy stream modes. PHP is deliberately absent — `@codemirror/legacy-modes`
 * ships no PHP grammar, and mis-highlighting it as C-like would be worse than
 * plain text.
 */
const LEGACY_GRAMMARS: Record<string, LegacyGrammar> = {
  scss: 'scss',
  shell: 'shell',
  ruby: 'ruby',
  dockerfile: 'dockerfile',
  swift: 'swift',
  kotlin: 'kotlin',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  rust: 'rust',
  go: 'go',
  xml: 'xml',
};

/**
 * Resolves the editor syntax configuration for a filename.
 *
 * @param fileName - Current file name (e.g. 'app.tsx', 'notes.md').
 * @returns The language config; unknown or empty names degrade to plain text.
 */
export function resolveEditorLanguage(fileName: string): EditorLanguageConfig {
  const id = detectLanguage(fileName || '', 'text');

  const jsDialect = JS_DIALECTS[id];
  if (jsDialect) {
    return { kind: 'javascript', id, jsx: jsDialect.jsx, typescript: jsDialect.typescript };
  }

  const staticGrammar = STATIC_GRAMMARS[id];
  if (staticGrammar) {
    return { kind: 'static', id, grammar: staticGrammar };
  }

  const legacyGrammar = LEGACY_GRAMMARS[id];
  if (legacyGrammar) {
    return { kind: 'legacy', id, grammar: legacyGrammar };
  }

  return { kind: 'plain', id: 'text' };
}
