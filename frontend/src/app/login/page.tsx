"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="atelier-auth-layout">
        <div className="atelier-terminal-status-tag">
          <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
          <span>LOADING SESSION...</span>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="atelier-auth-layout">
      {/* Background drafting grid & filament */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      <div className="atelier-auth-plate">
        {/* Header */}
        <div className="atelier-auth-header">
          <Link href="/" className="inline-block">
            <div className="atelier-logo-stamp">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 4L4 12V28L20 36L36 28V12L20 4Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 4V36M4 12L36 28M36 12L4 28"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  opacity="0.75"
                />
              </svg>
            </div>
          </Link>
          <h2>Sign In</h2>
          <p>Access the Electron Gate Hybrid RAG Knowledge Engine</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="atelier-error-banner" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="atelier-input-group">
            <label className="atelier-input-label" htmlFor="login-email">
              <span>Email Address</span>
              <span className="text-[10px] text-[var(--color-atelier-brass)]">[ REQUIRED ]</span>
            </label>
            <div className="atelier-input-wrapper">
              <Mail className="atelier-input-icon w-4 h-4" />
              <input
                id="login-email"
                type="email"
                className="atelier-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="atelier-input-group">
            <label className="atelier-input-label" htmlFor="login-password">
              <span>Password</span>
              <span className="text-[10px] text-[var(--color-terminal-cyan)]">[ SECURE ]</span>
            </label>
            <div className="atelier-input-wrapper">
              <Lock className="atelier-input-icon w-4 h-4" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="atelier-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="atelier-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="atelier-btn atelier-btn-primary w-full"
            disabled={isSubmitting}
            id="login-submit-btn"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="atelier-auth-footer">
          <span>Don&apos;t have an account?</span>
          <Link href="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}


