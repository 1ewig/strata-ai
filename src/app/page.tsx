'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useLatestConversationRedirect } from '@/hooks/useLatestConversationRedirect';

/**
 * Landing page that routes users based on their session. Unauthenticated
 * visitors are sent to /auth; signed-in users are redirected to their most
 * recently updated conversation, or to a fresh chat when none exists.
 */
export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;

  // Redirect signed-in users to their latest (or a fresh) conversation.
  useLatestConversationRedirect(userId);

  // Redirect unauthenticated visitors to the auth page once the session resolves.
  useEffect(() => {
    if (!isPending && !session?.user) router.replace('/auth');
  }, [isPending, session, router]);

  return (
    <main className="min-h-dvh bg-surface-base flex items-center justify-center text-text-muted text-label">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading workspace...
      </div>
    </main>
  );
}
