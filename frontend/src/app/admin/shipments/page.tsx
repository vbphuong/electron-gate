/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListShipments,
  apiCreateShipment,
  apiUpdateShipment,
  apiGetDeliveryProviders,
  type ShipmentRead,
  type DeliveryProviderRead,
} from "@/app/lib/api";
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  Check,
  ExternalLink,
  Edit3,
  Copy,
  Navigation,
  Package,
} from "lucide-react";

const SHIPMENT_STATUS_TABS = [
  { key: "all", label: "ALL MANIFESTS" },
  { key: "pending", label: "PENDING" },
  { key: "picked_up", label: "PICKED UP" },
  { key: "in_transit", label: "IN TRANSIT" },
  { key: "delivered", label: "DELIVERED" },
];

function AdminShipmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order_id") || "";

  const { user, token, logout, isLoading: authLoading } = useAuth();

  // State
  const [shipments, setShipments] = useState<ShipmentRead[]>([]);
  const [providers, setProviders] = useState<DeliveryProviderRead[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(initialOrderId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    order_id: initialOrderId,
    delivery_provider_id: "",
    tracking_number: "",
    status: "pending",
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Edit Modal
  const [editingShipment, setEditingShipment] = useState<ShipmentRead | null>(null);
  const [editForm, setEditForm] = useState({
    delivery_provider_id: "",
    tracking_number: "",
    status: "pending",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Role validation
  const userRole = (user?.role || "").toLowerCase();
  const isAuthorized = userRole === "admin" || userRole === "staff";

  // Load Shipments and Delivery Providers
  const loadShipmentData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [shipmentsData, providersData] = await Promise.all([
        apiListShipments(token, {
          status: selectedStatus === "all" ? undefined : selectedStatus,
        }),
        apiGetDeliveryProviders(token).catch(() => [] as DeliveryProviderRead[]),
      ]);
      setShipments(shipmentsData);
      setProviders(providersData);

      if (providersData.length > 0 && !createForm.delivery_provider_id) {
        setCreateForm((prev) => ({
          ...prev,
          delivery_provider_id: providersData[0].provider_id,
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load carrier manifests."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedStatus, createForm.delivery_provider_id]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isAuthorized) {
        router.push("/dashboard");
      } else {
        loadShipmentData();
      }
    }
  }, [authLoading, user, isAuthorized, router, loadShipmentData]);

  // Copy helper
  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(code);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  // Create Shipment
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!createForm.order_id.trim()) {
      setError("Order UUID is required.");
      return;
    }
    if (!createForm.delivery_provider_id) {
      setError("Please select a delivery provider.");
      return;
    }

    setIsSubmittingCreate(true);
    setError(null);
    try {
      await apiCreateShipment(
        {
          order_id: createForm.order_id.trim(),
          delivery_provider_id: createForm.delivery_provider_id,
          tracking_number:
            createForm.tracking_number.trim() ||
            `VN-${createForm.order_id.slice(0, 8).toUpperCase()}`,
          status: createForm.status,
        },
        token
      );
      setActionSuccess("Shipment manifest provisioned successfully.");
      setIsCreateModalOpen(false);
      setCreateForm({
        order_id: "",
        delivery_provider_id: providers[0]?.provider_id || "",
        tracking_number: "",
        status: "pending",
      });
      await loadShipmentData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create shipment. An active shipment may already exist for this order."
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Quick Advance Milestone
  const handleAdvanceStatus = async (shipmentId: string, nextStatus: string) => {
    if (!token) return;
    try {
      await apiUpdateShipment(
        shipmentId,
        {
          status: nextStatus,
          delivered_at: nextStatus === "delivered" ? new Date().toISOString() : undefined,
        },
        token
      );
      setActionSuccess(`Carrier transit milestone updated to [${nextStatus.toUpperCase()}].`);
      await loadShipmentData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update shipment status."
      );
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (s: ShipmentRead) => {
    setEditingShipment(s);
    setEditForm({
      delivery_provider_id: s.delivery_provider_id,
      tracking_number: s.tracking_number || "",
      status: s.status,
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingShipment) return;
    setIsSubmittingEdit(true);
    try {
      await apiUpdateShipment(
        editingShipment.shipment_id,
        {
          delivery_provider_id: editForm.delivery_provider_id,
          tracking_number: editForm.tracking_number.trim(),
          status: editForm.status,
          delivered_at:
            editForm.status === "delivered" && !editingShipment.delivered_at
              ? new Date().toISOString()
              : undefined,
        },
        token
      );
      setActionSuccess("Shipment manifest updated.");
      setEditingShipment(null);
      await loadShipmentData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update shipment record."
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Filtered Shipments
  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase().trim();
    return shipments.filter(
      (s) =>
        s.shipment_id.toLowerCase().includes(q) ||
        s.order_id.toLowerCase().includes(q) ||
        (s.tracking_number && s.tracking_number.toLowerCase().includes(q)) ||
        (s.delivery_provider_name && s.delivery_provider_name.toLowerCase().includes(q))
    );
  }, [shipments, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === "pending").length;
    const inTransit = shipments.filter((s) => s.status === "in_transit" || s.status === "picked_up").length;
    const delivered = shipments.filter((s) => s.status === "delivered").length;
    const activeProvidersCount = providers.filter((p) => p.is_active).length;

    return { total, pending, inTransit, delivered, activeProvidersCount };
  }, [shipments, providers]);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background canvas grid & filament */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-paper)]/90 backdrop-blur-md border-b border-[var(--color-rule)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="atelier-logo-stamp !w-9 !h-9 group-hover:border-[var(--color-atelier-brass)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
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
              <div className="flex flex-col">
                <span className="font-fraunces font-bold text-sm tracking-tight text-[var(--color-ink)]">
                  ELECTRON GATE
                </span>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)] tracking-widest uppercase">
                  CARRIER DISPATCH · SECTION 10.2
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[var(--color-rule)] text-xs font-mono">
              <Link
                href="/admin/orders"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                ORDERS HUB
              </Link>
              <Link
                href="/admin/payments"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                PAYMENTS
              </Link>
              <Link
                href="/admin/shipments"
                className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)] border border-[var(--color-rule-active)] font-medium"
              >
                SHIPMENTS
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                DASHBOARD
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[var(--color-ink-dim)]">
            <span className="px-2.5 py-0.5 rounded bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/30 text-[var(--color-restricted-red)] font-bold uppercase">
              {user?.role} ACCESS
            </span>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-rule)]">
                <span className="hidden sm:inline">{user.email}</span>
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded hover:text-[var(--color-restricted-red)] transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Carrier Manifests Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-terminal-green)]">
              <span>● CARRIER TELEMETRY LOGISTICS</span>
              <span className="text-[var(--color-rule)]">/</span>
              <span>SECTION 10.2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight">
              Carrier Dispatch Console
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={loadShipmentData}
              className="atelier-btn atelier-btn-ghost !py-2 !px-4 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Sync Telemetry</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="atelier-btn atelier-btn-primary !py-2 !px-4 flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shipment</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Active Manifests</div>
            <div className="text-2xl font-bold text-[var(--color-ink)]">{metrics.total}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Carrier orders</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">In Transit</div>
            <div className="text-2xl font-bold text-[var(--color-terminal-cyan)]">{metrics.inTransit}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">En route to nodes</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Delivered &amp; Settled</div>
            <div className="text-2xl font-bold text-[var(--color-terminal-green)]">{metrics.delivered}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Receipts confirmed</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Carrier Network</div>
            <div className="text-2xl font-bold text-[var(--color-atelier-brass)]">{metrics.activeProvidersCount}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Active logistics providers</div>
          </div>
        </section>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-lg bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] font-mono text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] font-mono text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-xs scrollbar-none">
            {SHIPMENT_STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3 py-1.5 rounded uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === tab.key
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] shadow-sm"
                    : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)] border border-[var(--color-rule)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Tracking #, Order UUID..."
              className="w-full pl-9 pr-4 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] font-mono text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
            />
          </div>
        </div>

        {/* Manifest Table */}
        <section className="atelier-plate rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
              <span>Scanning carrier dispatch network telemetry...</span>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-16 text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
              <Truck className="w-8 h-8 mx-auto opacity-40" />
              <p>No carrier shipments found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-terminal)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Tracking Code</th>
                    <th className="py-3.5 px-4 font-semibold">Delivery Provider</th>
                    <th className="py-3.5 px-4 font-semibold">Linked Order</th>
                    <th className="py-3.5 px-4 font-semibold">Transit Milestone</th>
                    <th className="py-3.5 px-4 font-semibold">Delivered At</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Carrier Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                  {filteredShipments.map((s) => {
                    const isDelivered = s.status === "delivered";
                    const isInTransit = s.status === "in_transit";
                    const isPickedUp = s.status === "picked_up";
                    const isPending = s.status === "pending";

                    return (
                      <tr
                        key={s.shipment_id}
                        className="hover:bg-[var(--color-paper-hover)] transition-colors"
                      >
                        {/* Tracking Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[var(--color-atelier-brass)]">
                              {s.tracking_number || "PENDING"}
                            </span>
                            {s.tracking_number && (
                              <button
                                onClick={() => handleCopyTracking(s.tracking_number!)}
                                className="p-1 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                                title="Copy tracking number"
                              >
                                {copiedTracking === s.tracking_number ? (
                                  <Check className="w-3.5 h-3.5 text-[var(--color-terminal-green)]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="py-3.5 px-4 font-semibold text-[var(--color-ink)]">
                          {s.delivery_provider_name || "Enclave Express"}
                        </td>

                        {/* Order ID */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/admin/orders`}
                            className="text-[var(--color-terminal-cyan)] hover:underline flex items-center gap-1"
                          >
                            <span>{s.order_id.slice(0, 8)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDelivered
                                ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                                : isInTransit
                                ? "bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] border border-[var(--color-terminal-cyan)]/30"
                                : isPickedUp
                                ? "bg-[var(--color-atelier-brass)]/15 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30"
                                : "bg-[var(--color-atelier-amber)]/15 text-[var(--color-atelier-amber)] border border-[var(--color-atelier-amber)]/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDelivered
                                  ? "bg-[var(--color-terminal-green)]"
                                  : "bg-[var(--color-terminal-cyan)] animate-pulse"
                              }`}
                            />
                            <span>{s.status}</span>
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-[var(--color-ink-muted)]">
                          {s.delivered_at
                            ? new Date(s.delivered_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleAdvanceStatus(s.shipment_id, "picked_up")}
                                className="px-2.5 py-1 rounded bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-brass)]/25 text-[10px] font-semibold"
                              >
                                Pick Up
                              </button>
                            )}

                            {isPickedUp && (
                              <button
                                onClick={() => handleAdvanceStatus(s.shipment_id, "in_transit")}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-cyan)]/15 border border-[var(--color-terminal-cyan)]/30 text-[var(--color-terminal-cyan)] hover:bg-[var(--color-terminal-cyan)]/25 text-[10px] font-semibold"
                              >
                                Dispatch
                              </button>
                            )}

                            {isInTransit && (
                              <button
                                onClick={() => handleAdvanceStatus(s.shipment_id, "delivered")}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/30 text-[var(--color-terminal-green)] hover:bg-[var(--color-terminal-green)]/25 text-[10px] font-semibold"
                              >
                                Deliver
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]"
                              title="Edit shipment"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Create Shipment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-md p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
              <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                Provision Carrier Shipment Manifest
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Order UUID</label>
                <input
                  type="text"
                  value={createForm.order_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, order_id: e.target.value })
                  }
                  placeholder="e.g. 6ba7b810-9dad-11d1-80b4-00c04fd430c8"
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Delivery Logistics Provider</label>
                <select
                  value={createForm.delivery_provider_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, delivery_provider_id: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                >
                  {providers.map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>
                      {p.name} {p.phone ? `(${p.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">
                  Carrier Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  value={createForm.tracking_number}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, tracking_number: e.target.value })
                  }
                  placeholder="e.g. VN-FEDEX-948201"
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Initial Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                >
                  <option value="pending">pending</option>
                  <option value="picked_up">picked_up</option>
                  <option value="in_transit">in_transit</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="atelier-btn atelier-btn-ghost !py-1.5 !px-3"
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="atelier-btn atelier-btn-primary !py-1.5 !px-4 flex items-center gap-1.5"
                  disabled={isSubmittingCreate}
                >
                  {isSubmittingCreate ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Create Manifest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shipment Modal */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-md p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
              <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                Modify Carrier Manifest
              </h3>
              <button
                onClick={() => setEditingShipment(null)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Carrier Provider</label>
                <select
                  value={editForm.delivery_provider_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, delivery_provider_id: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                >
                  {providers.map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Tracking Number</label>
                <input
                  type="text"
                  value={editForm.tracking_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tracking_number: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Transit Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                >
                  <option value="pending">pending</option>
                  <option value="picked_up">picked_up</option>
                  <option value="in_transit">in_transit</option>
                  <option value="delivered">delivered</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="atelier-btn atelier-btn-ghost !py-1.5 !px-3"
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="atelier-btn atelier-btn-primary !py-1.5 !px-4 flex items-center gap-1.5"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE LOGISTICS &amp; TELEMETRY · SECTION 10.2</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}

export default function AdminShipmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col items-center justify-center font-mono text-xs space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <span>Synchronizing carrier telemetry...</span>
        </div>
      }
    >
      <AdminShipmentsContent />
    </Suspense>
  );
}
