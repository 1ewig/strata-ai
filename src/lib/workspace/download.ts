import { WorkspaceFile } from '@/lib/db/schemas';
import { SUPPORTED_LANGUAGES, getLanguageMeta, detectLanguage } from '@/lib/code/languages';

/** Set of all known file extensions from supported languages */
const KNOWN_EXTENSIONS = new Set<string>(
  Object.values(SUPPORTED_LANGUAGES).flatMap((lang) =>
    lang.extensions.map((ext) => ext.toLowerCase()),
  ),
);

/**
 * Resolves a safe, properly-extended filename for downloading a workspace file.
 * If the filename lacks an extension, it derives the canonical extension from
 * the file's language or detected language.
 */
export function resolveDownloadFilename(filename?: string, language?: string): string {
  const clean = (filename || '').trim();
  const base = clean || 'untitled';

  // Preserve well-known standalone filenames
  if (base.toLowerCase() === 'dockerfile' || base.toLowerCase() === 'makefile') {
    return base;
  }

  // Preserve dotfiles like .env or .gitignore
  if (base.startsWith('.') && base.length > 1 && !base.slice(1).includes('.')) {
    return base;
  }

  const lastDot = base.lastIndexOf('.');
  if (lastDot > 0 && lastDot < base.length - 1) {
    const existingExt = base.slice(lastDot).toLowerCase();
    if (KNOWN_EXTENSIONS.has(existingExt) || /^\.[a-z0-9]{1,4}$/i.test(existingExt)) {
      return base;
    }
  }

  // Derive canonical extension from language or fallback
  const resolvedLang = language || detectLanguage(base, 'markdown');
  const meta = getLanguageMeta(resolvedLang);
  const defaultExt = meta.extensions[0] || '.txt';
  const ext = defaultExt.startsWith('.') ? defaultExt : `.${defaultExt}`;

  return `${base.replace(/\.+$/, '')}${ext}`;
}

/**
 * Initiates a browser file download for a workspace file.
 */
export function downloadWorkspaceFile(
  file: Pick<WorkspaceFile, 'name' | 'content' | 'language'>,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const filename = resolveDownloadFilename(file.name, file.language);
  const content = file.content ?? '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
