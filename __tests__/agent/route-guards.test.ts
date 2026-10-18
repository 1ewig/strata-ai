import { afterEach, describe, it, expect, mock } from "bun:test";
import { MAX_MESSAGE_CHARS } from "@/lib/limits";

/**
 * Direct tests for `withAgentRouteGuards`, focusing on the quota-reservation and
 * refund contract that the HTTP route suites cannot reach (their delegates never
 * throw). Auth, rate-limit, and image/document validators are module-mocked.
 */

const DEFAULT_QUOTA = (_userId?: string) => ({
  allowed: true,
  remaining5h: 9,
  remainingWeek: 49,
  messageLogId: "log-1",
});

const sessionMock = mock(() => ({ user: { id: "user-1" } }));
const rateLimitMock = mock(DEFAULT_QUOTA);
const refundRateLimitMock = mock(() => Promise.resolve(true));

mock.module("@/lib/auth/server", () => ({
  auth: { api: { getSession: sessionMock } },
}));

mock.module("@/lib/server/rate-limit", () => ({
  checkAndIncrementRateLimit: rateLimitMock,
  refundRateLimit: refundRateLimitMock,
}));

// Route guards import the session through `auth.api.getSession`.
const { withAgentRouteGuards, safeAsyncRefundRateLimit } = await import("@/agent/guards/route-guards");

function request(body: unknown): Request {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  sessionMock.mockClear();
  rateLimitMock.mockClear();
  refundRateLimitMock.mockClear();
  rateLimitMock.mockImplementation(DEFAULT_QUOTA);
  refundRateLimitMock.mockImplementation(() => Promise.resolve(true));
});

describe("withAgentRouteGuards quota contract", () => {
  it("refunds the reserved quota row when the delegate throws, then rethrows", async () => {
    const boom = new Error("inference exploded");

    await expect(
      withAgentRouteGuards(request({ messages: [{ role: "user", content: "hi" }] }), async () => {
        throw boom;
      }),
    ).rejects.toThrow("inference exploded");

    expect(refundRateLimitMock).toHaveBeenCalledTimes(1);
    expect(refundRateLimitMock).toHaveBeenCalledWith("log-1");
  });

  it("does not refund when the delegate resolves normally", async () => {
    const res = await withAgentRouteGuards(
      request({ messages: [{ role: "user", content: "hi" }] }),
      async () => new Response("ok", { status: 200 }),
    );

    expect(res.status).toBe(200);
    expect(refundRateLimitMock).not.toHaveBeenCalled();
  });

  it("does not refund when the request is rejected before the quota is reserved", async () => {
    const res = await withAgentRouteGuards(request("not json"), async () => new Response("ok"));
    expect(res.status).toBe(400);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(refundRateLimitMock).not.toHaveBeenCalled();
  });

  it("passes the parsed quota result and request signal through to the delegate", async () => {
    let captured: any;
    await withAgentRouteGuards(
      request({ messages: [{ role: "user", content: "hi" }] }),
      async (ctx) => {
        captured = ctx;
        return new Response("ok");
      },
    );

    expect(captured.rateLimit.messageLogId).toBe("log-1");
    expect(captured.session.user.id).toBe("user-1");
    expect(captured.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects an overlong latest user message before reserving quota", async () => {
    const res = await withAgentRouteGuards(
      request({ messages: [{ role: "user", content: "x".repeat(MAX_MESSAGE_CHARS + 1) }] }),
      async () => new Response("ok"),
    );

    expect(res.status).toBe(400);
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects when the quota is exhausted and surfaces retry headers", async () => {
    rateLimitMock.mockImplementation(
      (() => ({
        allowed: false,
        remaining5h: 0,
        remainingWeek: 42,
        retryAfter: 300,
      })) as never,
    );

    const res = await withAgentRouteGuards(
      request({ messages: [{ role: "user", content: "hi" }] }),
      async () => new Response("ok"),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("300");
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBe("0");
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBe("42");
  });

  it("calls the handler exactly once when quota is allowed", async () => {
    const handler = mock(() => Promise.resolve(new Response("ok")));
    await withAgentRouteGuards(request({ messages: [{ role: "user", content: "hi" }] }), handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("safeAsyncRefundRateLimit", () => {
  it("is a no-op when no message log id is supplied", () => {
    safeAsyncRefundRateLimit(undefined);
    safeAsyncRefundRateLimit("");
    expect(refundRateLimitMock).not.toHaveBeenCalled();
  });

  it("fires the refund without awaiting it", () => {
    safeAsyncRefundRateLimit("log-9");
    expect(refundRateLimitMock).toHaveBeenCalledWith("log-9");
  });

  it("swallows refund failures instead of surfacing an unhandled rejection", async () => {
    refundRateLimitMock.mockImplementation(() => Promise.reject(new Error("db down")));

    expect(() => safeAsyncRefundRateLimit("log-err")).not.toThrow();
    // Let the rejected promise settle before the suite tears down.
    await Promise.resolve();
    await Promise.resolve();
  });
});
