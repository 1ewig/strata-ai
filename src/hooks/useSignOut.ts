'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

/**
 * Sign-out action with pending state: clears the session via the Better Auth
 * client, then refreshes so the UI reflects the signed-out state.
 *
 * @returns Pending flag and a sign-out handler.
 */
export function useSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsPending(true);
    await signOut();
    router.push('/auth/signin');
    router.refresh();
  }, [router]);

  return { isPending, handleSignOut };
}
