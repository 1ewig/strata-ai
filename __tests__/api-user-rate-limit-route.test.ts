import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * GET /api/user/rate-limit tests. Auth and the quota snapshot are module-mocked
 * so the route's HTTP shell (auth gate, 200 body, 500 degradation) is the unit
 * under test.
 */

const sessionMock = mock((_opts?: unknown) => ({ user: { id: "user-1" } }));
const statusMock = mock((_userId?: string) => ({
  allowed: true,
  remaining5h: 7,
  remainingWeek: 43,
}));

mock.module("@/lib/auth/server", () => ({
  auth: { api: { getSession: sessionMock } },
}));

mock.module("@/lib/server/rate-limit", () => ({
  getRateLimitStatus: statusMock,
}));

const { GET } = await import("@/app/api/user/rate-limit/route");

const get = () => GET(new Request("http://localhost/api/user/rate-limit"));

afterEach(() => {
  sessionMock.mockClear();
  statusMock.mockClear();
  sessionMock.mockImplementation(() => ({ user: { id: "user-1" } }));
  statusMock.mockImplementation(() => ({ allowed: true, remaining5h: 7, remainingWeek: 43 }));
});

describe("GET /api/user/rate-limit", () => {
  it("returns 401 without querying quota for an unauthenticated request", async () => {
    sessionMock.mockImplementation(() => undefined as unknown as { user: { id: string } });

    const res = await get();
    expect(res.status).toBe(401);
    expect(statusMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the quota snapshot for the authenticated user", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: true, remaining5h: 7, remainingWeek: 43 });
    expect(statusMock).toHaveBeenCalledWith("user-1");
  });

  it("reports an exhausted quota snapshot verbatim", async () => {
    statusMock.mockImplementation(() => ({ allowed: false, remaining5h: 0, remainingWeek: 0, retryAfter: 90 }));

    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: false, remaining5h: 0, remainingWeek: 0, retryAfter: 90 });
  });

  it("degrades to a 500 when the quota lookup fails", async () => {
    statusMock.mockImplementation(() => {
      throw new Error("db down");
    });

    const res = await get();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch rate limit status" });
  });

  it("never allows caching on any branch", async () => {
    const ok = await get();
    expect(ok.headers.get("Cache-Control")).toContain("no-store");
    expect(ok.headers.get("Content-Type")).toContain("application/json");

    sessionMock.mockImplementation(() => undefined as unknown as { user: { id: string } });
    const unauthorized = await get();
    expect(unauthorized.headers.get("Cache-Control")).toContain("no-store");
  });
});
