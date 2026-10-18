import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * Proxy middleware tests. `getSessionCookie` is mocked so the session-gate
 * branches are reachable, and `NextRequest` is constructed from real
 * `next/server` so routing behavior is exercised for real.
 */

const getSessionCookieMock = mock((_req: unknown) => ({ value: "session-token" } as { value: string } | null));

mock.module("better-auth/cookies", () => ({
  getSessionCookie: getSessionCookieMock,
}));

const { NextRequest } = await import("next/server");
const { proxy, config } = await import("@/proxy");

/** Builds a NextRequest from a plain URL string. */
function nextRequestFor(url: string): any {
  return new NextRequest(new Request(url));
}

afterEach(() => {
  getSessionCookieMock.mockClear();
  getSessionCookieMock.mockImplementation(() => ({ value: "session-token" }));
});

describe("proxy public routes", () => {
  it("lets the sign-in and auth API routes through without a cookie check", async () => {
    getSessionCookieMock.mockImplementation(() => null);
    for (const path of ["/auth", "/auth/signin", "/api/auth/callback/google"]) {
      const res = await proxy(nextRequestFor(`http://localhost${path}`));
      expect(res.headers.get("location")).toBeNull();
      expect(res.status).toBe(200);
    }
    expect(getSessionCookieMock).not.toHaveBeenCalled();
  });

  it("lets the landing page and static assets through", async () => {
    getSessionCookieMock.mockImplementation(() => null);
    for (const path of ["/", "/_next/static/chunk.js", "/favicon.ico"]) {
      const res = await proxy(nextRequestFor(`http://localhost${path}`));
      expect(res.status).toBe(200);
    }
  });
});

describe("proxy unauthenticated enforcement", () => {
  it("returns a JSON 401 for API requests with no session cookie", async () => {
    getSessionCookieMock.mockImplementation(() => null);
    const res = await proxy(nextRequestFor("http://localhost/api/agent"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized. Please sign in." });
  });

  it("redirects page requests to /auth with a callbackUrl", async () => {
    getSessionCookieMock.mockImplementation(() => null);
    const res = await proxy(nextRequestFor("http://localhost/settings"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth");
    expect(location.searchParams.get("callbackUrl")).toBe("/settings");
  });

  it("omits callbackUrl on private chat routes so a chat id is never inherited", async () => {
    getSessionCookieMock.mockImplementation(() => null);
    const res = await proxy(nextRequestFor("http://localhost/chat-id/secret-chat-123"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth");
    expect(location.searchParams.get("callbackUrl")).toBeNull();
    expect(res.headers.get("location")).not.toContain("secret-chat-123");
  });
});

describe("proxy authenticated requests", () => {
  it("passes authenticated requests through with security headers", async () => {
    const res = await proxy(nextRequestFor("http://localhost/chat-id/abc"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("applies the same security headers to the agent API", async () => {
    const res = await proxy(nextRequestFor("http://localhost/api/agent"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("proxy matcher configuration", () => {
  it("scopes the middleware to the app shell and agent API", () => {
    expect(config.matcher).toEqual(["/", "/chat-id/:path*", "/api/agent", "/api/agent/:path*"]);
  });
});
