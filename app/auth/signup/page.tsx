"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/auth/loading-screen";
import { AlreadyAuthenticated } from "@/components/auth/already-authenticated";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

function SignUpPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingScreen />;
  if (session?.user) return <AlreadyAuthenticated session={session} callbackUrl={callbackUrl} />;

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
