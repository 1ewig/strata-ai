'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

export function RateLimitProvider({ children, initialData }: RateLimitProviderProps) {
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(initialData ?? null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(() => {
    if (initialData && (initialData.remaining5h <= 0 || initialData.remainingWeek <= 0)) {
      return {
        message: initialData.remaining5h <= 0
          ? 'Your 5-hour quota is exhausted (10/10 messages used).'
          : 'Your weekly quota is exhausted (50/50 messages used).',
        retryAfter: initialData.retryAfter,
      };
    }
    return null;
  });

  const checkQuotaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/rate-limit');
      if (res.ok) {
        const data = await res.json();
        const rem5h = data.remaining5h ?? 10;
        const remWeek = data.remainingWeek ?? 50;
        setRateLimitData({
          remaining5h: rem5h,
          remainingWeek: remWeek,
          retryAfter: data.retryAfter,
        });
        if (rem5h > 0 && remWeek > 0) {
          setQuotaError(null);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (initialData) return;
    let active = true;
    fetch('/api/user/rate-limit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && active) {
          const rem5h = data.remaining5h ?? 10;
          const remWeek = data.remainingWeek ?? 50;
          setRateLimitData({
            remaining5h: rem5h,
            remainingWeek: remWeek,
            retryAfter: data.retryAfter,
          });
          if (rem5h > 0 && remWeek > 0) {
            setQuotaError(null);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialData]);

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
