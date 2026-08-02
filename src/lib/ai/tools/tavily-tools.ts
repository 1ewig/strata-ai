import { tool } from "ai";
import { z } from "zod";

interface TavilyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to perform authenticated calls to Tavily API endpoints.
 */
async function callTavilyApi<T = any>(
  endpoint: string,
  payload: Record<string, unknown>,
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
      "Search the web using Tavily for real-time information, current facts, latest news, documentation, or online references.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query string (e.g., 'Next.js 16 features', 'latest tech news')."),
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
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (1-10)."),
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
            score: z.number().optional(),
            publishedDate: z.string().optional(),
          }),
        )
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({ query, searchDepth, topic, maxResults }) => {
      const apiRes = await callTavilyApi<any>("search", {
        query,
        search_depth: searchDepth || "advanced",
        topic: topic || "general",
        max_results: Math.min(Math.max(maxResults || 5, 1), 10),
        include_answer: true,
      });

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
        answer: data.answer ? String(data.answer) : undefined,
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
      "Extract full, clean Markdown content from specific web page URLs using Tavily Extract API. Call this tool when webSearch snippet results are too brief or thin.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe("List of target web page URLs to extract full content from."),
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
    execute: async ({ urls, extractDepth }) => {
      const apiRes = await callTavilyApi<any>("extract", {
        urls,
        extract_depth: extractDepth || "advanced",
      });

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
            rawContent: String(r.raw_content || r.content || "").slice(0, 10000),
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
