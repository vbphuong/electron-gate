/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiListRoles,
  type UserRead,
  type RoleRead,
} from "@/app/lib/api";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  ChevronRight,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Key,
  Mail,
  User,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [users, setUsers] = useState<UserRead[]>([]);
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create User Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createRoleId, setCreateRoleId] = useState<string>("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit User Modal states
  const [editingUser, setEditingUser] = useState<UserRead | null>(null);
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRoleId, setEditRoleId] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete User Confirmation Modal states
  const [deletingUser, setDeletingUser] = useState<UserRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Permission check
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  // Load data
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiListUsers(token),
        apiListRoles(token),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !createRoleId) {
        const defaultUserRole = rolesData.find((r) => r.role_name === "User") || rolesData[0];
        setCreateRoleId(defaultUserRole.role_id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load users or roles registry.");
    } finally {
      setIsLoading(false);
    }
  }, [token, createRoleId]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/dashboard");
      } else {
        loadData();
      }
    }
  }, [authLoading, currentUser, isAdmin, router, loadData]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        selectedRoleFilter === "all" ||
        (u.role_name || "").toLowerCase() === selectedRoleFilter.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        u.email.toLowerCase().includes(query) ||
        u.user_id.toLowerCase().includes(query) ||
        (u.role_name || "").toLowerCase().includes(query);

      return matchesRole && matchesQuery;
    });
  }, [users, selectedRoleFilter, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => (u.role_name || "").toLowerCase() === "admin").length;
    const staffCount = users.filter((u) => (u.role_name || "").toLowerCase() === "staff").length;
    const userCount = users.filter((u) => (u.role_name || "").toLowerCase() === "user").length;
    const customCount = total - (adminCount + staffCount + userCount);

    return { total, adminCount, staffCount, userCount, customCount };
  }, [users]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!createEmail.trim() || !createPassword.trim()) {
      setCreateError("Email and password are required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      const selectedRoleObj = roles.find((r) => r.role_id === createRoleId);
      await apiCreateUser(
        {
          email: createEmail.trim(),
          password: createPassword,
          role_id: createRoleId || undefined,
          role_name: selectedRoleObj?.role_name,
        },
        token
      );

      setActionSuccess(`User account ${createEmail.trim()} successfully provisioned.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setIsCreateModalOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      await loadData();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to provision user.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: UserRead) => {
    setEditingUser(u);
    setEditEmail(u.email);
    setEditRoleId(u.role_id);
    setEditPassword("");
    setEditError(null);
  };

  // Handle Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const selectedRoleObj = roles.find((r) => r.role_id === editRoleId);
      await apiUpdateUser(
        editingUser.user_id,
        {
          email: editEmail.trim() !== editingUser.email ? editEmail.trim() : undefined,
          role_id: editRoleId,
          role_name: selectedRoleObj?.role_name,
          password: editPassword.trim() ? editPassword : undefined,
        },
        token
      );

      setActionSuccess(`User account ${editingUser.email} updated successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update user account.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!token || !deletingUser) return;
    if (deletingUser.user_id === currentUser?.user_id) {
      setDeleteError("You cannot delete your own active administrator account.");
      return;
    }

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteUser(deletingUser.user_id, token);
      setActionSuccess(`User account ${deletingUser.email} permanently removed.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete user account.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Role Badge Formatter
  const renderRoleBadge = (roleName: string) => {
    const normalized = (roleName || "").toLowerCase();
    if (normalized === "admin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-atelier-brass)]/40 bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] font-mono text-[11px] font-semibold uppercase tracking-wider shadow-sm">
          <ShieldAlert className="w-3 h-3 text-[var(--color-atelier-brass)]" />
          ADMIN
        </span>
      );
    }
    if (normalized === "staff") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-terminal-cyan)]/40 bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] font-mono text-[11px] font-semibold uppercase tracking-wider shadow-sm">
          <ShieldCheck className="w-3 h-3 text-[var(--color-terminal-cyan)]" />
          STAFF
        </span>
      );
    }
    if (normalized === "user") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-terminal-green)]/30 bg-[var(--color-terminal-green)]/10 text-[var(--color-terminal-green)] font-mono text-[11px] font-medium uppercase tracking-wider">
          <User className="w-3 h-3 text-[var(--color-terminal-green)]" />
          USER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-enclave-violet)]/40 bg-[var(--color-enclave-violet)]/10 text-[var(--color-enclave-violet)] font-mono text-[11px] font-medium uppercase tracking-wider">
        <Shield className="w-3 h-3 text-[var(--color-enclave-violet)]" />
        {roleName || "CUSTOM"}
      </span>
    );
  };

  if (authLoading || (!currentUser && !error)) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[var(--color-ink-muted)] tracking-widest uppercase">
            Verifying enclave credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)]/20 selection:text-[var(--color-atelier-brass)]">
      {/* Visual Canvas Backdrop */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Top System Enclave Bar */}
      <header className="relative z-20 border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/90 backdrop-blur-md sticky top-0 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="font-fraunces text-xl font-bold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-atelier-brass)] transition-colors flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 bg-[var(--color-atelier-brass)] rounded-full animate-pulse shadow-[0_0_8px_var(--color-atelier-brass)]" />
            Electron Gate
          </Link>
          <span className="text-[var(--color-rule-active)] font-mono text-xs">/</span>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-atelier-brass)] font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            User & Role Governance
          </span>
        </div>

        {/* Global Admin Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 text-xs font-mono">
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Users
          </Link>
          <Link
            href="/admin/roles"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Roles
          </Link>
          <Link
            href="/admin/orders"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Orders
          </Link>
          <Link
            href="/admin/payments"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Payments
          </Link>
          <Link
            href="/admin/shipments"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Shipments
          </Link>
          <Link
            href="/products"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Storefront
          </Link>
        </nav>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right font-mono text-xs">
            <span className="text-[var(--color-ink)] font-semibold">{currentUser?.email}</span>
            <span className="text-[var(--color-atelier-brass)] uppercase tracking-wider text-[10px]">
              ROLE: {currentUser?.role}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-colors"
            title="Disconnect Terminal Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Banner Alerts */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/40 flex items-center justify-between text-[var(--color-terminal-green)] font-mono text-xs animate-in fade-in duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[var(--color-terminal-green)]/70 hover:text-[var(--color-terminal-green)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 flex items-center justify-between text-[var(--color-restricted-red)] font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-restricted-red)]/70 hover:text-[var(--color-restricted-red)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Section & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 bg-[var(--color-atelier-brass)] rounded-full" />
              AUTHENTICATION & ACCESS ROSTER
            </div>
            <h1 className="font-fraunces text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
              User Accounts & Credentials
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 max-w-2xl">
              Maintain system identity records, assign operational security scopes, and provision new administrator or staff accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all font-mono text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--color-atelier-brass)]" : ""}`} />
              Sync
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(212,163,115,0.25)] flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Provision User
            </button>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] flex flex-col justify-between">
            <span className="font-mono text-[11px] text-[var(--color-ink-dim)] uppercase tracking-wider">
              Total Roster
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-mono text-2xl font-bold text-[var(--color-ink)]">
                {stats.total}
              </span>
              <Users className="w-4 h-4 text-[var(--color-ink-dim)]" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/20 flex flex-col justify-between">
            <span className="font-mono text-[11px] text-[var(--color-atelier-brass)] uppercase tracking-wider">
              Administrators
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-mono text-2xl font-bold text-[var(--color-atelier-brass)]">
                {stats.adminCount}
              </span>
              <ShieldAlert className="w-4 h-4 text-[var(--color-atelier-brass)]/60" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-terminal-cyan)]/20 flex flex-col justify-between">
            <span className="font-mono text-[11px] text-[var(--color-terminal-cyan)] uppercase tracking-wider">
              Staff Enclave
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-mono text-2xl font-bold text-[var(--color-terminal-cyan)]">
                {stats.staffCount}
              </span>
              <ShieldCheck className="w-4 h-4 text-[var(--color-terminal-cyan)]/60" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-terminal-green)]/20 flex flex-col justify-between">
            <span className="font-mono text-[11px] text-[var(--color-terminal-green)] uppercase tracking-wider">
              Standard Users
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-mono text-2xl font-bold text-[var(--color-terminal-green)]">
                {stats.userCount}
              </span>
              <User className="w-4 h-4 text-[var(--color-terminal-green)]/60" />
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "Admin", "Staff", "User"].map((roleName) => (
              <button
                key={roleName}
                onClick={() => setSelectedRoleFilter(roleName)}
                className={`px-3 py-1.5 rounded font-mono text-xs transition-all uppercase tracking-wider whitespace-nowrap ${
                  selectedRoleFilter === roleName
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold shadow-sm"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]"
                }`}
              >
                {roleName === "all" ? "ALL ROLES" : roleName}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search by email, role, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Users Roster Table */}
        <div className="rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/60 text-[var(--color-ink-dim)] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-medium">User Identity & Email</th>
                  <th className="py-3.5 px-4 font-medium">Assigned Role</th>
                  <th className="py-3.5 px-4 font-medium hidden sm:table-cell">Account ID</th>
                  <th className="py-3.5 px-4 font-medium hidden md:table-cell">Enrolled On</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--color-ink-dim)]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-atelier-brass)]" />
                        <span>Querying identity records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--color-ink-dim)]">
                      <div className="flex flex-col items-center gap-2">
                        <User className="w-8 h-8 opacity-30" />
                        <span>No user accounts matched the filter criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.user_id === currentUser?.user_id;
                    return (
                      <tr
                        key={u.user_id}
                        className="hover:bg-[var(--color-paper-hover)]/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-atelier-brass)] font-bold text-xs uppercase shrink-0">
                              {u.email.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--color-ink)]">
                                  {u.email}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded bg-[var(--color-atelier-brass)]/20 text-[var(--color-atelier-brass)] text-[9px] uppercase font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--color-ink-dim)] font-mono sm:hidden">
                                {u.user_id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {renderRoleBadge(u.role_name)}
                        </td>

                        <td className="py-3.5 px-4 hidden sm:table-cell text-[var(--color-ink-muted)] text-[11px]">
                          {u.user_id}
                        </td>

                        <td className="py-3.5 px-4 hidden md:table-cell text-[var(--color-ink-dim)] text-[11px]">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-atelier-brass)] transition-all flex items-center gap-1 text-[11px]"
                              title="Modify Role or Password"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setDeletingUser(u);
                                setDeleteError(null);
                              }}
                              disabled={isSelf}
                              className="px-2.5 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-all flex items-center gap-1 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? "Cannot delete active session account" : "Delete Account"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-[var(--color-paper-terminal)]/60 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] font-mono text-[var(--color-ink-dim)]">
            <span>Showing {filteredUsers.length} of {users.length} enrolled users</span>
            <Link
              href="/admin/roles"
              className="text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
            >
              <span>Manage Role Definitions</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* ── CREATE USER MODAL ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Provision New User
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    Create credentials and assign security enclave scope
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {createError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
                  <input
                    type="email"
                    required
                    placeholder="operator@electrongate.internal"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Password *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
                  <input
                    type="password"
                    required
                    placeholder="Enter strong security passphrase"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Role Assignment *
                </label>
                <select
                  value={createRoleId}
                  onChange={(e) => setCreateRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ──────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-rule-active)] rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Modify User Record
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    ID: {editingUser.user_id.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {editError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Assigned Security Role
                </label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Reset Password (Leave blank to keep current)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
                  <input
                    type="password"
                    placeholder="Enter new password to override"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE USER CONFIRMATION MODAL ────────────────────────────────── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)] border-b border-[var(--color-rule)] pb-4">
              <div className="p-2 rounded-lg bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  Confirm De-provisioning
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                  Irreversible administrative deletion
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-[var(--color-ink-muted)] font-mono leading-relaxed">
              Are you sure you want to permanently delete user account{" "}
              <strong className="text-[var(--color-ink)]">{deletingUser.email}</strong>?
              This will revoke all active JWT tokens and remove this account from the database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-rule)] font-mono text-xs">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded bg-[var(--color-restricted-red)] hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
