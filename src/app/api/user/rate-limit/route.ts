import { auth } from "@/lib/auth";
import { getRateLimitStatus } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

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
