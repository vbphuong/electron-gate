"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Account creation failed");
      }

      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="atelier-auth-layout">
        <div className="atelier-terminal-status-tag">
          <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
          <span>INITIALIZING ACCOUNT...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="atelier-auth-layout">
      {/* Background drafting grid & filament */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      <div className="atelier-auth-plate">
        {/* Header */}
        <div className="atelier-auth-header">
          <Link href="/" className="inline-block">
            <div className="atelier-logo-stamp mx-auto !w-10 !h-10">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
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
          <h1>Create Account</h1>
          <p>Get started with role-based vector search and document retrieval</p>
          <div className="atelier-terminal-status-tag">
            <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-amber)]" />
            <span>NEW REGISTRATION // OPEN</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="atelier-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 10a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="atelier-input-group">
            <label className="atelier-input-label" htmlFor="signup-email">
              <span>Email Address</span>
              <span className="text-[10px] text-[var(--color-atelier-brass)]">[ REQUIRED ]</span>
            </label>
            <div className="atelier-input-wrapper">
              <svg
                className="atelier-input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
              <input
                id="signup-email"
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
            <label className="atelier-input-label" htmlFor="signup-password">
              <span>Password</span>
              <span className="text-[10px] text-[var(--color-terminal-cyan)]">[ MIN 6 CHARS ]</span>
            </label>
            <div className="atelier-input-wrapper">
              <svg
                className="atelier-input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                className="atelier-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="atelier-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="atelier-input-group">
            <label className="atelier-input-label" htmlFor="signup-confirm">
              <span>Confirm Password</span>
              <span className="text-[10px] text-[var(--color-atelier-brass)]">[ VERIFY ]</span>
            </label>
            <div className="atelier-input-wrapper">
              <svg
                className="atelier-input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                className="atelier-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="atelier-btn atelier-btn-primary w-full py-3 mt-3 text-xs"
            disabled={isSubmitting}
            id="signup-submit-btn"
          >
            {isSubmitting ? (
              <span>Creating Account...</span>
            ) : (
              <span>Create Account →</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="atelier-auth-footer">
          <span>Already have an account?</span>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}


