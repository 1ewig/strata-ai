/**
 * Strips markdown formatting and decodes basic HTML entities.
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown
    .replace(/```[\w-]*\n([\s\S]*?)```/g, '$1') // Code blocks
    .replace(/`([^`]+)`/g, '$1')                // Inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')    // Images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')    // Links
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')          // Headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')          // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2')             // Italic
    .replace(/~~(.*?)~~/g, '$1')                 // Strikethrough
    .replace(/^\s*>\s+/gm, '')                   // Blockquotes
    .replace(/^\s*[-*+]\s+/gm, '')               // Unordered list items
    .replace(/^\s*\d+\.\s+/gm, '')               // Ordered list items
    .replace(/^[-*_]{3,}\s*$/gm, '')             // Horizontal rules
    .replace(/<\/?[^>]+(>|$)/g, '')              // HTML tags
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Basic HTML entity decoding in client browser environment
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    text = doc.body.textContent || text;
  }

  return text;
}

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