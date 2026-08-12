/**
 * Language definitions, file extension mapping, and alias resolution for the Strata AI workspace.
 * Supports HTML, JavaScript, TypeScript, JSX, TSX, CSS, JSON, Python, SQL,
 * Bash, YAML, Markdown, Rust, Go, C/C++, Java, and more.
 */

export interface LanguageMeta {
  id: string;
  label: string;
  extensions: string[];
  prismGrammar: string;
  isMarkdown?: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageMeta> = {
  html: {
    id: 'html',
    label: 'HTML',
    extensions: ['.html', '.htm'],
    prismGrammar: 'markup',
  },
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['.js', '.mjs', '.cjs'],
    prismGrammar: 'javascript',
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['.ts', '.mts', '.cts'],
    prismGrammar: 'typescript',
  },
  jsx: {
    id: 'jsx',
    label: 'JSX',
    extensions: ['.jsx'],
    prismGrammar: 'jsx',
  },
  tsx: {
    id: 'tsx',
    label: 'TSX',
    extensions: ['.tsx'],
    prismGrammar: 'tsx',
  },
  css: {
    id: 'css',
    label: 'CSS',
    extensions: ['.css'],
    prismGrammar: 'css',
  },
  scss: {
    id: 'scss',
    label: 'SCSS',
    extensions: ['.scss', '.sass'],
    prismGrammar: 'scss',
  },
  json: {
    id: 'json',
    label: 'JSON',
    extensions: ['.json', '.jsonc'],
    prismGrammar: 'json',
  },
  python: {
    id: 'python',
    label: 'Python',
    extensions: ['.py', '.pyw'],
    prismGrammar: 'python',
  },
  sql: {
    id: 'sql',
    label: 'SQL',
    extensions: ['.sql'],
    prismGrammar: 'sql',
  },
  shell: {
    id: 'shell',
    label: 'Shell',
    extensions: ['.sh', '.bash', '.zsh'],
    prismGrammar: 'bash',
  },
  yaml: {
    id: 'yaml',
    label: 'YAML',
    extensions: ['.yaml', '.yml'],
    prismGrammar: 'yaml',
  },
  markdown: {
    id: 'markdown',
    label: 'Markdown',
    extensions: ['.md', '.markdown', '.mdx'],
    prismGrammar: 'markdown',
    isMarkdown: true,
  },
  rust: {
    id: 'rust',
    label: 'Rust',
    extensions: ['.rs'],
    prismGrammar: 'rust',
  },
  go: {
    id: 'go',
    label: 'Go',
    extensions: ['.go'],
    prismGrammar: 'go',
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
    prismGrammar: 'cpp',
  },
  c: {
    id: 'c',
    label: 'C',
    extensions: ['.c', '.h'],
    prismGrammar: 'c',
  },
  java: {
    id: 'java',
    label: 'Java',
    extensions: ['.java'],
    prismGrammar: 'java',
  },
  kotlin: {
    id: 'kotlin',
    label: 'Kotlin',
    extensions: ['.kt', '.kts'],
    prismGrammar: 'kotlin',
  },
  php: {
    id: 'php',
    label: 'PHP',
    extensions: ['.php'],
    prismGrammar: 'php',
  },
  ruby: {
    id: 'ruby',
    label: 'Ruby',
    extensions: ['.rb'],
    prismGrammar: 'ruby',
  },
  swift: {
    id: 'swift',
    label: 'Swift',
    extensions: ['.swift'],
    prismGrammar: 'swift',
  },
  xml: {
    id: 'xml',
    label: 'XML',
    extensions: ['.xml', '.svg'],
    prismGrammar: 'markup',
  },
  dockerfile: {
    id: 'dockerfile',
    label: 'Dockerfile',
    extensions: ['.dockerfile'],
    prismGrammar: 'docker',
  },
  text: {
    id: 'text',
    label: 'Plain Text',
    extensions: ['.txt', '.log', '.env'],
    prismGrammar: 'plain',
  },
};

/** Common shorthand aliases mapped to canonical language IDs */
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  pyw: 'python',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  rs: 'rust',
  golang: 'go',
  cxx: 'cpp',
  cc: 'cpp',
  htm: 'html',
  svg: 'xml',
  kt: 'kotlin',
  rb: 'ruby',
  txt: 'text',
  env: 'text',
};

/**
 * Normalizes a filename or extension to lower case for comparison.
 */
function normalizeName(filename: string): string {
  return filename.trim().toLowerCase();
}

/**
 * Detects the language ID from a filename, extension, or language identifier.
 *
 * @param filename - File name (e.g. 'index.html', 'app.ts', 'document.md') or language shorthand ('ts', 'py').
 * @param fallback - Default language if no match is found (defaults to 'markdown').
 * @returns Canonical language ID (e.g. 'html', 'typescript', 'markdown').
 */
export function detectLanguage(filename: string, fallback = 'markdown'): string {
  if (!filename) return fallback;
  const lower = normalizeName(filename);

  // Exact alias match (e.g. 'ts' -> 'typescript', 'py' -> 'python')
  if (LANGUAGE_ALIASES[lower]) {
    return LANGUAGE_ALIASES[lower];
  }

  // Exact supported language ID match (e.g. 'typescript', 'html')
  if (SUPPORTED_LANGUAGES[lower]) {
    return lower;
  }

  // Find by file extension (e.g. 'app.ts' -> '.ts')
  for (const lang of Object.values(SUPPORTED_LANGUAGES)) {
    for (const ext of lang.extensions) {
      if (lower.endsWith(ext)) {
        return lang.id;
      }
    }
  }

  return fallback;
}

/**
 * Resolves metadata for a language or filename.
 *
 * @param langOrFilename - A language ID or filename.
 * @returns Matching LanguageMeta or fallback plain text metadata.
 */
export function getLanguageMeta(langOrFilename: string): LanguageMeta {
  const langId = detectLanguage(langOrFilename, langOrFilename.toLowerCase());
  return (
    SUPPORTED_LANGUAGES[langId] || {
      id: langId || 'text',
      label: langId ? langId.toUpperCase() : 'Plain Text',
      extensions: ['.txt'],
      prismGrammar: 'plain',
    }
  );
}

/**
 * Gets a human-readable display label for a language or filename (e.g. 'TypeScript', 'HTML').
 *
 * @param langOrFilename - Language ID or filename.
 * @returns Human-readable label string.
 */
export function getLanguageLabel(langOrFilename: string): string {
  return getLanguageMeta(langOrFilename).label;
}

/**
 * Returns the Prism grammar key corresponding to a given language or filename.
 *
 * @param langOrFilename - Language ID or filename.
 * @returns Prism grammar name (e.g. 'markup', 'typescript', 'javascript', 'python').
 */
export function getPrismGrammarName(langOrFilename: string): string {
  return getLanguageMeta(langOrFilename).prismGrammar;
}

/**
 * Checks whether a given file should be rendered as a Markdown document.
 *
 * @param filename - File name.
 * @param language - Optional explicit language string.
 * @returns True if the file represents Markdown/MDX content.
 */
export function isMarkdownFile(filename?: string, language?: string): boolean {
  if (!filename && !language) return true;
  if (language === 'markdown' || language === 'md') return true;
  if (filename) {
    const lower = normalizeName(filename);
    if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.mdx')) {
      return true;
    }
  }
  return false;
}


