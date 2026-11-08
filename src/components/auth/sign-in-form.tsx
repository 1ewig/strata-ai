"use client";

import { motion } from "motion/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

interface SignInFormProps {
  /** Initiates the Google OAuth sign-in flow. */
  onGoogleSignIn: () => Promise<void>;
  /** Error message to display, if any. */
  error: string | null;
  /** Whether the OAuth redirection request is in flight. */
  isPending: boolean;
}

/**
 * Minimalist, tactile Google sign-in trigger.
 * Designed for the open canvas layout with subtle elevation and micro-feedback.
 */
export function SignInForm({ onGoogleSignIn, error, isPending }: SignInFormProps) {
  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-caption flex items-start gap-2.5 text-left"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </motion.div>
      )}

      {/* Primary Google Sign-in CTA */}
      <motion.button
        type="button"
        disabled={isPending}
        onClick={onGoogleSignIn}
        whileHover={{ scale: isPending ? 1 : 1.015 }}
        whileTap={{ scale: isPending ? 1 : 0.985 }}
        className="group w-full py-3.5 px-6 rounded-2xl bg-surface-raised dark:bg-surface-elevated hover:bg-surface-elevated dark:hover:bg-surface-raised border border-edge-raised hover:border-edge-hover text-text-bright text-label font-semibold flex items-center justify-center gap-3 transition-all duration-150 shadow-button hover:shadow-card cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </>
        )}
      </motion.button>

      <p className="text-center text-micro text-text-muted font-sans pt-1">
        No passwords to remember · Secure one-click access
      </p>
    </div>
  );
}
