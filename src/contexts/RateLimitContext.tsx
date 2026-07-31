'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/lib/auth-client';

export interface RateLimitData {
  remaining5h: number;
  remainingWeek: number;
  retryAfter?: number;
}

export interface QuotaError {
  message: string;
  retryAfter?: number;
}

interface RateLimitContextType {
  rateLimitData: RateLimitData | null;
  quotaError: QuotaError | null;
  updateRateLimitData: (data: Partial<RateLimitData>) => void;
  setQuotaError: React.Dispatch<React.SetStateAction<QuotaError | null>>;
  clearQuotaError: () => void;
  checkQuotaStatus: () => Promise<void>;
}

const RateLimitContext = createContext<RateLimitContextType | undefined>(undefined);

interface RateLimitProviderProps {
  children: React.ReactNode;
  initialData?: RateLimitData | null;
}

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

export function RateLimitProvider({ children, initialData }: RateLimitProviderProps) {
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id ?? null;

  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(initialData ?? null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(() => buildQuotaError(initialData));

  const initialDataKey = initialData
    ? `${initialData.remaining5h}:${initialData.remainingWeek}:${initialData.retryAfter ?? ''}`
    : null;

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

  const updateRateLimitData = useCallback((data: Partial<RateLimitData>) => {
    setRateLimitData((prev) => ({
      remaining5h: data.remaining5h ?? prev?.remaining5h ?? 10,
      remainingWeek: data.remainingWeek ?? prev?.remainingWeek ?? 50,
      retryAfter: data.retryAfter !== undefined ? data.retryAfter : prev?.retryAfter,
    }));
  }, []);

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

export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
}
