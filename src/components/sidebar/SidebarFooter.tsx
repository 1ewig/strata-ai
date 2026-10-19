import React from 'react';
import type { authClient } from '@/lib/auth/client';
import AccountMenu from './AccountMenu';

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
}

/**
 * Pinned sidebar footer containing the unified account menu
 * with profile details, usage quota, theme switcher, and sign-out dropup.
 */
function SidebarFooter({
  session,
  isSigningOut,
  onSignOut,
  isDark,
  onToggleTheme,
}: SidebarFooterProps) {
  return (
    <div className="p-3 border-t border-edge-hover/50 shrink-0">
      <AccountMenu
        session={session}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
    </div>
  );
}

export default React.memo(SidebarFooter);
