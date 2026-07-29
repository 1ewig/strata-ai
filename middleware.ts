import { type NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase cookies if needed
  const response = createSupabaseClient(request);

  const { pathname } = request.nextUrl;

  // 2. Allow public routes & static assets
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // 3. Check for Better Auth session token cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    // If it's an API route -> return 401 Unauthorized
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this API endpoint." },
        { status: 401 }
      );
    }

    // If it's a page route -> redirect to /auth with callbackUrl
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
     * Match all request paths except static files & favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
