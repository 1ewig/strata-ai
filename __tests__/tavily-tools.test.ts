import { afterEach, describe, it, expect, mock } from "bun:test";
import { createExtractUrlTool, createWebSearchTool } from "@/lib/ai/tools/tavily-tools";

// Harness: Tool.execute is typed for stream-time execution options; tests only
// pass the input argument and treat tool outputs as opaque.
async function runTool(
  tool: { execute?: (input: any, options?: any) => any },
  input: unknown,
): Promise<any> {
  return (tool.execute as (input: unknown, options?: unknown) => Promise<any>)(input, {});
}

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as unknown as Response;
}

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.TAVILY_API_KEY;

function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = mock((url: unknown, init: unknown) =>
    handler(url as string, init as RequestInit),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("webSearch", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey !== undefined) {
      process.env.TAVILY_API_KEY = originalApiKey;
    } else {
      delete process.env.TAVILY_API_KEY;
    }
  });

  it("maps Tavily search results into the output schema", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.query).toBe("next js");
      expect(body.max_results).toBe(5);
      return jsonResponse({
        results: [
          {
            title: "Next.js",
            url: "https://nextjs.org",
            content: "The React framework",
            score: 0.9,
            published_date: "2026-01-01",
          },
        ],
      });
    });
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), {
      query: "next js",
      searchDepth: "basic",
      maxResults: 5,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.query).toBe("next js");
    expect(result.results).toEqual([
      {
        title: "Next.js",
        url: "https://nextjs.org",
        content: "The React framework",
        score: 0.9,
        publishedDate: "2026-01-01",
      },
    ]);
  });

  it("returns a failure when the API key is missing", async () => {
    delete process.env.TAVILY_API_KEY;
    const result = await runTool(createWebSearchTool(), { query: "anything" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not configured");
  });

  it("maps Tavily error responses to readable messages", async () => {
    mockFetch(async () =>
      jsonResponse({ detail: "Invalid API key" }, false, 401),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), { query: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Tavily API key is invalid or missing");
    expect(result.error).toContain("Invalid API key");
  });
});

describe("extractUrl", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey !== undefined) {
      process.env.TAVILY_API_KEY = originalApiKey;
    } else {
      delete process.env.TAVILY_API_KEY;
    }
  });

  it("normalizes protocols before extraction", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const body = JSON.parse(init.body as string) as { urls: string[] };
      expect(body.urls).toEqual([
        "https://example.com/page",
        "https://already.secure.com/x",
      ]);
      return jsonResponse({ results: [], failed_results: [] });
    });
    process.env.TAVILY_API_KEY = "test-key";

    await runTool(createExtractUrlTool(), {
      urls: ["example.com/page", "https://already.secure.com/x"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps extracted content at 18k characters", async () => {
    mockFetch(async () =>
      jsonResponse({ results: [{ url: "https://a.com", raw_content: "x".repeat(20000) }] }),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createExtractUrlTool(), { urls: ["https://a.com"] });
    expect(result.success).toBe(true);
    expect(result.extracted[0].rawContent).toHaveLength(18000);
  });

  it("returns success:false with per-URL errors when every URL fails", async () => {
    mockFetch(async () =>
      jsonResponse({
        results: [],
        failed_results: [{ url: "https://a.com", error: "Forbidden" }],
      }),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createExtractUrlTool(), { urls: ["https://a.com"] });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Extraction failed for all target URLs");
    expect(result.failed?.[0]).toEqual({ url: "https://a.com", error: "Forbidden" });
  });

  it("reports partial failures alongside successes", async () => {
    mockFetch(async () =>
      jsonResponse({
        results: [{ url: "https://a.com", raw_content: "ok content" }],
        failed_results: [{ url: "https://b.com", error: "Timeout" }],
      }),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createExtractUrlTool(), {
      urls: ["https://a.com", "https://b.com"],
    });
    expect(result.success).toBe(true);
    expect(result.extracted).toHaveLength(1);
    expect(result.failed).toEqual([{ url: "https://b.com", error: "Timeout" }]);
  });

  it("rejects a request with no valid URLs before calling the API", async () => {
    const result = await runTool(createExtractUrlTool(), { urls: ["   "] });
    expect(result.success).toBe(false);
    expect(result.error).toContain("No valid URLs");
  });
});