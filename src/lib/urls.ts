/**
 * Pure URL and domain extraction utilities for web search and fetch citations.
 */

export interface WebSource {
  title: string;
  url: string;
  favicon?: string;
}

/**
 * Derives a domain-based fallback favicon URL via Google S2 service.
 * @param urlStr - Target web URL
 * @param size - Pixel icon size (default 32)
 */
export function getGoogleFaviconUrl(urlStr: string, size = 32): string {
  try {
    const domain = new URL(urlStr).hostname;
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return '';
  }
}

/**
 * Extracts a clean, human-readable domain name (stripping 'www.').
 * @param urlStr - Target web URL
 */
export function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr.replace(/^https?:\/\//i, '').split('/')[0] || urlStr;
  }
}

/**
 * Extracts all unique cited web sources from an assistant message's tool parts.
 * Deduplicates results by normalized lowercase URL.
 *
 * @param message - Assistant message with optional parts array
 * @returns Array of unique WebSource objects
 */
export function extractWebSourcesFromMessage(message: { parts?: any[] }): WebSource[] {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return [];
  }

  const sourcesMap = new Map<string, WebSource>();

  for (const part of message.parts) {
    if (!part || typeof part !== 'object') continue;

    const inv = (part.toolInvocation && typeof part.toolInvocation === 'object'
      ? part.toolInvocation
      : part) as Record<string, unknown>;

    const toolName =
      (typeof inv.toolName === 'string' && inv.toolName) ||
      (typeof inv.name === 'string' && inv.name) ||
      (typeof part.toolName === 'string' && part.toolName) ||
      (typeof part.type === 'string' && part.type.startsWith('tool-') ? part.type.slice(5) : '');

    const normalizedName = toolName.toLowerCase().replace(/[-_]/g, '');

    const result = (inv.result ?? inv.output ?? part.result ?? part.output) as Record<string, unknown> | undefined;
    if (!result || typeof result !== 'object') continue;

    // Handle webSearch results
    if (normalizedName === 'websearch' || normalizedName === 'search' || normalizedName === 'tavilysearch') {
      const results = Array.isArray(result.results) ? result.results : [];
      for (const item of results) {
        if (item && typeof item.url === 'string' && item.url.trim()) {
          const rawUrl = item.url.trim();
          const key = rawUrl.toLowerCase();
          if (!sourcesMap.has(key)) {
            sourcesMap.set(key, {
              title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : extractDomain(rawUrl),
              url: rawUrl,
              favicon: typeof item.favicon === 'string' && item.favicon ? item.favicon : undefined,
            });
          }
        }
      }
    }

    // Handle extractUrl results
    if (normalizedName === 'extracturl' || normalizedName === 'extract' || normalizedName === 'tavilyextract') {
      const extracted = Array.isArray(result.extracted) ? result.extracted : [];
      for (const item of extracted) {
        if (item && typeof item.url === 'string' && item.url.trim()) {
          const rawUrl = item.url.trim();
          const key = rawUrl.toLowerCase();
          if (!sourcesMap.has(key)) {
            sourcesMap.set(key, {
              title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : extractDomain(rawUrl),
              url: rawUrl,
              favicon: typeof item.favicon === 'string' && item.favicon ? item.favicon : undefined,
            });
          }
        }
      }
    }
  }

  return Array.from(sourcesMap.values());
}
