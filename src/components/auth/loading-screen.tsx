"use client";

import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-surface-base flex items-center justify-center">
      <div className="flex items-center gap-3 text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Checking authentication state...</span>
      </div>
    </div>
  );
}
