import Prism from 'prismjs';
import { detectLanguage, getPrismGrammarName } from './languages';

// Ensure Prism is globally accessible before registering language components
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Prism = Prism;
}
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

// 1. Base grammars required as dependencies
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

// 2. Language components extending base grammars
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-scss';

/**
 * Escapes HTML characters for safe raw text rendering in fallback mode.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlights a snippet or file content using PrismJS.
 *
 * @param code - Raw code string to syntax highlight.
 * @param langOrFilename - Language ID (e.g. 'html', 'typescript', 'ts') or filename (e.g. 'app.ts').
 * @returns HTML string with Prism token spans.
 */
export function highlightCode(code: string, langOrFilename: string): string {
  if (!code) return '';

  const langId = detectLanguage(langOrFilename, langOrFilename.toLowerCase());
  const grammarName = getPrismGrammarName(langId) || langId;
  const grammar =
    Prism.languages[grammarName] ||
    Prism.languages[langId] ||
    Prism.languages.markup ||
    Prism.languages.javascript;

  if (!grammar) {
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, grammarName);
  } catch {
    return escapeHtml(code);
  }
}

/**
 * Tokenizes code into lines with syntax highlighting for line-numbered views.
 *
 * @param code - Complete file text.
 * @param langOrFilename - Language identifier or filename.
 * @returns Array of highlighted HTML strings, one for each line.
 */
export function highlightCodeLines(code: string, langOrFilename: string): string[] {
  if (!code) return [''];
  const highlighted = highlightCode(code, langOrFilename);
  return highlighted.split(/\r?\n/);
}
