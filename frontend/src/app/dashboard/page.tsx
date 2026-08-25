"use client";

import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Sparkles,
  MessageSquare,
  Search,
  LogOut,
  Users,
  Layers,
  Package,
  CreditCard,
  Truck,
  ShieldCheck,
  ShoppingBag,
  MapPin,
  FileText,
  Boxes,
} from "lucide-react";

interface PanelConfig {
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  stats: Array<{ label: string; value: string; sub: string; valColor?: string }>;
  actionsHeading: string;
  actions: Array<{ label: string; href: string; icon: React.ReactNode; primary?: boolean }>;
}

const ROLE_PANEL_CONFIGS: Record<string, PanelConfig> = {
  admin: {
    title: "Administrator Enclave Command",
    subtitle: "Manage user identities, security roles, fulfillment pipelines, and platform vectors",
    tag: "ROLE: ADMIN (FULL ACCESS)",
    tagColor: "bg-[var(--color-restricted-red)]",
    stats: [
      { label: "Total Vectors", value: "842,910", sub: "↑ +12.4k this week" },
      { label: "Identity & Roles", value: "Active", sub: "Enclave access verified", valColor: "text-[var(--color-atelier-brass)]" },
      { label: "Fulfillment Queue", value: "12 Orders", sub: "Pending dispatch" },
      { label: "Avg Search Time", value: "38.4ms", sub: "Within sub-50ms target", valColor: "text-[var(--color-terminal-cyan)]" },
    ],
    actionsHeading: "Administrative Governance",
    actions: [
      { label: "User Accounts", href: "/admin/users", icon: <Users className="w-4 h-4 text-[var(--color-atelier-brass)]" />, primary: true },
      { label: "Security Roles", href: "/admin/roles", icon: <Layers className="w-4 h-4 text-[var(--color-enclave-violet)]" /> },
      { label: "Orders Hub", href: "/admin/orders", icon: <Package className="w-4 h-4 text-[var(--color-terminal-cyan)]" /> },
      { label: "Payments", href: "/admin/payments", icon: <CreditCard className="w-4 h-4 text-[var(--color-terminal-green)]" /> },
      { label: "Shipments", href: "/admin/shipments", icon: <Truck className="w-4 h-4 text-[var(--color-atelier-amber)]" /> },
      { label: "Knowledge Docs", href: "/dashboard/documents", icon: <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" /> },
    ],
  },
  staff: {
    title: "Fulfillment & Document Operations",
    subtitle: "Process order lifecycles, manage carrier manifests, and review document accuracy",
    tag: "ROLE: STAFF (OPERATIONS)",
    tagColor: "bg-[var(--color-terminal-green)]",
    stats: [
      { label: "Queued Docs", value: "24", sub: "4 PDFs processing" },
      { label: "Processed Chunks", value: "4,812", sub: "512 tokens / chunk" },
      { label: "Search Alignment", value: "0.012", sub: "High semantic match", valColor: "text-[var(--color-terminal-green)]" },
      { label: "Top-3 Accuracy", value: "98.4%", sub: "bge-reranker score", valColor: "text-[var(--color-atelier-brass)]" },
    ],
    actionsHeading: "Fulfillment & Operations",
    actions: [
      { label: "Orders Hub", href: "/admin/orders", icon: <Package className="w-4 h-4 text-[var(--color-terminal-cyan)]" />, primary: true },
      { label: "Payments", href: "/admin/payments", icon: <CreditCard className="w-4 h-4 text-[var(--color-terminal-green)]" /> },
      { label: "Shipments", href: "/admin/shipments", icon: <Truck className="w-4 h-4 text-[var(--color-atelier-brass)]" /> },
      { label: "Test Retrieval", href: "/dashboard/chat", icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  user: {
    title: "Search & Query Workspace",
    subtitle: "Search across documents, explore answers, and track orders & addresses",
    tag: "ROLE: USER (STANDARD ACCESS)",
    tagColor: "bg-[var(--color-terminal-cyan)]",
    stats: [
      { label: "Total Searches", value: "34", sub: "All searches completed" },
      { label: "Saved Chunks", value: "8 Items", sub: "Saved for quick review" },
      { label: "Average Search Time", value: "18.2ms", sub: "Fast hybrid lookup", valColor: "text-[var(--color-terminal-green)]" },
      { label: "Cache Hit Rate", value: "92.6%", sub: "Cached search results", valColor: "text-[var(--color-atelier-brass)]" },
    ],
    actionsHeading: "Search & Customer Actions",
    actions: [
      { label: "Ask Assistant", href: "/dashboard/chat", icon: <MessageSquare className="w-4 h-4" />, primary: true },
      { label: "Browse Catalog", href: "/products", icon: <ShoppingBag className="w-4 h-4 text-[var(--color-terminal-cyan)]" /> },
      { label: "My Orders & Tracking", href: "/account/orders", icon: <Package className="w-4 h-4 text-[var(--color-atelier-brass)]" /> },
      { label: "Delivery Addresses", href: "/account/addresses", icon: <MapPin className="w-4 h-4 text-[var(--color-terminal-green)]" /> },
      { label: "Browse Documents", href: "/dashboard/documents", icon: <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" /> },
    ],
  },
};

function RoleStatsPanel({ role }: { role: string }) {
  const config = ROLE_PANEL_CONFIGS[role.toLowerCase()] || ROLE_PANEL_CONFIGS.user;

  return (
    <div className="atelier-panel">
      <div className="atelier-panel-header">
        <div className="atelier-panel-title-group">
          <div>
            <h2>{config.title}</h2>
            <p>{config.subtitle}</p>
          </div>
        </div>
        <div className="atelier-terminal-status-tag">
          <span className={`w-2 h-2 rounded-full ${config.tagColor}`} />
          <span>{config.tag}</span>
        </div>
      </div>

      <div className="atelier-stats-grid">
        {config.stats.map((stat, idx) => (
          <div key={stat.label} className="atelier-stat-card">
            <div className="atelier-stat-header">
              <span>{stat.label}</span>
              <span className="text-[var(--color-atelier-brass)]">[ 0{idx + 1} ]</span>
            </div>
            <div className={`atelier-stat-val ${stat.valColor || ""}`}>{stat.value}</div>
            <div className="atelier-stat-sub">
              <span>{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="font-mono text-xs text-[var(--color-ink-dim)] uppercase tracking-wider font-semibold">
        {config.actionsHeading}
      </div>
      <div className="atelier-actions-grid">
        {config.actions.map((act) => (
          <Link
            key={act.label}
            href={act.href}
            className={`atelier-action-btn ${act.primary ? "border-[var(--color-atelier-brass)]/50 text-[var(--color-atelier-brass)] font-semibold shadow-sm" : ""}`}
          >
            {act.icon}
            <span>{act.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const roleLower = (user.role || "user").toLowerCase();
  const isAdmin = roleLower === "admin";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="atelier-dashboard">
      {/* Background drafting grid & filament */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Bar */}
      <header className="atelier-dash-nav">
        <Link href="/" className="atelier-logo">
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
          <span>Electron Gate · Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className="atelier-btn atelier-btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)]"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Users</span>
              </Link>
              <Link
                href="/admin/roles"
                className="atelier-btn atelier-btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Roles</span>
              </Link>
            </>
          )}

          <Link
            href="/products"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </Link>

          <Link
            href="/dashboard/documents"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <span>Documents</span>
          </Link>

          <Link
            href="/dashboard/chat"
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </Link>

          <Link
            href="/dashboard/upload"
            className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </Link>

          <div className="atelier-user-badge">
            <div className="atelier-avatar">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--color-ink)]">{user.full_name || user.email}</span>
              <span className={`atelier-role-tag ${roleLower}`}>
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="atelier-btn atelier-btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            id="logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Intelligence Enclave Workspace */}
      <main className="atelier-dash-main relative z-10">
        <div className="atelier-welcome-banner">
          <div>
            <h1>
              Welcome,{" "}
              <span className="text-[var(--color-atelier-brass)]">
                {user.full_name || user.email.split("@")[0]}
              </span>
            </h1>
            <p>
              Signed in with <strong className="text-[var(--color-ink)] uppercase font-mono">{user.role}</strong> permissions.
            </p>
          </div>
          <div className="atelier-terminal-status-tag">
            <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
            <span>SESSION ACTIVE // AVERAGE SEARCH &lt; 40MS</span>
          </div>
        </div>

        <RoleStatsPanel role={roleLower} />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
