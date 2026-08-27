/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetDeliveryProviders,
  apiCreateDeliveryProvider,
  apiUpdateDeliveryProvider,
  apiDeleteDeliveryProvider,
  type DeliveryProviderRead,
} from "@/app/lib/api";
import {
  Truck,
  Send,
  Phone,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Check,
  Power,
  Shield,
  PhoneCall,
  Activity,
  Layers,
  ArrowUpDown,
} from "lucide-react";

export default function AdminDeliveryProvidersPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [providers, setProviders] = useState<DeliveryProviderRead[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createPhone, setCreatePhone] = useState<string>("");
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal state
  const [editingProvider, setEditingProvider] = useState<DeliveryProviderRead | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingProvider, setDeletingProvider] = useState<DeliveryProviderRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Role permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Fetch providers
  const loadProviders = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Backend: staff/admin can retrieve all providers (or filter with is_active)
      const data = await apiGetDeliveryProviders(token);
      setProviders(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load delivery providers.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (!isAuthorized) {
        router.replace("/dashboard");
      } else {
        loadProviders();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadProviders]);

  // Filtered providers
  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return providers.filter((p) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "active"
          ? p.is_active
          : !p.is_active;

      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q));

      return matchesTab && matchesQuery;
    });
  }, [providers, activeTab, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = providers.length;
    const active = providers.filter((p) => p.is_active).length;
    const inactive = total - active;
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, inactive, activePercent };
  }, [providers]);

  // ── CREATE HANDLER ────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setCreateName("");
    setCreatePhone("");
    setCreateIsActive(true);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    if (!createName.trim()) {
      setCreateError("Provider name is required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await apiCreateDeliveryProvider(
        {
          name: createName.trim(),
          phone: createPhone.trim() || null,
          is_active: createIsActive,
        },
        token
      );
      setActionSuccess(`Delivery carrier "${createName.trim()}" created successfully.`);
      setIsCreateModalOpen(false);
      loadProviders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create delivery provider.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // ── EDIT HANDLER ──────────────────────────────────────────────────────────
  const handleOpenEdit = (p: DeliveryProviderRead) => {
    setEditingProvider(p);
    setEditName(p.name);
    setEditPhone(p.phone || "");
    setEditIsActive(p.is_active);
    setEditError(null);
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingProvider || !isAdmin) return;
    if (!editName.trim()) {
      setEditError("Provider name cannot be empty.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await apiUpdateDeliveryProvider(
        editingProvider.provider_id,
        {
          name: editName.trim(),
          phone: editPhone.trim() || null,
          is_active: editIsActive,
        },
        token
      );
      setActionSuccess(`Carrier "${editName.trim()}" updated successfully.`);
      setEditingProvider(null);
      loadProviders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update delivery provider.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ── QUICK TOGGLE ACTIVE STATUS ────────────────────────────────────────────
  const handleToggleActive = async (p: DeliveryProviderRead) => {
    if (!token || !isAdmin) return;
    try {
      await apiUpdateDeliveryProvider(
        p.provider_id,
        { is_active: !p.is_active },
        token
      );
      setActionSuccess(`Carrier "${p.name}" status switched to ${!p.is_active ? "ACTIVE" : "INACTIVE"}.`);
      loadProviders();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to change provider status.");
    }
  };

  // ── DELETE HANDLER ────────────────────────────────────────────────────────
  const handleOpenDelete = (p: DeliveryProviderRead) => {
    setDeletingProvider(p);
    setDeleteError(null);
  };

  const handleDeleteProvider = async () => {
    if (!token || !deletingProvider || !isAdmin) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteDeliveryProvider(deletingProvider.provider_id, token);
      setActionSuccess(`Carrier "${deletingProvider.name}" removed permanently.`);
      setDeletingProvider(null);
      loadProviders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete delivery provider.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <Send className="w-3.5 h-3.5" />
              Logistics & Fulfillment Infrastructure
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Delivery Providers
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Manage contracted third-party logistics (3PL) carriers, express couriers, and dispatch availability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProviders}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Providers"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-1.5 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Register Carrier
              </button>
            )}
          </div>
        </div>

        {/* Feedback alerts */}
        {actionSuccess && (
          <div className="p-3.5 bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/30 rounded flex items-center justify-between font-mono text-xs text-[var(--color-terminal-green)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded flex items-center justify-between font-mono text-xs text-[var(--color-restricted-red)]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">Total Carriers</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{metrics.total}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-green)]">Operational (Active)</span>
            <span className="text-xl font-bold text-[var(--color-terminal-green)] mt-1">{metrics.active}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-restricted-red)]">Deactivated</span>
            <span className="text-xl font-bold text-[var(--color-restricted-red)] mt-1">{metrics.inactive}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-atelier-brass)]">Fleet Availability</span>
            <span className="text-xl font-bold text-[var(--color-atelier-brass)] mt-1">{metrics.activePercent}%</span>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-1 bg-[var(--color-paper-card)] border border-[var(--color-rule)] p-1 rounded">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "all"
                  ? "bg-[var(--color-paper-sub)] text-[var(--color-atelier-brass)] font-bold border border-[var(--color-rule)]"
                  : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "active"
                  ? "bg-[var(--color-paper-sub)] text-[var(--color-terminal-green)] font-bold border border-[var(--color-rule)]"
                  : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              Active ({metrics.active})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "inactive"
                  ? "bg-[var(--color-paper-sub)] text-[var(--color-restricted-red)] font-bold border border-[var(--color-rule)]"
                  : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              Inactive ({metrics.inactive})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search carrier or telephone hotline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded pl-8 pr-3 py-2 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Carrier Cards Grid */}
        {isLoading && providers.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-ink-dim)] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span className="font-mono text-xs">Loading logistics fleet records...</span>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="py-16 border border-dashed border-[var(--color-rule)] rounded-lg text-center flex flex-col items-center justify-center gap-3 text-[var(--color-ink-muted)] bg-[var(--color-paper-card)] font-mono text-xs">
            <Truck className="w-8 h-8 text-[var(--color-ink-dim)] opacity-40" />
            <span className="font-semibold text-sm text-[var(--color-ink)]">No delivery carriers found</span>
            <p className="text-[11px] text-[var(--color-ink-dim)] max-w-sm">
              {searchQuery
                ? "No delivery providers match your current search query."
                : "No delivery providers registered in this view."}
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 px-3 py-1.5 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded text-xs hover:bg-[var(--color-atelier-amber)] transition-colors"
              >
                + Register First Carrier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {filteredProviders.map((p) => (
              <div
                key={p.provider_id}
                className={`bg-[var(--color-paper-card)] border rounded-lg p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-xs ${
                  p.is_active
                    ? "border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]"
                    : "border-[var(--color-rule)] opacity-75 bg-[var(--color-paper-sub)]/50"
                }`}
              >
                {/* Top: Icon + Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                        p.is_active
                          ? "bg-[var(--color-atelier-brass)]/15 border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)]"
                          : "bg-[var(--color-paper-terminal)] border-[var(--color-rule)] text-[var(--color-ink-dim)]"
                      }`}
                    >
                      <Truck className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)] truncate">
                        {p.name}
                      </h3>
                      <span className="text-[10px] font-mono text-[var(--color-ink-dim)] truncate block">
                        UUID: {p.provider_id.slice(0, 8)}...{p.provider_id.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {/* Operational Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold border shrink-0 ${
                      p.is_active
                        ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border-[var(--color-terminal-green)]/30"
                        : "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border-[var(--color-restricted-red)]/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.is_active
                          ? "bg-[var(--color-terminal-green)] animate-pulse"
                          : "bg-[var(--color-restricted-red)]"
                      }`}
                    />
                    {p.is_active ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Middle: Hotline Contact info */}
                <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[var(--color-ink-dim)]">
                    <Phone className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
                    <span className="text-[11px]">Support Hotline:</span>
                  </div>

                  {p.phone ? (
                    <a
                      href={`tel:${p.phone}`}
                      className="font-bold text-[var(--color-ink)] hover:text-[var(--color-atelier-brass)] transition-colors"
                    >
                      {p.phone}
                    </a>
                  ) : (
                    <span className="text-[var(--color-ink-dim)] italic">Not registered</span>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-rule)] text-xs">
                  {isAdmin ? (
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        p.is_active
                          ? "border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] hover:bg-[var(--color-restricted-red)]/10"
                          : "border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] hover:bg-[var(--color-terminal-green)]/10"
                      }`}
                      title={p.is_active ? "Deactivate Carrier" : "Activate Carrier"}
                    >
                      <Power className="w-3 h-3" />
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-[var(--color-ink-dim)]">Read only</span>
                  )}

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-sub)] transition-colors"
                        title="Edit Provider"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(p)}
                        className="p-1.5 rounded border border-[var(--color-rule)] hover:border-[var(--color-restricted-red)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE CARRIER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Truck className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Register Logistics Carrier
                </span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProvider} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Carrier Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FedEx Express, DHL Global, VNPost, GHTK"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Support Hotline / Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 1800-5858, +84 1900 1234"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-atelier-brass)] cursor-pointer"
                />
                <label htmlFor="create-active" className="text-xs text-[var(--color-ink)] cursor-pointer">
                  Activate carrier immediately for customer checkout
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !createName.trim()}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Save Carrier"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CARRIER MODAL */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Edit2 className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Edit Delivery Carrier
                </span>
              </div>
              <button
                onClick={() => setEditingProvider(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProvider} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Carrier Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Support Hotline / Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 1800-5858"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-atelier-brass)] cursor-pointer"
                />
                <label htmlFor="edit-active" className="text-xs text-[var(--color-ink)] cursor-pointer">
                  Carrier is active for order fulfillment and customer selection
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || !editName.trim()}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Carrier"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CARRIER MODAL */}
      {deletingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Delete Carrier?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Permanent contract removal</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Are you sure you want to permanently delete carrier <strong className="text-[var(--color-ink)]">"{deletingProvider.name}"</strong>?
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded text-[11px] text-[var(--color-ink-dim)]">
              ⚠️ Note: The backend will reject deletion if this provider is currently assigned to existing shipments. To stop new orders without breaking history, deactivate it instead.
            </div>

            {deleteError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setDeletingProvider(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProvider}
                disabled={isSubmittingDelete}
                className="px-4 py-2 bg-[var(--color-restricted-red)] text-white font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
