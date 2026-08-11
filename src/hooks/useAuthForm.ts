'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/** Loose shape accepted from auth client responses (e.g. Better Auth's { data, error }). */
interface AuthResultLike {
  error?: { message?: string } | null;
  data?: unknown;
}

/**
 * Shared state and lifecycle for email/password auth forms.
 * Handles the loading/error/success state machine, API call, and redirect.
 *
 * @param submitFn - Calls the auth API; must return `{ error?: { message?: string } | null }`.
 * @param validateFn - Client-side validation; returns an error string or null.
 * @param options - Success message text and redirect destination.
 * @returns Form feedback state and a submit handler.
 */
export function useAuthForm<T extends any[]>(
  submitFn: (...args: T) => Promise<AuthResultLike | void>,
  validateFn: (...args: T) => string | null,
  { successMessage, callbackUrl }: { successMessage: string; callbackUrl: string },
) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (...args: T) => {
      setError(null);
      setSuccessMsg(null);

      const validationError = validateFn(...args);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsPending(true);

      try {
        const result = await submitFn(...args);

        if (result && 'error' in result && result.error) {
          setError(result.error.message || 'Something went wrong.');
          setIsPending(false);
          return;
        }

        setSuccessMsg(successMessage);
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 300);
      } catch (err: any) {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
        setIsPending(false);
      }
    },
    [submitFn, validateFn, successMessage, callbackUrl, router],
  );

  return { error, successMsg, isPending, handleSubmit };
}
