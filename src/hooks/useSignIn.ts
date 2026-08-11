'use client';

import { useCallback } from 'react';
import { signIn } from '@/lib/auth-client';
import { useAuthForm } from './useAuthForm';

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
