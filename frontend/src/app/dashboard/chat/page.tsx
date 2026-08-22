"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ElectronGateChat from "@/components/ui/ruixen-moon-chat";
import {
  UploadCloud,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Search,
} from "lucide-react";

function ChatContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const roleLower = (user.role || "user").toLowerCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="atelier-dashboard min-h-screen flex flex-col bg-[var(--color-paper)]">
      {/* Top Apparatus Bar */}
      <header className="atelier-dash-nav">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="atelier-logo">
            <div className="atelier-logo-stamp !w-7 !h-7">
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
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
            <span>Electron Gate</span>
          </Link>
          <span className="text-[var(--color-ink-dim)] font-mono text-xs hidden sm:inline">/</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[var(--color-atelier-brass)]">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Products</span>
          </Link>

          <Link
            href="/dashboard/documents"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Documents</span>
          </Link>

          <Link
            href="/dashboard"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Link
            href="/dashboard/upload"
            className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Docs</span>
          </Link>

          <div className="atelier-user-badge">
            <div className="atelier-avatar">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--color-ink)] max-w-[110px] truncate">
                {user.full_name || user.email}
              </span>
              <span className={`atelier-role-tag ${roleLower}`}>
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs"
            id="logout-btn"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Knowledge Chat Interface */}
      <main className="flex-1 flex flex-col w-full relative">
        <ElectronGateChat />
      </main>
    </div>
  );
}

export default function DashboardChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}
