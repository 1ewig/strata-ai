"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { ArrowRight, ShieldCheck, LogOut } from "lucide-react";

interface AlreadyAuthenticatedProps {
  session: { user: { name?: string | null; email?: string | null } };
  callbackUrl: string;
}

export function AlreadyAuthenticated({ session, callbackUrl }: AlreadyAuthenticatedProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-raised border border-edge-raised rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-text-bright">Already Authenticated</h2>
          <p className="text-sm text-text-secondary mt-1">
            Signed in as <span className="text-emerald-400 font-semibold">{session.user.name || session.user.email}</span>
          </p>
          <p className="text-xs text-text-muted mt-0.5">{session.user.email}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => router.push(callbackUrl)}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-surface-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Go to Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.refresh();
            }}
            className="w-full py-3 px-4 bg-surface-overlay hover:bg-surface-elevated text-text-secondary hover:text-text-bright border border-edge-default rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
