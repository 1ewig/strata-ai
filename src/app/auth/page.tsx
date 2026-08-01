import { redirect } from "next/navigation";

/**
 * Auth route root - /auth itself has no UI, so forward to the sign-in page.
 */
export default function AuthPage() {
  redirect("/auth/signin");
}
