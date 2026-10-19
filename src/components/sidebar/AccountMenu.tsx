'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import type { authClient } from '@/lib/auth/client';
import {
  LogOut,
  LogIn,
  Loader2,
  ChevronUp,
  Sun,
  Moon,
  User as UserIcon,
} from 'lucide-react';
import { QUOTA_5H_LIMIT, QUOTA_WEEK_LIMIT } from '@/lib/limits';
import { useRateLimit } from '@/contexts/RateLimitContext';
import { useClickOutside } from '@/hooks/common/useClickOutside';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Session = typeof authClient.$Infer.Session;

export interface AccountMenuProps {
  /** The signed-in user's session (null for guests). */
  session: Session;
  /** Whether a sign-out request is in flight. */
  isSigningOut: boolean;
  /** Callback to sign the user out. */
  onSignOut: () => Promise<void>;
  /** Whether dark theme is currently enabled. */
  isDark: boolean;
  /** Callback to toggle between light and dark theme. */
  onToggleTheme: () => void;
}

/**
 * Unified account menu for the sidebar footer.
 * Features an account bar trigger that opens a floating dropup containing:
 * 1. Account profile details
 * 2. Usage quota status (5-hour and 7-day windows + reset countdown)
 * 3. Theme switch (Light / Dark segmented control)
 * 4. Sign-out action (with confirmation dialog) or sign-in link for guests.
 */
export default function AccountMenu({
  session,
  isSigningOut,
  onSignOut,
  isDark,
  onToggleTheme,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropup when clicking outside or pressing Escape
  useClickOutside(containerRef, () => setIsOpen(false), { triggerRef, enabled: isOpen });

  const { rateLimitData, isQuotaExhausted } = useRateLimit();

  const user = session?.user;
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOutClick = () => {
    setIsOpen(false);
    setShowSignOutConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    await onSignOut();
    setShowSignOutConfirm(false);
  };

  // Remaining quota arc calculation for mini ring on trigger button
  const remaining5h = rateLimitData?.remaining5h ?? QUOTA_5H_LIMIT;
  const remainingWeek = rateLimitData?.remainingWeek ?? QUOTA_WEEK_LIMIT;
  const quotaRatio = Math.min(1, Math.max(0, remaining5h / QUOTA_5H_LIMIT));
  const ringCircumference = 37.7; // 2 * PI * 6 for r=6

  const quotaColorClass = isQuotaExhausted || remaining5h === 0
    ? 'text-danger'
    : remaining5h <= 2
      ? 'text-warning'
      : 'text-primary';

  const quotaBarColorClass = isQuotaExhausted || remaining5h === 0
    ? 'bg-danger'
    : remaining5h <= 2
      ? 'bg-warning'
      : 'bg-primary';

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        {/* Floating Dropup Menu */}
        {isOpen && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 p-2.5 bg-surface-overlay border border-edge-raised rounded-xl shadow-card-lg space-y-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
            role="dialog"
            aria-label="Account & settings dropup"
          >
            {/* Section 1: Account Details */}
            {user ? (
              <div className="flex items-center gap-2.5 px-1 py-0.5">
                <div className="w-8 h-8 rounded-full bg-primary-soft border border-primary/40 text-primary font-bold text-label flex items-center justify-center shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label font-semibold text-text-bright truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-micro text-text-muted truncate mt-0.5 leading-tight">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-1 py-0.5">
                <div className="w-8 h-8 rounded-full bg-surface-elevated border border-edge-default text-text-secondary flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label font-semibold text-text-bright truncate leading-tight">
                    Guest User
                  </p>
                  <p className="text-micro text-text-muted truncate mt-0.5 leading-tight">
                    Sign in to sync quota & history
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-edge-default" />

            {/* Section 2: Usage Quota */}
            {rateLimitData ? (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between text-caption">
                  <span className="font-semibold text-text-bright">Usage Quota</span>
                  {isQuotaExhausted ? (
                    <span className="text-micro font-semibold uppercase px-1.5 py-0.5 rounded bg-danger-soft text-danger">
                      Exhausted
                    </span>
                  ) : (
                    <span className="text-micro font-medium px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary">
                      Active
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-caption text-text-muted">
                  <div className="flex items-center justify-between">
                    <span>5-hour window:</span>
                    <span className={`font-semibold ${quotaColorClass}`}>
                      {remaining5h} of {QUOTA_5H_LIMIT} left
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${quotaBarColorClass}`}
                      style={{ width: `${quotaRatio * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span>7-day window:</span>
                    <span className={`font-medium ${remainingWeek === 0 ? 'text-danger' : 'text-text-primary'}`}>
                      {remainingWeek} of {QUOTA_WEEK_LIMIT} left
                    </span>
                  </div>

                  {rateLimitData.retryAfter && (
                    <div className="pt-1 border-t border-edge-default text-micro text-danger flex items-center justify-between font-medium">
                      <span>Resets in:</span>
                      <span>~{Math.ceil(rateLimitData.retryAfter / 60)} minutes</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {rateLimitData && <div className="border-t border-edge-default" />}

            {/* Section 3: Theme Switch */}
            <div className="space-y-1.5 px-1">
              <span className="text-caption font-semibold text-text-bright block">Theme</span>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-elevated border border-edge-default rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) onToggleTheme();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-caption transition-all duration-150 cursor-pointer ${
                    !isDark
                      ? 'bg-surface-raised text-text-bright shadow-button font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={!isDark}
                >
                  <Sun className="w-3.5 h-3.5 text-secondary" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) onToggleTheme();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-caption transition-all duration-150 cursor-pointer ${
                    isDark
                      ? 'bg-surface-raised text-text-bright shadow-button font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={isDark}
                >
                  <Moon className="w-3.5 h-3.5 text-text-primary" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="border-t border-edge-default" />

            {/* Section 4: Auth Action */}
            {user ? (
              <button
                type="button"
                onClick={handleSignOutClick}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-danger hover:bg-danger-soft active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-150 cursor-pointer"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover active:scale-[0.98] text-text-bright border border-edge-raised rounded-lg text-caption font-semibold shadow-button transition-all duration-150"
              >
                <LogIn className="w-3.5 h-3.5 text-primary" />
                <span>Sign In / Sign Up</span>
              </Link>
            )}
          </div>
        )}

        {/* Account Bar Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="group w-full flex items-center justify-between p-2 rounded-lg bg-surface-base hover:bg-surface-hover/50 active:scale-[0.98] border border-edge-default transition-all duration-150 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {user ? (
              <div className="w-7 h-7 rounded-full bg-primary-soft border border-primary/40 text-primary font-bold text-label flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                {initial}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-elevated border border-edge-default text-text-muted flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold text-text-bright truncate leading-none">
                {user ? displayName : 'Guest'}
              </p>
              <p className="text-micro text-text-muted truncate mt-0.5 leading-none">
                {user ? user.email : 'Settings & Quota'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Mini Quota Indicator */}
            {rateLimitData && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-elevated border border-edge-default text-micro font-medium text-text-secondary">
                <svg className="w-3 h-3 -rotate-90 shrink-0" viewBox="0 0 16 16">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-edge-default"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * (1 - quotaRatio)}
                    strokeLinecap="round"
                    className={`transition-all duration-300 ${quotaColorClass}`}
                  />
                </svg>
                <span className={isQuotaExhausted ? 'text-danger font-semibold' : ''}>
                  {remaining5h}
                </span>
              </div>
            )}

            <ChevronUp
              className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-text-primary' : ''
              }`}
            />
          </div>
        </button>
      </div>

      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign Out"
        description={`Are you sure you want to sign out of ${displayName}? Your local workspace data will remain safe in your browser.`}
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isSigningOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}
