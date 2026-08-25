/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetOrders,
  apiGetOrderById,
  apiUpdateOrder,
  apiAddOrderHistory,
  apiGetOrderShipment,
  apiGetOrderPayment,
  type OrderListItem,
  type OrderRead,
  type OrderHistoryRead,
  type ShipmentRead,
  type PaymentRead,
} from "@/app/lib/api";
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ShieldAlert,
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  ChevronRight,
  AlertCircle,
  CreditCard,
  MapPin,
  X,
  FileText,
  Boxes,
  ShieldCheck,
  Check,
  Cpu,
  Plus,
} from "lucide-react";

const STATUS_OPTIONS = [
  { key: "all", label: "ALL ORDERS" },
  { key: "pending", label: "PENDING" },
  { key: "confirmed", label: "CONFIRMED" },
  { key: "processing", label: "PROCESSING" },
  { key: "shipped", label: "SHIPPED" },
  { key: "delivered", label: "DELIVERED" },
  { key: "cancelled", label: "CANCELLED" },
];

export default function AdminOrdersManagementPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Orders list state
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Order detail modal state
  const [activeOrder, setActiveOrder] = useState<OrderRead | null>(null);
  const [activeShipment, setActiveShipment] = useState<ShipmentRead | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentRead | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // History append modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyForm, setHistoryForm] = useState({
    recipient_name: "",
    address_line: "",
    city_name: "",
    country_name: "",
    phone: "",
  });
  const [isSubmittingHistory, setIsSubmittingHistory] = useState<boolean>(false);

  // Role validation
  const userRole = (user?.role || "").toLowerCase();
  const isAuthorized = userRole === "admin" || userRole === "staff";

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetOrders(token, {
        status: selectedStatus === "all" ? undefined : selectedStatus,
      });
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load orders ledger."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedStatus]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isAuthorized) {
        router.push("/dashboard");
      } else {
        loadOrders();
      }
    }
  }, [authLoading, user, isAuthorized, router, loadOrders]);

  // Open Order Detail Drawer / Modal
  const handleOpenOrderDetail = async (orderId: string) => {
    if (!token) return;
    setIsDetailLoading(true);
    try {
      const [orderRes, shipmentRes, paymentRes] = await Promise.all([
        apiGetOrderById(orderId, token),
        apiGetOrderShipment(orderId, token).catch(() => null),
        apiGetOrderPayment(orderId, token).catch(() => null),
      ]);
      setActiveOrder(orderRes);
      setActiveShipment(shipmentRes);
      setActivePayment(paymentRes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load order details."
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Update Order Status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await apiUpdateOrder(orderId, { order_status: newStatus }, token);
      setActionSuccess(`Order status transitioned to [${newStatus.toUpperCase()}].`);
      await loadOrders();
      if (activeOrder && activeOrder.order_id === orderId) {
        setActiveOrder((prev) => (prev ? { ...prev, order_status: newStatus } : null));
      }
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update order status."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Order History Append
  const handleAppendHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeOrder) return;
    setIsSubmittingHistory(true);
    try {
      await apiAddOrderHistory(activeOrder.order_id, historyForm, token);
      setActionSuccess("Order snapshot history event appended.");
      setIsHistoryModalOpen(false);
      // Reload active order
      const refreshedOrder = await apiGetOrderById(activeOrder.order_id, token);
      setActiveOrder(refreshedOrder);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to append order history."
      );
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  // Filtered orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.order_id.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  // Telemetry metrics calculation
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.order_status === "pending").length;
    const confirmed = orders.filter((o) => o.order_status === "confirmed").length;
    const processing = orders.filter((o) => o.order_status === "processing").length;
    const shipped = orders.filter((o) => o.order_status === "shipped").length;
    const delivered = orders.filter((o) => o.order_status === "delivered").length;
    const revenue = orders
      .filter((o) => o.order_status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.subtotal || 0), 0);

    return { total, pending, confirmed, processing, shipped, delivered, revenue };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background canvas grid & filament */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Bar */}
      

      {/* Main Governance Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col space-y-6">
        {/* Header Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-terminal-cyan)]">
              <span>● FULFILLMENT STATE MACHINE</span>
              <span className="text-[var(--color-rule)]">/</span>
              <span>RESTful LEDGER SYNC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight">
              Order Fulfillment &amp; Lifecycle Hub
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={loadOrders}
              className="atelier-btn atelier-btn-ghost !py-2 !px-4 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] flex items-center gap-2"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Sync Ledger</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Ledger</div>
            <div className="text-xl font-bold text-[var(--color-ink)]">{metrics.total}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Recorded orders</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Pending Auth</div>
            <div className="text-xl font-bold text-[var(--color-atelier-amber)]">{metrics.pending}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Awaiting check</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Enclave Verified</div>
            <div className="text-xl font-bold text-[var(--color-terminal-cyan)]">{metrics.confirmed}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Stock reserved</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">In Assembly</div>
            <div className="text-xl font-bold text-[var(--color-atelier-brass)]">{metrics.processing}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Packaging line</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">In Transit</div>
            <div className="text-xl font-bold text-[var(--color-terminal-green)]">{metrics.shipped}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Carrier dispatch</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Net Settled</div>
            <div className="text-lg font-bold text-[var(--color-atelier-brass)] truncate">
              ${metrics.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Gross volume</div>
          </div>
        </section>

        {/* Action / Error Feedback */}
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

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-xs scrollbar-none">
            {STATUS_OPTIONS.map((tab) => (
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

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order # or UUID..."
              className="w-full pl-9 pr-4 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] font-mono text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
            />
          </div>
        </div>

        {/* Orders Table */}
        <section className="atelier-plate rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
              <span>Scanning PostgreSQL orders ledger...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
              <Package className="w-8 h-8 mx-auto opacity-40" />
              <p>No orders found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-terminal)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Order Number</th>
                    <th className="py-3.5 px-4 font-semibold">Registration Date</th>
                    <th className="py-3.5 px-4 font-semibold">Configurations</th>
                    <th className="py-3.5 px-4 font-semibold">Subtotal</th>
                    <th className="py-3.5 px-4 font-semibold">Lifecycle Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                  {filteredOrders.map((ord) => {
                    const isPending = ord.order_status === "pending";
                    const isConfirmed = ord.order_status === "confirmed";
                    const isProcessing = ord.order_status === "processing";
                    const isShipped = ord.order_status === "shipped";
                    const isDelivered = ord.order_status === "delivered";
                    const isCancelled = ord.order_status === "cancelled";

                    return (
                      <tr
                        key={ord.order_id}
                        className="hover:bg-[var(--color-paper-hover)] transition-colors group"
                      >
                        {/* Order Number */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenOrderDetail(ord.order_id)}
                            className="font-bold text-[var(--color-ink)] hover:text-[var(--color-atelier-brass)] transition-colors text-left"
                          >
                            <div>{ord.order_number}</div>
                            <div className="text-[10px] text-[var(--color-ink-dim)] truncate max-w-[140px]">
                              {ord.order_id.slice(0, 8)}
                            </div>
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[var(--color-ink-muted)]">
                          {ord.created_at
                            ? new Date(ord.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 text-[var(--color-ink)]">
                          {ord.item_count} Units
                        </td>

                        {/* Subtotal */}
                        <td className="py-3.5 px-4 font-bold text-[var(--color-atelier-brass)]">
                          ${Number(ord.subtotal).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDelivered
                                ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                                : isShipped
                                ? "bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] border border-[var(--color-terminal-cyan)]/30"
                                : isProcessing
                                ? "bg-[var(--color-atelier-brass)]/15 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30"
                                : isCancelled
                                ? "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                                : "bg-[var(--color-atelier-amber)]/15 text-[var(--color-atelier-amber)] border border-[var(--color-atelier-amber)]/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDelivered
                                  ? "bg-[var(--color-terminal-green)]"
                                  : isCancelled
                                  ? "bg-[var(--color-restricted-red)]"
                                  : "bg-[var(--color-atelier-amber)] animate-pulse"
                              }`}
                            />
                            <span>{ord.order_status}</span>
                          </span>
                        </td>

                        {/* Quick Progression Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleUpdateStatus(ord.order_id, "confirmed")}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-cyan)]/15 border border-[var(--color-terminal-cyan)]/30 text-[var(--color-terminal-cyan)] hover:bg-[var(--color-terminal-cyan)]/25 text-[11px] font-semibold transition-all"
                                disabled={isUpdatingStatus}
                              >
                                Confirm
                              </button>
                            )}

                            {isConfirmed && (
                              <button
                                onClick={() => handleUpdateStatus(ord.order_id, "processing")}
                                className="px-2.5 py-1 rounded bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-brass)]/25 text-[11px] font-semibold transition-all"
                                disabled={isUpdatingStatus}
                              >
                                Start Assembly
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                onClick={() => handleUpdateStatus(ord.order_id, "shipped")}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/30 text-[var(--color-terminal-green)] hover:bg-[var(--color-terminal-green)]/25 text-[11px] font-semibold transition-all"
                                disabled={isUpdatingStatus}
                              >
                                Dispatch Carrier
                              </button>
                            )}

                            {isShipped && (
                              <button
                                onClick={() => handleUpdateStatus(ord.order_id, "delivered")}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-green)]/20 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] hover:bg-[var(--color-terminal-green)]/30 text-[11px] font-semibold transition-all"
                                disabled={isUpdatingStatus}
                              >
                                Mark Delivered
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenOrderDetail(ord.order_id)}
                              className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]"
                              title="Inspect order telemetry"
                            >
                              <ChevronRight className="w-4 h-4" />
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

      {/* Order Detail Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-6 relative font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--color-terminal-cyan)] uppercase">
                  ORDER FULFILLMENT TELEMETRY
                </div>
                <h2 className="font-fraunces font-bold text-xl text-[var(--color-ink)] flex items-center gap-3">
                  <span>{activeOrder.order_number}</span>
                </h2>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Lifecycle Actions Ribbon */}
            <div className="p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                  Current Lifecycle Status
                </div>
                <div className="font-bold text-sm text-[var(--color-atelier-brass)] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-brass)] animate-pulse" />
                  <span>{activeOrder.order_status}</span>
                </div>
              </div>

              {/* Status Switcher */}
              <div className="flex flex-wrap items-center gap-1.5">
                {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(activeOrder.order_id, st)}
                      disabled={activeOrder.order_status === st || isUpdatingStatus}
                      className={`px-2.5 py-1 rounded uppercase text-[10px] font-semibold transition-all ${
                        activeOrder.order_status === st
                          ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] cursor-default"
                          : "bg-[var(--color-paper-terminal)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-rule)]"
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Grid Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment & Settlement Summary */}
              <div className="p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-ink)]">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
                    <span>Payment Status</span>
                  </div>
                  <Link
                    href={`/admin/payments?order_id=${activeOrder.order_id}`}
                    className="text-[10px] text-[var(--color-atelier-brass)] hover:underline"
                  >
                    Manage Payment →
                  </Link>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Status:</span>
                    <span className="font-bold text-[var(--color-terminal-green)] uppercase">
                      {activePayment?.payment_status || "PENDING"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Method:</span>
                    <span className="text-[var(--color-ink)]">
                      {activePayment?.payment_method || "Direct Gateway"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Settled Subtotal:</span>
                    <span className="font-bold text-[var(--color-ink)]">
                      ${Number(activeOrder.subtotal).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Carrier & Dispatch Summary */}
              <div className="p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-ink)]">
                    <Truck className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
                    <span>Carrier Dispatch</span>
                  </div>
                  <Link
                    href={`/admin/shipments?order_id=${activeOrder.order_id}`}
                    className="text-[10px] text-[var(--color-atelier-brass)] hover:underline"
                  >
                    Manage Shipment →
                  </Link>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Provider:</span>
                    <span className="text-[var(--color-ink)]">
                      {activeShipment?.delivery_provider_name || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Tracking Code:</span>
                    <span className="font-bold text-[var(--color-terminal-cyan)]">
                      {activeShipment?.tracking_number || "Not Provisioned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-dim)]">Shipment Status:</span>
                    <span className="text-[var(--color-ink)] uppercase">
                      {activeShipment?.status || "pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="font-bold text-[var(--color-ink)] flex items-center justify-between">
                <span>Ordered Hardware Configurations</span>
                <span className="text-[10px] text-[var(--color-ink-dim)]">
                  {activeOrder.items?.length || 0} Line Items
                </span>
              </div>
              <div className="divide-y divide-[var(--color-rule-subtle)] border border-[var(--color-rule)] rounded-lg p-3 bg-[var(--color-paper-sub)]">
                {activeOrder.items?.map((item) => (
                  <div
                    key={item.order_item_id}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-[var(--color-ink)]">
                        {item.product_name || "Hardware Node"}
                      </div>
                      <div className="text-[10px] text-[var(--color-ink-dim)] space-x-1.5 mt-0.5">
                        {item.variant_model && <span>{item.variant_model}</span>}
                        {item.variant_color && <span>· {item.variant_color}</span>}
                        {item.variant_storage && <span>· {item.variant_storage}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--color-atelier-brass)]">
                        ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[var(--color-ink-dim)]">
                        {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History Logs & Append Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--color-ink)]">
                  Historical Snapshot Logs ({activeOrder.histories?.length || 0})
                </span>
                <button
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="atelier-btn atelier-btn-ghost !py-1 !px-2.5 text-[11px] font-mono flex items-center gap-1 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Append History Note</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {activeOrder.histories?.map((h) => (
                  <div
                    key={h.or_his_id}
                    className="p-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[11px] flex justify-between items-start"
                  >
                    <div>
                      <div className="font-bold text-[var(--color-ink)]">
                        {h.recipient_name}
                      </div>
                      <div className="text-[10px] text-[var(--color-ink-muted)]">
                        {h.address_line}, {h.city_name}, {h.country_name}
                      </div>
                    </div>
                    {h.phone && (
                      <div className="text-[10px] text-[var(--color-ink-dim)]">
                        {h.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--color-rule)]">
              <button
                onClick={() => setActiveOrder(null)}
                className="atelier-btn atelier-btn-secondary !py-2 !px-5 text-xs font-mono"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Append History Note Modal */}
      {isHistoryModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-md p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
              <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                Append Snapshot History Note
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAppendHistory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Recipient / Actor Name</label>
                <input
                  type="text"
                  value={historyForm.recipient_name}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, recipient_name: e.target.value })
                  }
                  placeholder="e.g. Enclave Operations Team"
                  className="w-full px-3 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Dispatch / Checkpoint Note</label>
                <input
                  type="text"
                  value={historyForm.address_line}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, address_line: e.target.value })
                  }
                  placeholder="e.g. Secure Hardware Packaged & Quality Verified"
                  className="w-full px-3 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[var(--color-ink-muted)]">City / Facility</label>
                  <input
                    type="text"
                    value={historyForm.city_name}
                    onChange={(e) =>
                      setHistoryForm({ ...historyForm, city_name: e.target.value })
                    }
                    placeholder="Da Nang Facility"
                    className="w-full px-3 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--color-ink-muted)]">Country</label>
                  <input
                    type="text"
                    value={historyForm.country_name}
                    onChange={(e) =>
                      setHistoryForm({ ...historyForm, country_name: e.target.value })
                    }
                    placeholder="Vietnam"
                    className="w-full px-3 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Operator Phone / ID</label>
                <input
                  type="text"
                  value={historyForm.phone}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, phone: e.target.value })
                  }
                  placeholder="+84 900 123 456"
                  className="w-full px-3 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="atelier-btn atelier-btn-ghost !py-1.5 !px-3"
                  disabled={isSubmittingHistory}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="atelier-btn atelier-btn-primary !py-1.5 !px-4 flex items-center gap-1.5"
                  disabled={isSubmittingHistory}
                >
                  {isSubmittingHistory ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE FULFILLMENT HUB · SECTION 9.1</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
