"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

/** Props for the sign-up form. */
interface SignUpFormProps {
  /** Submits the registration fields; the parent owns validation, auth, and navigation. */
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  /** Error message to display, if any. */
  error: string | null;
  /** Success message to display, if any. */
  successMsg: string | null;
  /** Whether the auth request is in flight. */
  isPending: boolean;
}

/**
 * Clean, tactile, and human email/password sign-up form.
 * Rendering and local field state only — submission flow and auth logic live in parent hook.
 */
export function SignUpForm({ onSubmit, error, successMsg, isPending }: SignUpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, email, password);
  };

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-caption flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </motion.div>
      )}

      {/* Success banner */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-primary-soft border border-primary/30 text-primary text-caption flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{successMsg}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <label className="block text-label font-medium text-text-primary">
            Full name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-raised focus:border-primary focus:ring-2 focus:ring-primary-soft rounded-xl text-label text-text-bright placeholder:text-text-faint focus:outline-none transition-all shadow-button"
            />
          </div>
        </div>

        {/* Email Address Field */}
        <div className="space-y-1.5">
          <label className="block text-label font-medium text-text-primary">
            Email address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-edge-raised focus:border-primary focus:ring-2 focus:ring-primary-soft rounded-xl text-label text-text-bright placeholder:text-text-faint focus:outline-none transition-all shadow-button"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-label font-medium text-text-primary">
              Password
            </label>
            <span className="text-micro text-text-muted">At least 8 characters</span>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-11 py-2.5 bg-surface-base border border-edge-raised focus:border-primary focus:ring-2 focus:ring-primary-soft rounded-xl text-label text-text-bright placeholder:text-text-faint focus:outline-none transition-all shadow-button"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-secondary active:scale-90 transition-all cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isPending}
          whileHover={{ scale: isPending ? 1 : 1.01 }}
          whileTap={{ scale: isPending ? 1 : 0.98 }}
          className="group w-full mt-2 py-3 px-4 bg-primary hover:bg-primary-hover active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 text-surface text-label font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-button hover:shadow-glow-primary cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
            </>
          )}
        </motion.button>

        {/* Alternate link */}
        <div className="pt-2 text-center">
          <p className="text-caption text-text-muted font-sans">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-primary hover:text-primary-hover font-semibold transition-colors inline-flex items-center gap-1 group"
            >
              <span>Sign in</span>
              <ArrowRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}


