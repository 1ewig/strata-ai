"use client";

import { motion } from "motion/react";
import { StrataIcon } from "@/components/ui/strata-icon";

/**
 * Full-screen atmospheric loading state shown while the authentication state resolves.
 * Styled with Milo tokens, breathing ambient glow, and Swiss monospace metadata.
 */
export function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-surface-base flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <StrataIcon className="w-12 h-12 relative z-10" />
        </motion.div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-micro font-mono uppercase tracking-widest text-text-muted">
              INITIALIZING STUDIO
            </span>
          </div>
          <p className="text-caption font-sans text-text-secondary">
            Resolving session and workspace cache...
          </p>
        </div>
      </div>
    </div>
  );
}

