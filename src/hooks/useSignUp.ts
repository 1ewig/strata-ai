'use client';

import { useCallback } from 'react';
import { signUp } from '@/lib/auth-client';
import { useAuthForm } from './useAuthForm';

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
