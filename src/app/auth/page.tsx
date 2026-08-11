import { redirect } from "next/navigation";

interface AuthPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Auth route root - /auth itself has no UI, so forward to the sign-in page,
 * preserving any query parameters such as callbackUrl.
 */
export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedParams = await searchParams;
  const callbackUrl = resolvedParams?.callbackUrl;

  if (typeof callbackUrl === "string" && callbackUrl) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  redirect("/auth/signin");
}
