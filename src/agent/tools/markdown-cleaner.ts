/**
 * Lightweight, deterministic markdown and web content cleaner for tool outputs.
 * Strips unreadable images, HTML comments, repetitive link noise, and compresses blank line cascades.
 * Preserves headings, code blocks, lists, tables, and prose.
 *
 * @param raw - Raw markdown or text string from external web scrapers.
 * @returns Cleaned markdown string.
 */
export function cleanExtractedMarkdown(raw: string): string {
  return raw
    // Remove markdown image embeds: ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Collapse 3 or more consecutive newlines into 2
    .replace(/\n{3,}/g, "\n\n")
    // Trim trailing spaces and tabs on lines
    .replace(/[ \t]+$/gm, "")
    // Strip isolated divider or bullet noise lines
    .replace(/^\s*[-•|]\s*$/gm, "")
    .trim();
}

/**
 * Truncates search snippet text cleanly at a word boundary to avoid trailing fragmented words.
 * Guarantees the resulting string (including trailing ellipsis) does not exceed maxChars.
 *
 * @param text - The raw snippet text.
 * @param maxChars - The maximum character limit.
 * @returns Snippet truncated at word boundary with trailing ellipsis if truncated.
 */
export function truncateSnippetAtWordBoundary(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  if (maxChars <= 3) return "...".slice(0, maxChars);
  const slice = trimmed.slice(0, maxChars - 3);
  const wordBoundary = slice.replace(/\s+\S*$/, "");
  const base = wordBoundary.length > 0 ? wordBoundary : slice;
  return `${base}...`;
}
