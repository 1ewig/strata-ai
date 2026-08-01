import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client wired to the app's public base URL.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

/** Convenience exports: the auth actions and the session hook. */
export const { signIn, signUp, signOut, useSession } = authClient;
