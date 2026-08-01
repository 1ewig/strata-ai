"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Props for the sign-up form.
 */
interface SignUpFormProps {
  /** Destination to navigate to after a successful sign-up. */
  callbackUrl: string;
}

/**
 * Email/password sign-up form backed by the Better Auth client.
 * Validates input locally, surfaces provider errors, and redirects on success.
 */
export function SignUpForm({ callbackUrl }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any feedback from a previous attempt.
    setError(null);
    setSuccessMsg(null);

    // Reject empty submissions before hitting the auth API.
    if (!email || !password || !name.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    // Enforce the minimum password length client-side.
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp.email({ email, password, name });

      if (signUpError) {
        // Surface the provider's message so the user knows why sign-up failed.
        setError(signUpError.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Pause briefly so the success message is visible before navigating.
      setSuccessMsg("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      // Network or unexpected failures fall back to a generic message.
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-primary-soft border border-primary/30 text-primary text-xs flex items-start gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-secondary">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-default focus:border-primary/60 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
            />
          </div>
        </div>

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
              className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-default focus:border-primary/60 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
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
              className="w-full pl-10 pr-10 py-2.5 bg-surface-base border border-edge-default focus:border-primary/60 rounded-xl text-sm text-text-bright placeholder:text-text-faint focus:outline-none transition-colors"
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
          className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-surface font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-button"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-primary hover:text-primary-hover font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
