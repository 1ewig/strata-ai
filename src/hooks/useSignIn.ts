'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';

/**
 * Email/password sign-in state machine: validates input, calls the Better
 * Auth client, surfaces provider errors, and redirects on success.
 *
 * @param callbackUrl - Destination to navigate to after a successful sign-in.
 * @returns Form feedback state and a submit handler.
 */
export function useSignIn(callbackUrl: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * Validates credentials and signs the user in, redirecting on success.
   * @param email - The user's email address.
   * @param password - The user's password.
   */
  const handleSubmit = useCallback(
    async (email: string, password: string) => {
      // Clear any feedback from a previous attempt.
      setError(null);
      setSuccessMsg(null);

      // Reject empty submissions before hitting the auth API.
      if (!email || !password) {
        setError('Please fill in all required fields.');
        return;
      }

      // Enforce the minimum password length client-side.
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }

      setIsPending(true);

      try {
        const { error: signInError } = await signIn.email({ email, password });

        if (signInError) {
          // Surface the provider's message so the user knows why sign-in failed.
          setError(signInError.message || 'Invalid email or password.');
          setIsPending(false);
          return;
        }

        // Pause briefly so the success message is visible before navigating.
        setSuccessMsg('Signed in successfully! Redirecting...');
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 1000);
      } catch (err: any) {
        // Network or unexpected failures fall back to a generic message.
        setError(err?.message || 'An unexpected error occurred. Please try again.');
        setIsPending(false);
      }
    },
    [callbackUrl, router],
  );

  return { error, successMsg, isPending, handleSubmit };
}
