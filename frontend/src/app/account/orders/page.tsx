"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetOrders,
  apiGetMyCart,
  type OrderListItem,
  type CartRead,
} from "@/app/lib/api";
import {
  Package,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  Truck,
  Boxes,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  LogOut,
  ChevronRight,
  Shield,
  CreditCard,
} from "lucide-react";

type FilterStatus = "all" | "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [cart, setCart] = useState<CartRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [activeStatus, setActiveStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiGetOrders(
        token,
        activeStatus !== "all" ? { status: activeStatus } : undefined
      );
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load order history ledger."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, activeStatus]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        loadOrders();
      }
    }
  }, [authLoading, user, router, loadOrders]);

  // Load cart count
  useEffect(() => {
    if (!token) return;
    apiGetMyCart(token)
      .then((c) => setCart(c))
      .catch(() => setCart(null));
  }, [token]);

  // Filtered orders list by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((o) =>
      o.order_number.toLowerCase().includes(query) ||
      o.order_id.toLowerCase().includes(query) ||
      o.order_status.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // Telemetry metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pendingCount = orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.order_status)).length;
    const deliveredCount = orders.filter((o) => o.order_status === "delivered").length;
    const totalSpent = orders.reduce((acc, o) => acc + Number(o.subtotal), 0);

    return { total, pendingCount, deliveredCount, totalSpent };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
      case "completed":
        return {
          label: "DELIVERED",
          bg: "bg-[var(--color-terminal-green)]/15",
          border: "border-[var(--color-terminal-green)]/30",
          text: "text-[var(--color-terminal-green)]",
          icon: CheckCircle2,
        };
      case "shipped":
        return {
          label: "IN TRANSIT",
          bg: "bg-[var(--color-terminal-cyan)]/15",
          border: "border-[var(--color-terminal-cyan)]/30",
          text: "text-[var(--color-terminal-cyan)]",
          icon: Truck,
        };
      case "processing":
      case "confirmed":
        return {
          label: status.toUpperCase(),
          bg: "bg-[var(--color-atelier-amber)]/15",
          border: "border-[var(--color-atelier-amber)]/30",
          text: "text-[var(--color-atelier-amber)]",
          icon: RefreshCw,
        };
      case "cancelled":
        return {
          label: "CANCELLED",
          bg: "bg-[var(--color-restricted-red)]/15",
          border: "border-[var(--color-restricted-red)]/30",
          text: "text-[var(--color-restricted-red)]",
          icon: AlertCircle,
        };
      case "pending":
      default:
        return {
          label: "PENDING",
          bg: "bg-[var(--color-ink-muted)]/15",
          border: "border-[var(--color-ink-muted)]/30",
          text: "text-[var(--color-ink-muted)]",
          icon: Clock,
        };
    }
  };

  const totalCartCount = cart?.items?.length || 0;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background drafting grid */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />

      {/* Top Header */}
      

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Page Hero Header */}
        <section className="mb-8">
          <div className="atelier-plate relative p-6 sm:p-8 rounded-lg overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper-sub)]">
            <div className="atelier-filament-glow" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <div className="atelier-terminal-status-tag mb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-cyan)] animate-pulse" />
                  <span>IMMUTABLE LEDGER // ORDER AUDIT &amp; TRACKING</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)] mb-2">
                  My Orders &amp; Tracking
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] font-sans leading-relaxed">
                  Review your hardware order ledger, inspect cryptographic delivery receipts, and follow real-time fulfillment timelines.
                </p>
              </div>

              {/* Metrics strip */}
              <div className="flex items-center gap-3 bg-[var(--color-paper-card)] p-3.5 rounded-lg border border-[var(--color-rule)] font-mono text-xs">
                <div>
                  <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Orders</div>
                  <div className="text-base font-bold text-[var(--color-ink)]">
                    {metrics.total}
                  </div>
                </div>
                <div className="h-8 w-px bg-[var(--color-rule)]" />
                <div>
                  <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">In Flight</div>
                  <div className="text-base font-bold text-[var(--color-atelier-amber)]">
                    {metrics.pendingCount}
                  </div>
                </div>
                <div className="h-8 w-px bg-[var(--color-rule)]" />
                <div>
                  <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Fulfilled</div>
                  <div className="text-base font-bold text-[var(--color-terminal-green)]">
                    {metrics.deliveredCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Status Filters */}
        <section className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-dim)]" />
              <input
                type="text"
                placeholder="Search by order number (e.g. ORD-2026...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded pl-10 pr-8 py-2.5 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={loadOrders}
              className="p-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors self-end sm:self-auto"
              title="Refresh orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--color-rule)]">
            <span className="text-[10px] font-mono text-[var(--color-ink-dim)] uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Status:
            </span>

            {[
              { key: "all", label: "ALL ORDERS" },
              { key: "pending", label: "PENDING" },
              { key: "confirmed", label: "CONFIRMED" },
              { key: "processing", label: "PROCESSING" },
              { key: "shipped", label: "IN TRANSIT" },
              { key: "delivered", label: "DELIVERED" },
              { key: "cancelled", label: "CANCELLED" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key as FilterStatus)}
                className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
                  activeStatus === tab.key
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] border-[var(--color-atelier-brass)] font-semibold"
                    : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:border-[var(--color-rule-active)] hover:text-[var(--color-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded border border-[var(--color-restricted-red)]/50 bg-[var(--color-restricted-red)]/10 text-xs font-mono text-[var(--color-restricted-red)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadOrders}
              className="underline hover:text-[var(--color-ink)] transition-colors ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Orders List / Loading / Empty State */}
        {isLoading ? (
          <div className="space-y-4 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="atelier-plate p-5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--color-paper-sub)] rounded w-48" />
                  <div className="h-3 bg-[var(--color-paper-sub)] rounded w-32" />
                </div>
                <div className="h-8 bg-[var(--color-paper-sub)] rounded w-28" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-sub)] my-6">
            <Boxes className="w-16 h-16 text-[var(--color-ink-dim)] mb-4 opacity-30" />
            <h3 className="font-fraunces font-bold text-xl text-[var(--color-ink)] mb-2">
              No Orders Found
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6 leading-relaxed">
              {searchQuery || activeStatus !== "all"
                ? "No order records match your active query or status filter. Try clearing filters."
                : "You haven't placed any hardware orders yet. Browse our hardware catalog to get started."}
            </p>
            <div className="flex items-center gap-3">
              {(searchQuery || activeStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveStatus("all");
                  }}
                  className="atelier-btn atelier-btn-secondary !py-2 !px-4 text-xs font-mono"
                >
                  Reset Filters
                </button>
              )}
              <Link
                href="/products"
                className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono inline-flex items-center gap-2"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 flex-1">
            {filteredOrders.map((order) => {
              const badge = getStatusBadge(order.order_status);
              const BadgeIcon = badge.icon;

              const formattedDate = order.created_at
                ? new Date(order.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recorded";

              return (
                <Link
                  key={order.order_id}
                  href={`/account/orders/${order.order_id}`}
                  className="atelier-plate group block p-5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] hover:border-[var(--color-rule-active)] hover:bg-[var(--color-paper-hover)] transition-all shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Order Info & Metadata */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-atelier-brass)] transition-colors">
                          {order.order_number}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${badge.bg} ${badge.border} ${badge.text} border`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--color-ink-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--color-ink-dim)]" />
                          <span>{formattedDate}</span>
                        </span>

                        <span>·</span>

                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-[var(--color-ink-dim)]" />
                          <span>
                            {order.item_count} {order.item_count === 1 ? "hardware item" : "hardware items"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Subtotal & Inspect Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-rule-subtle)] font-mono">
                      <div className="text-left sm:text-right">
                        <div className="text-base font-bold text-[var(--color-atelier-brass)]">
                          ${Number(order.subtotal).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                          USD Total
                        </div>
                      </div>

                      <div className="p-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)] group-hover:border-[var(--color-atelier-brass)] group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE IMMUTABLE TRANSACTION AUDIT · FLOW 5.1</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
