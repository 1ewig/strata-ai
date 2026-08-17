import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * POST /api/agent/compact guard-and-delegation tests. Auth, rate-limit, and
 * the compaction runner are module-mocked; the route's HTTP shell is the unit
 * under test.
 */

const DEFAULT_SESSION = (): { user: { id: string } } | null => null;
const DEFAULT_QUOTA = (_userId?: string) => ({ allowed: true, remaining5h: 10, remainingWeek: 50 });
const DEFAULT_RESPONSE = (_opts?: any) => new Response("streamed", { status: 200 });

const sessionMock = mock(DEFAULT_SESSION);
const rateLimitMock = mock(DEFAULT_QUOTA);
const runCompactionResponseMock = mock(DEFAULT_RESPONSE);

mock.module("@/lib/auth", () => ({
  auth: { api: { getSession: sessionMock } },
}));

mock.module("@/lib/rate-limit", () => ({
  checkAndIncrementRateLimit: rateLimitMock,
}));

mock.module("@/lib/ai/agent-runner", () => ({
  runCompactionResponse: runCompactionResponseMock,
}));

const { POST } = await import("@/app/api/agent/compact/route");

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/agent/compact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  runCompactionResponseMock.mockClear();
  sessionMock.mockImplementation(DEFAULT_SESSION);
  rateLimitMock.mockImplementation(DEFAULT_QUOTA);
  runCompactionResponseMock.mockImplementation(DEFAULT_RESPONSE);
});

describe("POST /api/agent/compact", () => {
  it("rejects unauthenticated requests before touching the quota", async () => {
    const res = await post({ messages: [] });
    expect(res.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(runCompactionResponseMock).not.toHaveBeenCalled();
  });

  it("returns a 429 with rate-limit headers when the quota is exhausted", async () => {
    withSession();
    withQuota(false, 0, 40, 90);

    const res = await post({ messages: [] });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("90");
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBe("0");
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBe("40");
    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded");
    expect(runCompactionResponseMock).not.toHaveBeenCalled();
  });

  it("returns 400 with flattened details for malformed JSON", async () => {
    withSession();
    const res = await post("not json");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(runCompactionResponseMock).not.toHaveBeenCalled();
  });

  it("returns 400 with flattened details for schema failures", async () => {
    withSession();
    const res = await post({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
  });

  it("prunes history at the latest compaction summary before delegating", async () => {
    withSession();
    withQuota(true, 7, 44);

    const res = await post({
      messages: [
        { id: "m1", role: "user", content: "old" },
        { id: "m2", role: "assistant", content: "summary", metadata: { isCompactedSummary: true } },
        { id: "m3", role: "user", content: "more" },
      ],
      files: [{ id: "f1", name: "a.md", content: "x", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
    });
    expect(res.status).toBe(200);

    const args = runCompactionResponseMock.mock.calls[0][0];
    expect(args.messages.map((m: { id: string }) => m.id)).toEqual(["m2", "m3"]);
    expect(args.files).toHaveLength(1);
    expect(args.remaining5h).toBe(7);
    expect(args.remainingWeek).toBe(44);
    expect(args.signal).toBeInstanceOf(AbortSignal);
  });
});