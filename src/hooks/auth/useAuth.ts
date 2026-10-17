'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, signOut } from '@/lib/auth/client';

/** Loose shape accepted from auth client responses (e.g. Better Auth's { data, error }). */
interface AuthResultLike {
  error?: { message?: string } | null;
  data?: unknown;
}

/**
 * Shared state machine and lifecycle for email/password auth forms.
 * Handles client-side validation, pending states, error handling, and redirection.
 */
function useAuthForm<T extends any[]>(
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

/**
 * Email/password sign-in state machine: validates input, calls the Better
 * Auth client, surfaces provider errors, and redirects on success.
 *
 * @param callbackUrl - Destination to navigate to after a successful sign-in.
 * @returns Form feedback state and a submit handler.
 */
export function useSignIn(callbackUrl: string) {
  const submitFn = useCallback(
    async (email: string, password: string) => {
      return await signIn.email({ email, password });
    },
    [],
  );

  const validateFn = useCallback(
    (email: string, password: string) => {
      if (!email || !password) return 'Please fill in all required fields.';
      if (password.length < 8) return 'Password must be at least 8 characters long.';
      return null;
    },
    [],
  );

  return useAuthForm(submitFn, validateFn, {
    successMessage: 'Signed in successfully! Redirecting...',
    callbackUrl,
  });
}

/**
 * Email/password sign-up state machine: validates input, calls the Better
 * Auth client, surfaces provider errors, and redirects on success.
 *
 * @param callbackUrl - Destination to navigate to after a successful sign-up.
 * @returns Form feedback state and a submit handler.
 */
export function useSignUp(callbackUrl: string) {
  const submitFn = useCallback(
    async (name: string, email: string, password: string) => {
      return await signUp.email({ email, password, name });
    },
    [],
  );

  const validateFn = useCallback(
    (name: string, email: string, password: string) => {
      if (!name.trim() || !email || !password) return 'Please fill in all required fields.';
      if (password.length < 8) return 'Password must be at least 8 characters long.';
      return null;
    },
    [],
  );

  return useAuthForm(submitFn, validateFn, {
    successMessage: 'Account created successfully! Redirecting...',
    callbackUrl,
  });
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
