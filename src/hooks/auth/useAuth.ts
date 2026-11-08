'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth/client';

/**
 * Initiates the Google OAuth flow via the Better Auth client.
 * Manages loading states, catches provider errors, and triggers the redirect.
 *
 * @param callbackUrl - Destination URL after completing authentication.
 * @returns Pending state, error message if any, and the sign-in trigger.
 */
export function useGoogleSignIn(callbackUrl: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setIsPending(true);

    try {
      await signIn.social({
        provider: 'google',
        callbackURL: callbackUrl || '/',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to Google. Please try again.');
      setIsPending(false);
    }
  }, [callbackUrl]);

  return { isPending, error, handleGoogleSignIn };
}

/**
 * Sign-out action with pending state: clears the session via the Better Auth
 * client, then navigates to /auth/signin and refreshes router state.
 *
 * @returns Pending flag and a sign-out handler.
 */
export function useSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsPending(true);
    try {
      await signOut();
      router.replace('/auth/signin');
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }, [router]);

  return { isPending, handleSignOut };
}
