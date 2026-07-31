"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/auth/loading-screen";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) router.replace(callbackUrl);
  }, [session, callbackUrl, router]);

  if (isPending || session?.user) return <LoadingScreen />;

  return (
    <AuthShell mode="signin">
      <SignInForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignInPage />
    </Suspense>
  );
}
