/**
 * Utility to convert markdown text to clean, readable plain text.
 * Strips formatting markup, decodes HTML entities, and formats tables/math/lists
 * for seamless copy-paste into plain-text editors, emails, or chat.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  return (
    markdown
      // 1. Normalize line endings
      .replace(/\r\n?/g, '\n')

      // 2. Remove raw HTML tags FIRST
      .replace(/<[^>]*>/g, '')

      // 3. Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')

      // 4. Code blocks & inline code (preserve content before math/formatting)
      .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
      .replace(/`([^`]+)`/g, '$1')

      // 5. Clean LaTeX / KaTeX (block + inline)
      .replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, '$1')
      .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
      .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
      .replace(/\\\$/g, '$') // Unescape literal currency (\$10 -> $10)
      .replace(/\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g, '$1') // Tight inline math

      // 6. Images & links -> label
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

      // 7. Headers (ATX & Setext)
      .replace(/^#{1,6}\s+(.+)$/gm, '$1')
      .replace(/^[=-]{2,}$/gm, '')

      // 8. Horizontal rules
      .replace(/^(?:[-*_]\s*){3,}$/gm, '')

      // 9. Table formatting: remove separator line, clean leading/trailing pipes
      .replace(/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/gm, '')
      .replace(/^\|\s*(.+?)\s*\|$/gm, '$1')

      // 10. Bold, italics, strikethrough
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')

      // 11. Blockquotes
      .replace(/^\s*>+\s?/gm, '')

      // 12. Task lists before unordered lists (preserves [ ] and [x])
      .replace(/^\s*[-*+]\s+\[([ xX])\]\s+/gm, '[$1] ')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')

      // 13. Clean trailing whitespace + collapse blank lines
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Backwards-compatible alias for existing callers. */
export const stripMarkdown = markdownToPlainText;

/**
 * Robust clipboard utility with legacy execCommand fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Proceed to fallback if permission denied or non-active document
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.top = `${window.scrollY || document.documentElement.scrollTop}px`;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}