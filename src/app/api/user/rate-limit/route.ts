import { auth } from "@/lib/auth";
import { getRateLimitStatus } from "@/lib/rate-limit";

/**
 * GET /api/user/rate-limit - reports the signed-in user's current quota
 * usage. Requires an authenticated session; returns a RateLimitResult JSON
 * body or a 401/500 error response.
 *
 * @param req - The incoming request with the session cookies in its headers
 * @returns The rate-limit status as JSON, or an error response
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  // Reject unauthenticated requests.
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serve the quota status; degrade to a 500 if the database check fails.
  try {
    const status = await getRateLimitStatus(session.user.id);
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[rate-limit API error]:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch rate limit status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
