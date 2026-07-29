"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const { data: session, isPending: isSessionLoading } = useSession();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await signUp.email({
          email,
          password,
          name,
        });

        if (signUpError) {
          setError(signUpError.message || "Failed to create account. Please try again.");
          setLoading(false);
          return;
        }

        setSuccessMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 1000);
      } else {
        const { error: signInError } = await signIn.email({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || "Invalid email or password.");
          setLoading(false);
          return;
        }

        setSuccessMsg("Signed in successfully! Redirecting...");
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Checking authentication state...</span>
        </div>
      </div>
    );
  }

  if (session?.user) {
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

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-raised/90 border border-edge-raised rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Branding */}
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

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-surface-base border border-edge-default rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-surface-overlay text-text-bright shadow-sm border border-edge-raised"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-surface-overlay text-text-bright shadow-sm border border-edge-raised"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Asad Shahid"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-default focus:border-emerald-500/50 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-default focus:border-emerald-500/50 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-surface-base border border-edge-default focus:border-emerald-500/50 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-surface-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === "signin" ? "Signing in..." : "Creating account..."}</span>
              </>
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center pt-2">
          <p className="text-xs text-text-muted">
            Instant authentication enabled — no email verification needed.
          </p>
        </div>
      </div>
    </div>
  );
}
