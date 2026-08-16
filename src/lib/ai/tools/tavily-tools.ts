import { tool } from "ai";
import { z } from "zod";

interface TavilyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Reads a Tavily error payload and returns a readable message.
 * Tavily returns errors in multiple shapes (detail.error, error.message, detail string, message).
 * @param status - HTTP status code of the failed response.
 * @param bodyText - Raw response body text (already consumed).
 * @returns A readable, status-aware error message.
 */
function extractTavilyErrorMessage(status: number, bodyText: string): string {
  const friendly: Record<number, string> = {
    400: "Invalid Tavily request parameters.",
    401: "Tavily API key is invalid or missing.",
    429: "Tavily rate limit exceeded; try again shortly.",
    432: "Tavily plan usage limit reached; upgrade or adjust settings.",
    433: "Tavily pay-as-you-go limit reached.",
  };
  const known = friendly[status];

  let detail = "";
  if (bodyText) {
    try {
      const json = JSON.parse(bodyText);
      const err =
        (typeof json?.detail === "string" ? json.detail : json?.detail?.error) ||
        (typeof json?.error === "string" ? json.error : json?.error?.message) ||
        json?.message;
      if (typeof err === "string" && err) detail = err;
    } catch {
      detail = bodyText;
    }
  }

  if (known && detail) return `${known} ${detail}`;
  if (known) return known;
  return `Tavily API error (${status})${detail ? `: ${detail}` : ""}`;
}

/**
 * Normalizes user/agent supplied URLs to ensure a valid http/https protocol prefix.
 * @param rawUrl - Input URL string.
 * @returns Clean normalized URL with protocol.
 */
function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Helper to perform authenticated calls to Tavily API endpoints.
 * Authenticates via the Authorization Bearer header (the api_key body field is deprecated).
 * @param endpoint - Tavily API endpoint (e.g. 'search', 'extract').
 * @param payload - Request body sent alongside the API key.
 * @param timeoutMs - Abort the fetch after this many milliseconds.
 */
async function callTavilyApi<T = any>(
  endpoint: string,
  payload: Record<string, unknown>,
  timeoutMs = 30000,
  signal?: AbortSignal,
): Promise<TavilyApiResponse<T>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Tavily API key is not configured. Set TAVILY_API_KEY in environment variables.",
    };
  }

  try {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const response = await fetch(`https://api.tavily.com/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: combinedSignal,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        success: false,
        error: extractTavilyErrorMessage(response.status, errText),
      };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error calling Tavily API: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Creates the webSearch tool that queries the Tavily API for real-time information.
 * @returns An AI SDK tool for web search, or a failure result if TAVILY_API_KEY is unset.
 */
export function createWebSearchTool() {
  return tool({
    description:
      "Search the web using Tavily for real-time information, current facts, latest news, documentation, or online references. Returns ranked results with title, URL, published date, and content snippets.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query string (e.g., 'Next.js 16 features', 'latest tech news'). Be specific for better results."),
      searchDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("basic")
        .describe(
          "Search depth: 'basic' for fast lookups (1 credit); 'advanced' for comprehensive multi-source research (2 credits).",
        ),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Topic focus: 'general', 'news', or 'finance'."),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(6)
        .describe("Number of search results to return (1-10)."),
      timeRange: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe("Restrict search results to content published within this recent window."),
      days: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe("Restrict search results to the last N days (e.g. 7 for past week, 30 for past month)."),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe("Only include results from these specific domains (e.g. ['docs.nextjs.org', 'github.com'])."),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe("Exclude results from these specific domains."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      query: z.string(),
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            content: z.string(),
            score: z.number().optional(),
            publishedDate: z.string().optional(),
          }),
        )
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({
      query,
      searchDepth = "basic",
      topic = "general",
      maxResults = 6,
      timeRange,
      days,
      includeDomains,
      excludeDomains,
    }) => {
      const payload: Record<string, unknown> = {
        query,
        search_depth: searchDepth,
        topic,
        max_results: Math.min(Math.max(maxResults, 1), 10),
      };

      if (timeRange) payload.time_range = timeRange;
      if (days != null) payload.days = days;
      if (includeDomains?.length) payload.include_domains = includeDomains;
      if (excludeDomains?.length) payload.exclude_domains = excludeDomains;

      const apiRes = await callTavilyApi<any>("search", payload, 30000);

      if (!apiRes.success || !apiRes.data) {
        return {
          success: false,
          query,
          error: apiRes.error || "Web search failed",
        };
      }

      const data = apiRes.data;
      const results = Array.isArray(data.results)
        ? data.results.map((r: any) => ({
            title: String(r.title || ""),
            url: String(r.url || ""),
            content: String(r.content || ""),
            score: typeof r.score === "number" ? r.score : undefined,
            publishedDate: r.published_date ? String(r.published_date) : undefined,
          }))
        : [];

      return {
        success: true,
        query,
        results,
      };
    },
  });
}

/**
 * Creates the extractUrl tool that pulls clean Markdown content from web pages via Tavily.
 * @returns An AI SDK tool for URL content extraction, or a failure result if TAVILY_API_KEY is unset.
 */
export function createExtractUrlTool() {
  return tool({
    description:
      "Extract full, clean Markdown content from specific web page URLs using Tavily Extract API. Call this tool when webSearch snippets are too brief or when complete article/documentation context is required. Supports query intent to extract and rerank relevant sections of large pages.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe("List of target web page URLs to extract content from (1-3). Protocols are normalized automatically."),
      extractDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("advanced")
        .describe("Extraction depth: 'basic' for fast standard extraction, 'advanced' for JavaScript-rendered sites and complex tables."),
      query: z
        .string()
        .optional()
        .describe("Optional search query to filter and rerank relevant sections from large documents instead of extracting the entire page."),
      chunksPerSource: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("When query is provided, limits the maximum number of relevant snippets returned per source URL (1-5)."),
      format: z
        .enum(["markdown", "text"])
        .optional()
        .default("markdown")
        .describe("Format of extracted content: 'markdown' (default) or 'text'."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      extracted: z.array(
        z.object({
          url: z.string(),
          title: z.string().optional(),
          rawContent: z.string(),
        }),
      ),
      failed: z
        .array(
          z.object({
            url: z.string(),
            error: z.string(),
          }),
        )
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({
      urls,
      extractDepth = "advanced",
      query,
      chunksPerSource,
      format = "markdown",
    }) => {
      const normalizedUrls = urls.map(normalizeUrl).filter(Boolean);
      if (normalizedUrls.length === 0) {
        return {
          success: false,
          extracted: [],
          error: "No valid URLs provided for extraction.",
        };
      }

      const payload: Record<string, unknown> = {
        urls: normalizedUrls,
        extract_depth: extractDepth,
        format,
      };

      if (query) payload.query = query;
      if (chunksPerSource != null) payload.chunks_per_source = chunksPerSource;

      const apiRes = await callTavilyApi<any>("extract", payload, 45000);

      if (!apiRes.success || !apiRes.data) {
        return {
          success: false,
          extracted: [],
          error: apiRes.error || "URL extraction failed",
        };
      }

      const data = apiRes.data;
      const extracted = Array.isArray(data.results)
        ? data.results.map((r: any) => {
            const raw = String(r.raw_content || r.markdown || r.content || r.text || "").trim();
            const content =
              raw.length > 0
                ? raw.slice(0, 18000)
                : "[No extractable text content found on this page. The site may be blocking scrapers, behind a paywall, or requiring dynamic rendering. Try extractDepth: 'advanced' or search for alternative sources.]";
            return {
              url: String(r.url || ""),
              title: r.title ? String(r.title) : undefined,
              rawContent: content,
            };
          })
        : [];

      const failed: Array<{ url: string; error: string }> = Array.isArray(data.failed_results)
        ? data.failed_results.map((f: any) => ({
            url: String(f.url || ""),
            error: String(f.error || "Failed to extract content"),
          }))
        : [];

      // If all requested URLs failed and none were successfully extracted, return success: false with clear failure details.
      if (extracted.length === 0 && failed.length > 0) {
        return {
          success: false,
          extracted: [],
          failed,
          error: `Extraction failed for all target URLs: ${failed.map((f) => `${f.url} (${f.error})`).join(", ")}`,
        };
      }

      return {
        success: true,
        extracted,
        failed: failed.length > 0 ? failed : undefined,
      };
    },
  });
}
