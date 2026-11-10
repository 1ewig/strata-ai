/**
 * CodeMirror adapter for the workspace editor: turns a filename into the
 * language `Extension` the editor needs. All CodeMirror grammar imports live
 * here so the resolution policy stays pure in `editor-language.ts`.
 */

import type { Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { sCSS } from '@codemirror/legacy-modes/mode/css';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { c, cpp, java, kotlin } from '@codemirror/legacy-modes/mode/clike';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { go } from '@codemirror/legacy-modes/mode/go';
import { xml } from '@codemirror/legacy-modes/mode/xml';
import {
  resolveEditorLanguage,
  type LegacyGrammar,
  type StaticGrammar,
} from './editor-language';

/** First-class grammars, lazily instantiated per call. */
const STATIC_EXTENSIONS: Record<StaticGrammar, () => Extension> = {
  html: () => html(),
  css: () => css(),
  json: () => json(),
  python: () => python(),
  markdown: () => markdown(),
  sql: () => sql(),
  yaml: () => yaml(),
};

/** Lezer stream modes wrapping the legacy CodeMirror 5 grammars. */
const LEGACY_PARSERS: Record<LegacyGrammar, StreamParser<unknown>> = {
  scss: sCSS,
  shell,
  ruby,
  dockerfile: dockerFile,
  swift,
  kotlin,
  java,
  c,
  cpp,
  rust,
  go,
  xml,
};

/**
 * Builds the syntax-highlighting extension for a filename.
 *
 * @param fileName - Current file name (e.g. 'app.tsx', 'notes.md').
 * @returns A language extension, or an empty array for plain-text files.
 */
export function getEditorLanguageExtension(fileName: string): Extension {
  const config = resolveEditorLanguage(fileName);

  switch (config.kind) {
    case 'javascript':
      return javascript({ jsx: config.jsx, typescript: config.typescript });
    case 'static':
      return STATIC_EXTENSIONS[config.grammar]();
    case 'legacy':
      return StreamLanguage.define(LEGACY_PARSERS[config.grammar]);
    default:
      return [];
  }
}
