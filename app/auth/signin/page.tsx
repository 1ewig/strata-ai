"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/auth/loading-screen";
import { AlreadyAuthenticated } from "@/components/auth/already-authenticated";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingScreen />;
  if (session?.user) return <AlreadyAuthenticated session={session} callbackUrl={callbackUrl} />;

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
