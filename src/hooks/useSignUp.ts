'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth-client';

/**
 * Email/password sign-up state machine: validates input, calls the Better
 * Auth client, surfaces provider errors, and redirects on success.
 *
 * @param callbackUrl - Destination to navigate to after a successful sign-up.
 * @returns Form feedback state and a submit handler.
 */
export function useSignUp(callbackUrl: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * Validates the registration fields and creates the account, redirecting on success.
   * @param name - The user's display name.
   * @param email - The user's email address.
   * @param password - The user's password.
   */
  const handleSubmit = useCallback(
    async (name: string, email: string, password: string) => {
      // Clear any feedback from a previous attempt.
      setError(null);
      setSuccessMsg(null);

      // Reject empty submissions before hitting the auth API.
      if (!email || !password || !name.trim()) {
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
        const { error: signUpError } = await signUp.email({ email, password, name });

        if (signUpError) {
          // Surface the provider's message so the user knows why sign-up failed.
          setError(signUpError.message || 'Failed to create account. Please try again.');
          setIsPending(false);
          return;
        }

        // Pause briefly so the success message is visible before navigating.
        setSuccessMsg('Account created successfully! Redirecting...');
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
