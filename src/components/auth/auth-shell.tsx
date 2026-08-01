"use client";

import type { ReactNode } from "react";

/**
 * Props for the shared auth page shell.
 */
interface AuthShellProps {
  /** Content rendered inside the card, typically the sign-in or sign-up form. */
  children: ReactNode;
  /** Which auth mode the shell is presenting, drives the heading and supporting copy. */
  mode: "signin" | "signup";
}

/**
 * Full-screen layout wrapper shared by the sign-in and sign-up pages.
 * Renders decorative background accents, the branded auth card, and its children.
 */
export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <div className="min-h-dvh bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-accent-blue-soft rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-raised/90 border border-edge-raised rounded-3xl p-8 shadow-card-lg backdrop-blur-xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-primary/30 text-primary text-xs font-semibold">
            <span>Strata AI Auth</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-text-secondary">
            {mode === "signin"
              ? "Sign in to access your agentic document studio"
              : "Get started with your AI-powered workspace"}
          </p>
        </div>

        {children}

        <div className="text-center pt-2">
          <p className="text-xs text-text-muted">
            Instant authentication enabled — no email verification needed.
          </p>
        </div>
      </div>
    </div>
  );
}
