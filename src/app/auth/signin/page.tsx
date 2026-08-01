"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/auth/loading-screen";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

/**
 * Sign-in screen. Shows a loading screen while the session resolves and
 * bounces already-authenticated users to their callback URL.
 */
function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Already signed in - forward to the callback URL immediately.
  useEffect(() => {
    if (session?.user) router.replace(callbackUrl);
  }, [session, callbackUrl, router]);

  // Keep the spinner until the session resolves, then render the form.
  if (isPending || session?.user) return <LoadingScreen />;

  return (
    <AuthShell mode="signin">
      <SignInForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

/** Exports the sign-in page wrapped in Suspense so useSearchParams can be statically pre-rendered. */
export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignInPage />
    </Suspense>
  );
}
