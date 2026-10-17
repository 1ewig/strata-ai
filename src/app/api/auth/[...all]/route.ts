import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth catch-all handler mounting every auth endpoint (sign-in,
 * sign-up, session, callbacks, and more) under /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler(auth);
