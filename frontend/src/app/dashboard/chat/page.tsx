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
