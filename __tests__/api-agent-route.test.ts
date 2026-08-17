import { afterEach, describe, it, expect, mock } from "bun:test";
import { MAX_MESSAGE_CHARS } from "@/lib/limits";

/**
 * POST /api/agent guard-and-delegation tests. All heavyweight dependencies
 * (auth, rate-limit, agent-runner) are module-mocked so the route's HTTP
 * shell can be exercised without a database, provider keys, or streaming.
 */

const DEFAULT_SESSION = (): { user: { id: string } } | null => null;
const DEFAULT_QUOTA = (_userId?: string) => ({ allowed: true, remaining5h: 10, remainingWeek: 50 });
const DEFAULT_RESPONSE = (_opts?: any) => new Response("streamed", { status: 200 });

const sessionMock = mock(DEFAULT_SESSION);
const rateLimitMock = mock(DEFAULT_QUOTA);
const runAgentResponseMock = mock(DEFAULT_RESPONSE);

mock.module("@/lib/auth", () => ({
  auth: { api: { getSession: sessionMock } },
}));

mock.module("@/lib/rate-limit", () => ({
  checkAndIncrementRateLimit: rateLimitMock,
}));

mock.module("@/lib/ai/agent-runner", () => ({
  runAgentResponse: runAgentResponseMock,
}));

const { POST } = await import("@/app/api/agent/route");

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function withSession(userId = "user-1") {
  sessionMock.mockImplementation(() => ({ user: { id: userId } }));
}

function withQuota(allowed: boolean, remaining5h = 0, remainingWeek = 0, retryAfter?: number) {
  rateLimitMock.mockImplementation(() => ({ allowed, remaining5h, remainingWeek, retryAfter }));
}

afterEach(() => {
  sessionMock.mockClear();
  rateLimitMock.mockClear();
  runAgentResponseMock.mockClear();
  sessionMock.mockImplementation(DEFAULT_SESSION);
  rateLimitMock.mockImplementation(DEFAULT_QUOTA);
  runAgentResponseMock.mockImplementation(DEFAULT_RESPONSE);
});

describe("POST /api/agent", () => {
  it("rejects unauthenticated requests before touching the quota", async () => {
    const res = await post({ messages: [] });
    expect(res.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(runAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns a 429 with rate-limit headers when the quota is exhausted", async () => {
    withSession();
    withQuota(false, 0, 40, 120);

    const res = await post({ messages: [] });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBe("0");
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBe("40");
    expect(res.headers.get("X-RateLimit-Retry-After")).toBe("120");
    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfter).toBe(120);
    expect(runAgentResponseMock).not.toHaveBeenCalled();
  });

  it("enforces the quota against the authenticated user id", async () => {
    withSession("user-42");
    const res = await post({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(200);
    expect(rateLimitMock).toHaveBeenCalledWith("user-42");
  });

  it("does not consume quota for a malformed body", async () => {
    withSession();
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect(rateLimitMock).toHaveBeenCalledTimes(1);
    expect(runAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns flattened zod details for schema failures", async () => {
    withSession();
    const res = await post({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
  });

  it("rejects an overlong latest user message", async () => {
    withSession();
    const res = await post({
      messages: [{ role: "user", content: "x".repeat(MAX_MESSAGE_CHARS + 1) }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("maximum character limit");
    expect(runAgentResponseMock).not.toHaveBeenCalled();
  });

  it("allows an assistant-tail message of any length", async () => {
    withSession();
    const res = await post({
      messages: [{ role: "assistant", content: "x".repeat(MAX_MESSAGE_CHARS + 1) }],
    });
    expect(res.status).toBe(200);
  });

  it("prunes history at the latest compaction summary before delegating", async () => {
    withSession();
    withQuota(true, 7, 44);
    const messages = [
      { id: "m1", role: "user", content: "old" },
      { id: "m2", role: "assistant", content: "summary", metadata: { isCompactedSummary: true } },
      { id: "m3", role: "user", content: "new question" },
    ];
    const res = await post({ messages });
    expect(res.status).toBe(200);

    const args = runAgentResponseMock.mock.calls[0][0];
    expect(args.messages.map((m: { id: string }) => m.id)).toEqual(["m2", "m3"]);
  });

  it("clamps maxSteps into the 1-30 range and forwards request fields", async () => {
    withSession();
    withQuota(true, 3, 41);
    const res = await post({
      messages: [{ role: "user", content: "hi" }],
      files: [{ id: "f1", name: "a.md", content: "x", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
      model: "gemma-4-31b-it",
      thinkingLevel: "high",
      maxSteps: 99,
    });
    expect(res.status).toBe(200);

    const args = runAgentResponseMock.mock.calls[0][0];
    expect(args.maxSteps).toBe(30);
    expect(args.modelId).toBe("gemma-4-31b-it");
    expect(args.thinkingLevel).toBe("high");
    expect(args.remaining5h).toBe(3);
    expect(args.remainingWeek).toBe(41);
    expect(args.workspace.getCurrentFiles()).toHaveLength(1);
    expect(args.signal).toBeInstanceOf(AbortSignal);
  });

  it("defaults maxSteps to 25 when omitted", async () => {
    withSession();
    const res = await post({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(200);
    expect(runAgentResponseMock.mock.calls[0][0].maxSteps).toBe(25);
  });
});