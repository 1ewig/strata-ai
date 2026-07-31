"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  mode: "signin" | "signup";
}

export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-raised/90 border border-edge-raised rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Strata AI Auth</span>
          </div>
          <h1 className="text-2xl font-bold text-text-bright tracking-tight">
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
