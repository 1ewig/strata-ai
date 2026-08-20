import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LandingClient } from '@/components/landing/LandingClient';

/**
 * Server Component for the root landing page.
 * Resolves the authenticated session server-side to eliminate client waterfalls
 * and render the UI with zero layout shifts.
 */
export default async function Home() {
  let userId: string | undefined;

  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    userId = session?.user?.id;
  } catch {
    // Fallback gracefully if database or session resolution fails during SSR
  }

  return <LandingClient userId={userId} />;
}
