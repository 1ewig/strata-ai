import { type NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/utils/supabase/middleware";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase cookies if needed
  const response = createSupabaseClient(request);
  const { pathname } = request.nextUrl;

  // 2. Bypass public auth routes
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    return response;
  }

  // 3. Fast cookie check (hyphen and underscore variants)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session-token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session-token")?.value;

  // 4. If no session cookie present -> enforce authentication
  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    const authUrl = request.nextUrl.clone();
    authUrl.pathname = "/auth";
    authUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(authUrl);
  }

  // 5. Verify token validity via Better Auth API
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized. Session expired or invalid." },
          { status: 401 }
        );
      }
      const authUrl = request.nextUrl.clone();
      authUrl.pathname = "/auth";
      authUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(authUrl);
    }
  } catch (err) {
    console.error("[middleware] Session verification error:", err);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Verification error." },
        { status: 401 }
      );
    }
    const authUrl = request.nextUrl.clone();
    authUrl.pathname = "/auth";
    authUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(authUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets & favicons
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
