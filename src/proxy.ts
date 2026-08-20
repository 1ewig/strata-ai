// Next.js middleware: session-gated routing plus security headers
import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = ["/auth", "/api/auth"];

/**
 * Middleware entry point: lets public routes pass through, redirects or
 * rejects unauthenticated requests, and hardens responses with security headers.
 * @param request - The incoming Next.js request.
 * @returns The response to serve: next(), a JSON 401, or a redirect to /auth.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass public routes, landing page & static assets immediately
  if (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname === "/" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Fast session cookie check (Better Auth handles all cookie name variants)
  const sessionCookie = getSessionCookie(request);

  // 3. No session cookie → enforce authentication
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }
    // Remember where the user was headed so we can return them after sign-in
    const authUrl = request.nextUrl.clone();
    authUrl.pathname = "/auth";
    authUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(authUrl);
  }

  // 4. Security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

/**
 * Route matcher scoping the middleware to the app shell and agent API only.
 */
export const config = {
  matcher: ["/", "/chat-id/:path*", "/api/agent", "/api/agent/:path*"],
};
