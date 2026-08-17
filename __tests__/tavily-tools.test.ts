import { afterEach, describe, it, expect, mock } from "bun:test";
import { createExtractUrlTool, createWebSearchTool } from "@/lib/ai/tools/tavily-tools";
import { jsonResponse, runTool } from "./helpers";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.TAVILY_API_KEY;

function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = mock((url: unknown, init: unknown) =>
    handler(url as string, init as RequestInit),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey !== undefined) {
    process.env.TAVILY_API_KEY = originalApiKey;
  } else {
    delete process.env.TAVILY_API_KEY;
  }
});

describe("webSearch", () => {

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

  it("maps every known Tavily status code to a friendly prefix", async () => {
    const cases: Array<[number, string, string]> = [
      [400, "Bad params", "Invalid Tavily request parameters"],
      [429, "Too fast", "Tavily rate limit exceeded"],
      [432, "Plan full", "Tavily plan usage limit reached"],
      [433, "Pay as you go", "Tavily pay-as-you-go limit reached"],
      [500, "Boom", "Tavily API error (500)"],
    ];
    for (const [status, detail, expected] of cases) {
      mockFetch(async () => jsonResponse({ detail }, false, status));
      process.env.TAVILY_API_KEY = "test-key";
      const result = await runTool(createWebSearchTool(), { query: "x" });
      expect(result.success).toBe(false);
      expect(result.error).toContain(expected);
    }
  });

  it("extracts error details from nested and plain error shapes", async () => {
    const bodies: unknown[] = [
      { detail: { error: "nested detail" } },
      { error: { message: "nested message" } },
      { message: "plain message" },
    ];
    for (const body of bodies) {
      mockFetch(async () => jsonResponse(body, false, 401));
      process.env.TAVILY_API_KEY = "test-key";
      const result = await runTool(createWebSearchTool(), { query: "x" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Tavily API key is invalid or missing");
    }
  });

  it("falls back to the raw body text for non-JSON error responses", async () => {
    mockFetch(async () => {
      const res = jsonResponse({}, false, 502);
      (res as { text: () => Promise<string> }).text = async () => "Bad Gateway";
      (res as { json: () => Promise<unknown> }).json = async () => {
        throw new SyntaxError("Unexpected token B");
      };
      return res;
    });
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), { query: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Bad Gateway");
  });

  it("reports network failures with a readable message", async () => {
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), { query: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error calling Tavily API");
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("forwards optional search parameters to the API", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.time_range).toBe("week");
      expect(body.days).toBe(7);
      expect(body.include_domains).toEqual(["docs.nextjs.org"]);
      expect(body.exclude_domains).toEqual(["spam.example"]);
      return jsonResponse({ results: [] });
    });
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), {
      query: "next js",
      timeRange: "week",
      days: 7,
      includeDomains: ["docs.nextjs.org"],
      excludeDomains: ["spam.example"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("clamps maxResults into the supported 1-10 range", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const body = JSON.parse(init.body as string) as { max_results: number };
      expect(body.max_results).toBe(10);
      return jsonResponse({ results: [] });
    });
    process.env.TAVILY_API_KEY = "test-key";

    await runTool(createWebSearchTool(), { query: "x", maxResults: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps search results with missing or malformed fields defensively", async () => {
    mockFetch(async () =>
      jsonResponse({
        results: [
          { title: "Odd", url: "https://odd.example", content: "body", score: "0.9" },
          {},
        ],
      }),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createWebSearchTool(), { query: "x" });
    expect(result.success).toBe(true);
    expect(result.results).toEqual([
      { title: "Odd", url: "https://odd.example", content: "body" },
      { title: "", url: "", content: "" },
    ]);
  });
});

describe("extractUrl", () => {
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

  it("forwards extraction options to the API", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.extract_depth).toBe("basic");
      expect(body.format).toBe("text");
      expect(body.query).toBe("installation");
      expect(body.chunks_per_source).toBe(3);
      return jsonResponse({ results: [], failed_results: [] });
    });
    process.env.TAVILY_API_KEY = "test-key";

    await runTool(createExtractUrlTool(), {
      urls: ["https://a.com"],
      extractDepth: "basic",
      format: "text",
      query: "installation",
      chunksPerSource: 3,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the no-content placeholder for empty pages", async () => {
    mockFetch(async () =>
      jsonResponse({ results: [{ url: "https://a.com", raw_content: "" }] }),
    );
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createExtractUrlTool(), { urls: ["https://a.com"] });
    expect(result.success).toBe(true);
    expect(result.extracted[0].rawContent).toContain("No extractable text content found");
  });

  it("reports a failure when the API call itself errors", async () => {
    mockFetch(async () => jsonResponse({ detail: "rate limited" }, false, 429));
    process.env.TAVILY_API_KEY = "test-key";

    const result = await runTool(createExtractUrlTool(), { urls: ["https://a.com"] });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Tavily rate limit exceeded");
  });
});