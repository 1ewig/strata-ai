'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/lib/auth-client';
import { QUOTA_5H_LIMIT, QUOTA_WEEK_LIMIT, buildQuotaError } from '@/lib/limits';

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
const buildQuotaErrorFromData = (data: RateLimitData | null | undefined): QuotaError | null => {
  if (!data) return null;
  return buildQuotaError(data.remaining5h, data.remainingWeek, data.retryAfter) as QuotaError | null;
};

/**
 * Fetches and normalizes the latest rate-limit snapshot from the API.
 * @param signal - Optional abort signal.
 * @returns The parsed RateLimitData snapshot, or null if the request failed.
 */
async function fetchRateLimitSnapshot(signal?: AbortSignal): Promise<RateLimitData | null> {
  try {
    const res = await fetch('/api/user/rate-limit', { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      remaining5h: data.remaining5h ?? QUOTA_5H_LIMIT,
      remainingWeek: data.remainingWeek ?? QUOTA_WEEK_LIMIT,
      retryAfter: data.retryAfter,
    };
  } catch {
    return null;
  }
}

/**
 * Provides global rate-limit state for the signed-in user.
 * Hydrates from SSR data, fetches fresh quota client-side when unavailable,
 * and exposes update/clear helpers for the chat transport to report headers.
 */
export function RateLimitProvider({ children, initialData }: RateLimitProviderProps) {
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id ?? null;

  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(initialData ?? null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(() => buildQuotaErrorFromData(initialData));

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
      setQuotaError(buildQuotaErrorFromData(ssrData));
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
    const next = await fetchRateLimitSnapshot();
    if (next) {
      setRateLimitData(next);
      setQuotaError(buildQuotaErrorFromData(next));
    }
  }, []);

  // Client-side fallback when SSR data is unavailable for the signed-in user.
  useEffect(() => {
    if (isSessionPending) return;
    if (!userId || ssrData) return;

    let active = true;
    const controller = new AbortController();

    fetchRateLimitSnapshot(controller.signal).then((next) => {
      if (active && next) {
        setRateLimitData(next);
        setQuotaError(buildQuotaErrorFromData(next));
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, initialDataKey, isSessionPending, ssrData]);

  /**
   * Merges fresh usage data from the chat transport into the current state,
   * keeping unknown fields from previous values and defaulting to the full quota.
   * @param data - Partial usage data received from response headers.
   */
  const updateRateLimitData = useCallback((data: Partial<RateLimitData>) => {
    setRateLimitData((prev) => ({
      remaining5h: data.remaining5h ?? prev?.remaining5h ?? QUOTA_5H_LIMIT,
      remainingWeek: data.remainingWeek ?? prev?.remainingWeek ?? QUOTA_WEEK_LIMIT,
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
