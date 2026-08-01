'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/lib/auth-client';

/** Global usage quota state reported by the API on each chat response. */
export interface RateLimitData {
  remaining5h: number;
  remainingWeek: number;
  retryAfter?: number;
}

/** A user-facing message describing an exhausted quota, with an optional retry hint. */
export interface QuotaError {
  message: string;
  retryAfter?: number;
}

/** Shape of the context value consumed by hooks and components. */
interface RateLimitContextType {
  rateLimitData: RateLimitData | null;
  quotaError: QuotaError | null;
  updateRateLimitData: (data: Partial<RateLimitData>) => void;
  setQuotaError: React.Dispatch<React.SetStateAction<QuotaError | null>>;
  clearQuotaError: () => void;
  checkQuotaStatus: () => Promise<void>;
}

/** The context itself, undefined until a provider mounts so consumers can detect missing scope. */
const RateLimitContext = createContext<RateLimitContextType | undefined>(undefined);

/** Props for the provider, including optional server-rendered initial quota data. */
interface RateLimitProviderProps {
  children: React.ReactNode;
  initialData?: RateLimitData | null;
}

/**
 * Derives a quota error from the current usage data, or null while quota remains.
 * @param data - Current usage data, or null/undefined when unknown.
 * @returns A quota error if a window is exhausted, otherwise null.
 */
const buildQuotaError = (data: RateLimitData | null | undefined): QuotaError | null => {
  if (!data) return null;
  if (data.remaining5h > 0 && data.remainingWeek > 0) return null;
  return {
    message: data.remaining5h <= 0
      ? 'Your 5-hour quota is exhausted (10/10 messages used).'
      : 'Your weekly quota is exhausted (50/50 messages used).',
    retryAfter: data.retryAfter,
  };
};

/**
 * Provides global rate-limit state for the signed-in user.
 * Hydrates from SSR data, fetches fresh quota client-side when unavailable,
 * and exposes update/clear helpers for the chat transport to report headers.
 */
export function RateLimitProvider({ children, initialData }: RateLimitProviderProps) {
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id ?? null;

  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(initialData ?? null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(() => buildQuotaError(initialData));

  // String key so prop identity changes alone don't trigger the sync below
  const initialDataKey = initialData
    ? `${initialData.remaining5h}:${initialData.remainingWeek}:${initialData.retryAfter ?? ''}`
    : null;

  // SSR data may be a fresh object each render; parse the stable key into a normalized value
  const ssrData = useMemo<RateLimitData | null>(() => {
    if (!initialDataKey) return null;
    const [rem5h, remWeek, retryAfter] = initialDataKey.split(':');
    return {
      remaining5h: Number(rem5h),
      remainingWeek: Number(remWeek),
      retryAfter: retryAfter === '' ? undefined : Number(retryAfter),
    };
  }, [initialDataKey]);

  // Reset on sign-out, re-hydrate on sign-in or user switch, without an effect.
  const [prevUserId, setPrevUserId] = useState(userId);
  const [prevDataKey, setPrevDataKey] = useState(initialDataKey);
  if (prevUserId !== userId || prevDataKey !== initialDataKey) {
    setPrevUserId(userId);
    setPrevDataKey(initialDataKey);
    if (!userId) {
      setRateLimitData(null);
      setQuotaError(null);
    } else if (ssrData) {
      setRateLimitData(ssrData);
      setQuotaError(buildQuotaError(ssrData));
    } else {
      setRateLimitData(null);
      setQuotaError(null);
    }
  }

  /**
   * Fetches the latest quota state from the rate-limit endpoint.
   * @returns A promise resolving once the fetch completes (or fails silently).
   */
  const checkQuotaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/rate-limit');
      if (res.ok) {
        const data = await res.json();
        const next: RateLimitData = {
          remaining5h: data.remaining5h ?? 10,
          remainingWeek: data.remainingWeek ?? 50,
          retryAfter: data.retryAfter,
        };
        setRateLimitData(next);
        setQuotaError(buildQuotaError(next));
      }
    } catch {
      // ignore
    }
  }, []);

  // Client-side fallback when SSR data is unavailable for the signed-in user.
  useEffect(() => {
    if (isSessionPending) return;
    if (!userId || ssrData) return;

    // Guard against state updates if the effect cleans up before the fetch resolves
    let active = true;
    fetch('/api/user/rate-limit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const next: RateLimitData = {
          remaining5h: data.remaining5h ?? 10,
          remainingWeek: data.remainingWeek ?? 50,
          retryAfter: data.retryAfter,
        };
        setRateLimitData(next);
        setQuotaError(buildQuotaError(next));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, initialDataKey, isSessionPending, ssrData]);

  /**
   * Merges fresh usage data from the chat transport into the current state,
   * keeping unknown fields from previous values and defaulting to the full quota.
   * @param data - Partial usage data received from response headers.
   */
  const updateRateLimitData = useCallback((data: Partial<RateLimitData>) => {
    setRateLimitData((prev) => ({
      remaining5h: data.remaining5h ?? prev?.remaining5h ?? 10,
      remainingWeek: data.remainingWeek ?? prev?.remainingWeek ?? 50,
      retryAfter: data.retryAfter !== undefined ? data.retryAfter : prev?.retryAfter,
    }));
  }, []);

  /** Clears any active quota error message. */
  const clearQuotaError = useCallback(() => {
    setQuotaError(null);
  }, []);

  return (
    <RateLimitContext.Provider
      value={{
        rateLimitData,
        quotaError,
        updateRateLimitData,
        setQuotaError,
        clearQuotaError,
        checkQuotaStatus,
      }}
    >
      {children}
    </RateLimitContext.Provider>
  );
}

/**
 * Reads the global rate-limit context.
 * @returns The rate-limit context value.
 * @throws If called outside a RateLimitProvider.
 */
export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
}
