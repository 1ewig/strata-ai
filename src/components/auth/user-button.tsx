"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { authClient } from "@/lib/auth-client";
import { User, LogOut, LogIn, Loader2, ChevronUp } from "lucide-react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";

/** The resolved session shape produced by the auth client. */
type Session = typeof authClient.$Infer.Session;

/** Props for the user button. */
interface UserButtonProps {
  /** The signed-in user's session (null for guests). */
  session: Session;
  /** Whether a sign-out request is in flight. */
  isSigningOut: boolean;
  /** Clears the session and refreshes the UI. */
  onSignOut: () => Promise<void>;
}

/**
 * Session-aware user menu: shows a sign-in link for guests and a profile bar
 * with a sign-out dropdown for authenticated users. Rendering only — session
 * and sign-out are provided by the parent.
 *
 * @param props - Component props.
 */
export default function UserButton({ session, isSigningOut, onSignOut }: UserButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Guests get a sign-in link instead of the profile menu.
  if (!session?.user) {
    return (
      <Link
        href="/auth/signin"
        className="w-full flex items-center justify-center gap-2 bg-surface-overlay hover:bg-surface-elevated text-text-bright border border-edge-raised px-3 py-2 rounded-lg text-label font-semibold transition-all"
      >
        <LogIn className="w-3.5 h-3.5 text-primary" />
        <span>Sign In / Sign Up</span>
      </Link>
    );
  }

  // Derive a display name and avatar initial from the session user.
  const displayName = session.user.name || session.user.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOutClick = () => {
    setMenuOpen(false);
    setShowSignOutConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    await onSignOut();
    setShowSignOutConfirm(false);
  };

  return (
    <>
      <div className="relative w-full">
        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-surface-overlay border border-edge-raised rounded-xl shadow-xl space-y-1 animate-fade-in z-50">
            <div className="px-2.5 py-1.5 border-b border-edge-default">
              <p className="text-label font-semibold text-text-bright truncate">{displayName}</p>
              <p className="text-micro text-text-muted truncate">{session.user.email}</p>
            </div>

            <button
              onClick={handleSignOutClick}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-label text-danger hover:bg-danger-soft disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
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
          </div>
        )}

        {/* User Profile Bar */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-surface-base hover:bg-surface-hover/50 border border-edge-default transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-soft border border-primary/40 text-primary font-bold text-label flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold text-text-bright truncate leading-none">{displayName}</p>
              <p className="text-micro text-text-muted truncate mt-0.5 leading-none">{session.user.email}</p>
            </div>
          </div>
          <ChevronUp className={`w-3.5 h-3.5 text-text-muted transition-transform shrink-0 ${menuOpen ? "rotate-180" : ""}`} />
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
