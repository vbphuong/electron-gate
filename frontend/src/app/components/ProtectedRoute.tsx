"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="atelier-protected-box">
        <div className="atelier-terminal-status-tag mb-4">
          <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
          <span>[ AUTH ] Checking authentication status...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="atelier-protected-box">
        <div className="atelier-denied-plate">
          <div className="atelier-denied-badge">ACCESS RESTRICTED (403)</div>
          <h2 className="text-xl font-bold mb-2">Permission Required</h2>
          <p className="text-sm text-[var(--color-ink-muted)] mb-4">
            Your current account role (<strong className="text-[var(--color-ink)] uppercase font-mono">{user.role}</strong>) does not have permission to view this page:
          </p>
          <div className="bg-[var(--color-paper-terminal)] p-3 rounded font-mono text-xs text-[var(--color-terminal-cyan)] mb-6 border border-[var(--color-rule)]">
            Required Role: {allowedRoles.join(" or ")}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="atelier-btn atelier-btn-primary w-full py-2.5 text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


