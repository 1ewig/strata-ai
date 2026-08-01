"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { User, LogOut, LogIn, Loader2, ChevronUp } from "lucide-react";

/**
 * Session-aware user menu: shows a loading state while the session resolves,
 * a sign-in link for guests, and a profile bar with a sign-out dropdown for
 * authenticated users.
 */
export default function UserButton() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Session request still in flight; show a lightweight pending state.
  if (isPending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Loading...</span>
      </div>
    );
  }

  // Guests get a sign-in link instead of the profile menu.
  if (!session?.user) {
    return (
      <Link
        href="/auth/signin"
        className="w-full flex items-center justify-center gap-2 bg-surface-overlay hover:bg-surface-elevated text-text-bright border border-edge-raised px-3 py-2 rounded-lg text-xs font-semibold transition-all"
      >
        <LogIn className="w-3.5 h-3.5 text-primary" />
        <span>Sign In / Sign Up</span>
      </Link>
    );
  }

  // Derive a display name and avatar initial from the session user.
  const displayName = session.user.name || session.user.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative w-full">
      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-surface-overlay border border-edge-raised rounded-xl shadow-xl space-y-1 animate-fade-in z-50">
          <div className="px-2.5 py-1.5 border-b border-edge-default">
            <p className="text-xs font-semibold text-text-bright truncate">{displayName}</p>
            <p className="text-[10px] text-text-muted truncate">{session.user.email}</p>
          </div>

          <button
            onClick={async () => {
              // Clear the session, then refresh so the UI reflects the signed-out state.
              setSigningOut(true);
              await signOut();
              router.refresh();
            }}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-danger hover:bg-danger-soft disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {signingOut ? (
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
        className="w-full flex items-center justify-between p-2 rounded-lg bg-surface-base hover:bg-surface-hover/50 border border-edge-default transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary-soft border border-primary/40 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-bright truncate leading-none">{displayName}</p>
            <p className="text-[10px] text-text-muted truncate mt-0.5 leading-none">{session.user.email}</p>
          </div>
        </div>
        <ChevronUp className={`w-3.5 h-3.5 text-text-muted transition-transform shrink-0 ${menuOpen ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
