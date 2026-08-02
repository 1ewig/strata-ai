import { tool } from "ai";
import { z } from "zod";

interface TavilyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to perform authenticated calls to Tavily API endpoints.
 * @param endpoint - Tavily API endpoint (e.g. 'search', 'extract').
 * @param payload - Request body sent alongside the API key.
 * @param timeoutMs - Abort the fetch after this many milliseconds.
 */
async function callTavilyApi<T = any>(
  endpoint: string,
  payload: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<TavilyApiResponse<T>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Tavily API key is not configured. Set TAVILY_API_KEY in environment variables.",
    };
  }

  try {
    const response = await fetch(`https://api.tavily.com/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        api_key: apiKey,
        ...payload,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        success: false,
        error: `Tavily API error (${response.status}): ${errText}`,
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
      "Search the web using Tavily for real-time information, current facts, latest news, documentation, or online references. Returns an AI answer summary and ranked results with content snippets (and optional raw page content).",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query string (e.g., 'Next.js 16 features', 'latest tech news'). Be specific for better results."),
      searchDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("advanced")
        .describe("Search depth: 'basic' for quick results, 'advanced' for deeper analysis."),
      topic: z
        .enum(["general", "news"])
        .optional()
        .default("general")
        .describe("Topic focus: 'general' or 'news'."),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(6)
        .describe("Number of search results to return (1-10)."),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, includes full page text for top results (much richer context, higher token usage)."),
      includeImages: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, includes image URLs returned by Tavily."),
      timeRange: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe("Restrict search results to content published within this recent window."),
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
      answer: z.string().optional(),
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            content: z.string(),
            rawContent: z.string().optional(),
            score: z.number().optional(),
            publishedDate: z.string().optional(),
          }),
        )
        .optional(),
      images: z.array(z.string()).optional(),
      error: z.string().optional(),
    }),
    execute: async ({
      query,
      searchDepth = "advanced",
      topic = "general",
      maxResults = 6,
      includeRawContent = false,
      includeImages = false,
      timeRange,
      includeDomains,
      excludeDomains,
    }) => {
      const payload: Record<string, unknown> = {
        query,
        search_depth: searchDepth,
        topic,
        max_results: Math.min(Math.max(maxResults, 1), 10),
        include_answer: true,
        include_raw_content: includeRawContent,
        include_images: includeImages,
      };

      if (timeRange) payload.time_range = timeRange;
      if (includeDomains?.length) payload.include_domains = includeDomains;
      if (excludeDomains?.length) payload.exclude_domains = excludeDomains;

      const apiRes = await callTavilyApi<any>("search", payload, 15000);

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
            rawContent: r.raw_content ? String(r.raw_content).slice(0, 12000) : undefined,
            score: typeof r.score === "number" ? r.score : undefined,
            publishedDate: r.published_date ? String(r.published_date) : undefined,
          }))
        : [];

      const images = Array.isArray(data.images)
        ? data.images.map((img: any) => String(typeof img === "string" ? img : img?.url || ""))
        : undefined;

      return {
        success: true,
        query,
        answer: data.answer ? String(data.answer) : undefined,
        results,
        images: images && images.length > 0 ? images : undefined,
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
      "Extract full, clean Markdown content from specific web page URLs using Tavily Extract API. Call this tool when webSearch snippets are too brief or when complete article/documentation context is required.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe("List of target web page URLs to extract full content from (1-3)."),
      extractDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("advanced")
        .describe("Extraction depth: 'basic' for fast extraction, 'advanced' for JavaScript-rendered sites."),
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
    execute: async ({ urls, extractDepth = "advanced" }) => {
      const apiRes = await callTavilyApi<any>(
        "extract",
        {
          urls,
          extract_depth: extractDepth,
        },
        30000,
      );

      if (!apiRes.success || !apiRes.data) {
        return {
          success: false,
          extracted: [],
          error: apiRes.error || "URL extraction failed",
        };
      }

      const data = apiRes.data;
      const extracted = Array.isArray(data.results)
        ? data.results.map((r: any) => ({
            url: String(r.url || ""),
            title: r.title ? String(r.title) : undefined,
            rawContent: String(r.raw_content || r.content || "").slice(0, 18000),
          }))
        : [];

      const failed = Array.isArray(data.failed_results)
        ? data.failed_results.map((f: any) => ({
            url: String(f.url || ""),
            error: String(f.error || "Failed to extract content"),
          }))
        : [];

      return {
        success: true,
        extracted,
        failed: failed.length > 0 ? failed : undefined,
      };
    },
  });
}
