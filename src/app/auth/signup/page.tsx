"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/auth/loading-screen";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

function SignUpPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) router.replace(callbackUrl);
  }, [session, callbackUrl, router]);

  if (isPending || session?.user) return <LoadingScreen />;

  return (
    <AuthShell mode="signup">
      <SignUpForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignUpPage />
    </Suspense>
  );
}
