import { type NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase cookies if needed
  const response = createSupabaseClient(request);
  const { pathname } = request.nextUrl;

  // 2. Bypass public auth routes & static assets
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth")
  ) {
    return response;
  }

  // 3. Fast session cookie check (all Better Auth cookie name variants)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session-token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session-token")?.value;

  // 4. If no active session token -> enforce authentication
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
