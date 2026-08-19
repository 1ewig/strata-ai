import React from 'react';
import type { authClient } from '@/lib/auth-client';
import UserButton from '@/components/auth/user-button';
import ThemeToggle from '@/components/theme-toggle';
import RateLimitRing from '@/components/chat/status/RateLimitRing';

type Session = typeof authClient.$Infer.Session;

interface SidebarFooterProps {
  /** The signed-in user's session. */
  session: Session;
  /** Whether a sign-out request is in flight. */
  isSigningOut: boolean;
  /** Callback to sign the user out. */
  onSignOut: () => Promise<void>;
  /** Whether dark theme is currently enabled. */
  isDark: boolean;
  /** Callback to toggle between light and dark theme. */
  onToggleTheme: () => void;
  /** Remaining message quota data. */
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
  /** Whether quota is completely exhausted. */
  isQuotaExhausted: boolean;
}

/**
 * Pinned sidebar footer containing the theme toggle, rate limit ring,
 * and user profile / sign-out button.
 */
function SidebarFooter({
  session,
  isSigningOut,
  onSignOut,
  isDark,
  onToggleTheme,
  rateLimitData,
  isQuotaExhausted,
}: SidebarFooterProps) {
  return (
    <div className="p-3 border-t border-edge-hover/50 space-y-2 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>
        <div className="flex-1 min-w-0">
          <RateLimitRing rateLimitData={rateLimitData ?? null} isQuotaExhausted={isQuotaExhausted} />
        </div>
      </div>
      <UserButton session={session} isSigningOut={isSigningOut} onSignOut={onSignOut} />
    </div>
  );
}

export default React.memo(SidebarFooter);
