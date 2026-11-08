import { redirect } from "next/navigation";

interface SignUpPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Sign-up route. With Google OAuth, sign-up and sign-in are unified into
 * a single one-click flow. Forwards to /auth/signin while preserving callbackUrl.
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedParams = await searchParams;
  const callbackUrl = resolvedParams?.callbackUrl;

  if (typeof callbackUrl === "string" && callbackUrl) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  redirect("/auth/signin");
}
