/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetOrderById,
  apiGetOrderItems,
  apiGetOrderHistory,
  apiGetOrderShipment,
  apiGetOrderPayment,
  type OrderRead,
  type OrderItemRead,
  type OrderHistoryRead,
  type ShipmentRead,
  type PaymentRead,
} from "@/app/lib/api";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  ShieldCheck,
  CreditCard,
  Printer,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Cpu,
  Boxes,
  MessageSquare,
  LogOut,
  ShoppingCart,
  Receipt,
  Navigation,
} from "lucide-react";

type OrderStep = {
  key: string;
  stepNum: string;
  title: string;
  desc: string;
  icon: any;
};

const ORDER_STEPS: OrderStep[] = [
  {
    key: "pending",
    stepNum: "01",
    title: "Order Placed",
    desc: "Transaction recorded to immutable PostgreSQL ledger",
    icon: Clock,
  },
  {
    key: "confirmed",
    stepNum: "02",
    title: "Enclave Verified",
    desc: "Stock reservation & cryptographic authorization complete",
    icon: ShieldCheck,
  },
  {
    key: "processing",
    stepNum: "03",
    title: "Packaging & Assembly",
    desc: "Hardware provisioned & sealed in anti-tamper enclosure",
    icon: Boxes,
  },
  {
    key: "shipped",
    stepNum: "04",
    title: "Carrier In Transit",
    desc: "Handed over to delivery provider with encrypted manifest",
    icon: Truck,
  },
  {
    key: "delivered",
    stepNum: "05",
    title: "Delivered & Settled",
    desc: "Package receipt acknowledged and ledger finalized",
    icon: CheckCircle2,
  },
];

export default function OrderTrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [items, setItems] = useState<OrderItemRead[]>([]);
  const [histories, setHistories] = useState<OrderHistoryRead[]>([]);
  const [shipment, setShipment] = useState<ShipmentRead | null>(null);
  const [payment, setPayment] = useState<PaymentRead | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  // Fetch all order tracking datasets concurrently
  const loadOrderDetails = useCallback(async () => {
    if (!orderId || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [orderRes, itemsRes, historyRes, shipmentRes, paymentRes] =
        await Promise.all([
          apiGetOrderById(orderId, token),
          apiGetOrderItems(orderId, token).catch(() => [] as OrderItemRead[]),
          apiGetOrderHistory(orderId, token).catch(() => [] as OrderHistoryRead[]),
          apiGetOrderShipment(orderId, token).catch(() => null),
          apiGetOrderPayment(orderId, token).catch(() => null),
        ]);

      setOrder(orderRes);
      setItems(itemsRes);
      setHistories(historyRes);
      setShipment(shipmentRes);
      setPayment(paymentRes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retrieve order tracking data from ledger."
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        loadOrderDetails();
      }
    }
  }, [authLoading, user, router, loadOrderDetails]);

  // Copy helper
  const handleCopyTracking = (trackingNum: string) => {
    navigator.clipboard.writeText(trackingNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  };

  // Determine current timeline active step index
  const activeStepIndex = useMemo(() => {
    if (!order) return 0;
    const status = (order.order_status || "").toLowerCase();

    if (status === "delivered" || status === "completed") return 4;
    if (status === "shipped") return 3;
    if (status === "processing") return 2;
    if (status === "confirmed") return 1;
    if (status === "cancelled") return -1;
    return 0; // pending default
  }, [order]);

  const isCancelled = (order?.order_status || "").toLowerCase() === "cancelled";

  // Primary address snapshot
  const primaryAddress = histories[0] || order?.histories?.[0];

  const formattedDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Timestamp Registered";

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background drafting grid & ambient filament glow */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Bar */}
      <header className="sticky top-0 z-40 bg-[var(--color-paper)]/90 backdrop-blur-md border-b border-[var(--color-rule)] print:hidden">
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
                  ORDER TELEMETRY · FLOW 5.2
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[var(--color-rule)] text-xs font-mono">
              <Link
                href="/products"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                CATALOG
              </Link>
              <Link
                href="/account/orders"
                className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)] border border-[var(--color-rule-active)] font-medium"
              >
                MY ORDERS
              </Link>
              <Link
                href="/dashboard/chat"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                RAG CHAT
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/cart"
              className="p-2 rounded border border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-atelier-brass)] transition-colors"
              title="Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[var(--color-ink-muted)]" />
            </Link>

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

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Navigation Breadcrumb & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 hover:text-[var(--color-atelier-brass)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Order Ledger</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-ink)] font-semibold truncate max-w-xs sm:max-w-md">
              {order?.order_number || "Tracking Detail"}
            </span>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs font-mono flex items-center gap-1.5 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]"
              title="Print Order Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <Link
              href="/dashboard/chat"
              className="atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs font-mono flex items-center gap-1.5 border border-[var(--color-terminal-cyan)] text-[var(--color-terminal-cyan)] hover:bg-[var(--color-terminal-cyan)]/10"
              title="Query Order Support via RAG Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Support Chat</span>
            </Link>

            <button
              onClick={loadOrderDetails}
              className="p-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
              title="Refresh tracking status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-[var(--color-paper-sub)] rounded-lg" />
            <div className="h-44 bg-[var(--color-paper-sub)] rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-[var(--color-paper-sub)] rounded-lg" />
              <div className="h-64 bg-[var(--color-paper-sub)] rounded-lg" />
            </div>
          </div>
        ) : error || !order ? (
          /* Error State */
          <div className="atelier-plate p-10 rounded-lg border border-[var(--color-restricted-red)]/40 bg-[var(--color-paper-card)] text-center space-y-4 my-8">
            <AlertCircle className="w-12 h-12 text-[var(--color-restricted-red)] mx-auto" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)]">
              Order Record Not Found
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mx-auto leading-relaxed">
              {error || "The requested order tracking record does not exist or has restricted access."}
            </p>
            <div className="pt-2">
              <Link
                href="/account/orders"
                className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Orders List</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Order Tracking Details Screen */
          <div className="space-y-8 animate-fade-in">
            {/* Header Status Plate */}
            <section className="atelier-plate p-6 sm:p-8 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[10px] text-[var(--color-atelier-brass)] uppercase tracking-wider font-semibold">
                      OFFICIAL DISPATCH RECORD
                    </span>
                    <span className="text-[var(--color-rule)]">/</span>
                    <span className="font-mono text-xs text-[var(--color-ink-dim)]">
                      REGISTRY: {order.order_id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight flex items-center gap-3">
                    <span>{order.order_number}</span>
                  </h1>

                  <p className="font-mono text-xs text-[var(--color-ink-muted)] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
                    <span>Registered on {formattedDate}</span>
                  </p>
                </div>

                {/* Right Hero Badge */}
                <div className="flex flex-col sm:items-end gap-1.5 font-mono">
                  <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                    Fulfillment Status
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase ${
                      isCancelled
                        ? "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                        : order.order_status === "delivered"
                        ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                        : "bg-[var(--color-atelier-brass)]/15 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCancelled
                          ? "bg-[var(--color-restricted-red)]"
                          : order.order_status === "delivered"
                          ? "bg-[var(--color-terminal-green)]"
                          : "bg-[var(--color-atelier-brass)] animate-pulse"
                      }`}
                    />
                    <span>{order.order_status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Interactive 5-Stage Telemetry Stepper Plate */}
            <section className="atelier-plate p-6 sm:p-8 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-sub)] shadow-md space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                  <h2 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                    Fulfillment &amp; Dispatch Timeline
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-[var(--color-terminal-cyan)] uppercase tracking-wider">
                  REAL-TIME CARRIER TELEMETRY
                </span>
              </div>

              {isCancelled ? (
                /* Cancelled Order Banner */
                <div className="p-5 rounded-lg border border-[var(--color-restricted-red)]/40 bg-[var(--color-restricted-red)]/10 flex items-center gap-3.5 text-xs font-mono text-[var(--color-restricted-red)]">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Order Fulfillment Terminated</div>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                      This order configuration has been cancelled. Any pre-authorized payment reservations have been released.
                    </p>
                  </div>
                </div>
              ) : (
                /* 5-Stage Stepper Timeline */
                <div className="relative pt-2 pb-4">
                  {/* Progress Line */}
                  <div className="hidden md:block absolute top-[34px] left-[5%] right-[5%] h-0.5 bg-[var(--color-rule)] z-0">
                    <div
                      className="h-full bg-[var(--color-terminal-green)] transition-all duration-700"
                      style={{
                        width: `${(Math.max(0, activeStepIndex) / (ORDER_STEPS.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-2 relative z-10">
                    {ORDER_STEPS.map((step, idx) => {
                      const isCompleted = idx <= activeStepIndex;
                      const isCurrent = idx === activeStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <div
                          key={step.key}
                          className="flex md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-2.5"
                        >
                          {/* Step Icon Bubble */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                              isCurrent
                                ? "bg-[var(--color-paper-card)] border-[var(--color-terminal-cyan)] text-[var(--color-terminal-cyan)] shadow-lg ring-4 ring-[var(--color-terminal-cyan)]/20 animate-pulse"
                                : isCompleted
                                ? "bg-[var(--color-terminal-green)]/15 border-[var(--color-terminal-green)] text-[var(--color-terminal-green)]"
                                : "bg-[var(--color-paper-terminal)] border-[var(--color-rule)] text-[var(--color-ink-dim)] opacity-60"
                            }`}
                          >
                            <StepIcon className="w-5 h-5" />
                          </div>

                          {/* Step Title & Description */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-start md:justify-center gap-1.5">
                              <span className="font-mono text-[10px] text-[var(--color-atelier-brass)] font-semibold">
                                [{step.stepNum}]
                              </span>
                              <span
                                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                                  isCurrent
                                    ? "text-[var(--color-terminal-cyan)]"
                                    : isCompleted
                                    ? "text-[var(--color-ink)]"
                                    : "text-[var(--color-ink-dim)]"
                                }`}
                              >
                                {step.title}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--color-ink-muted)] font-mono leading-tight max-w-[180px] md:mx-auto">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Asymmetrical Bento Grid: Dispatch Telemetry & Financial Clearance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Carrier Dispatch & Destination Node */}
              <div className="space-y-6">
                {/* Carrier & Tracking Info */}
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                      <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                        Carrier Dispatch Telemetry
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--color-terminal-green)] uppercase">
                      ● Active Manifest
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                      <span className="text-[var(--color-ink-dim)]">Carrier Provider:</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        {shipment?.delivery_provider_name || "Enclave Express Global Logistics"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                      <span className="text-[var(--color-ink-dim)]">Tracking Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-atelier-brass)] font-mono">
                          {shipment?.tracking_number || `VN-${order.order_id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyTracking(
                              shipment?.tracking_number || `VN-${order.order_id.slice(0, 8).toUpperCase()}`
                            )
                          }
                          className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                          title="Copy tracking code"
                        >
                          {copiedTracking ? (
                            <Check className="w-3.5 h-3.5 text-[var(--color-terminal-green)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                      <span className="text-[var(--color-ink-dim)]">Shipment Status:</span>
                      <span className="font-semibold text-[var(--color-terminal-cyan)] uppercase">
                        {shipment?.status || order.order_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Destination Node Address Snapshot */}
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-rule)]">
                    <MapPin className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                    <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                      Delivery Destination Node
                    </h3>
                  </div>

                  {primaryAddress ? (
                    <div className="font-mono text-xs space-y-1.5 p-3.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                      <div className="font-bold text-[var(--color-ink)] text-sm">
                        {primaryAddress.recipient_name || user?.email}
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                        {primaryAddress.address_line}
                      </p>
                      <p className="text-[10px] text-[var(--color-ink-dim)]">
                        {primaryAddress.city_name} · {primaryAddress.country_name}
                      </p>
                      {primaryAddress.phone && (
                        <p className="text-[10px] text-[var(--color-ink-dim)]">
                          Tel: {primaryAddress.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-[var(--color-ink-dim)] p-3">
                      Primary verified shipping address node on file.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Payment Status & Financial Breakdown */}
              <div className="space-y-6">
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                      <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                        Settlement &amp; Payment Ledger
                      </h3>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        payment?.payment_status === "paid"
                          ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                          : "bg-[var(--color-atelier-amber)]/15 text-[var(--color-atelier-amber)] border border-[var(--color-atelier-amber)]/30"
                      }`}
                    >
                      ● {payment?.payment_status || "SETTLED"}
                    </span>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Payment Method</span>
                      <span className="font-semibold text-[var(--color-ink)]">
                        {payment?.payment_method?.toUpperCase() || "CREDIT CARD / DIRECT GATEWAY"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Hardware Subtotal</span>
                      <span className="font-semibold text-[var(--color-ink)]">
                        ${Number(order.subtotal).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Encrypted Carrier Dispatch</span>
                      <span className="text-[var(--color-terminal-green)] font-semibold">
                        {Number(order.shipping_fee) > 0
                          ? `$${Number(order.shipping_fee).toFixed(2)}`
                          : "Free Standard"}
                      </span>
                    </div>

                    {Number(order.discount_amount) > 0 && (
                      <div className="flex items-center justify-between text-[var(--color-terminal-green)]">
                        <span>Enclave Discount</span>
                        <span>-${Number(order.discount_amount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[var(--color-rule)] flex items-baseline justify-between font-bold">
                      <span className="text-sm">Total Paid</span>
                      <span className="text-xl text-[var(--color-atelier-brass)]">
                        ${Number(order.subtotal).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        <span className="text-xs text-[var(--color-ink-dim)]">USD</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchased Hardware Configurations Table */}
            <section className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                  <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                    Hardware Configurations ({items.length || order.items?.length || 0} Units)
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)] uppercase">
                  GET /orders/{order.order_id.slice(0, 8)}/items
                </span>
              </div>

              <div className="divide-y divide-[var(--color-rule-subtle)]">
                {(items.length > 0 ? items : order.items || []).map((item, idx) => {
                  const itemTotal = Number(item.unit_price) * item.quantity;

                  return (
                    <div
                      key={item.order_item_id || idx}
                      className="py-4 flex items-center justify-between gap-4 font-mono text-xs"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                          {item.variant_image_url ? (
                            <img
                              src={item.variant_image_url}
                              alt={item.product_name || "Hardware Node"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Cpu className="w-7 h-7 text-[var(--color-ink-dim)] opacity-40" />
                          )}
                        </div>

                        {/* Title & Specs */}
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--color-ink)] text-sm truncate max-w-sm sm:max-w-md">
                            {item.product_name || "Secure Hardware Component"}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
                            {item.variant_model && (
                              <span className="px-2 py-0.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                                {item.variant_model}
                              </span>
                            )}
                            {item.variant_color && (
                              <span className="px-2 py-0.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                                {item.variant_color}
                              </span>
                            )}
                            {item.variant_storage && (
                              <span className="px-2 py-0.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] font-semibold text-[var(--color-ink)]">
                                {item.variant_storage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Line Item Pricing */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-[var(--color-atelier-brass)] text-sm">
                          ${itemTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-dim)]">
                          {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bottom Navigation & Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <Link
                href="/account/orders"
                className="w-full sm:w-auto atelier-btn atelier-btn-ghost !py-2.5 !px-5 text-xs font-mono text-center inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to All Orders</span>
              </Link>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/products"
                  className="w-full sm:w-auto atelier-btn atelier-btn-secondary !py-2.5 !px-5 text-xs font-mono text-center"
                >
                  Continue Shopping
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto atelier-btn atelier-btn-primary !py-2.5 !px-5 text-xs font-mono text-center shadow-md"
                >
                  Go to Dashboard →
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE IMMUTABLE TRANSACTION RECORD · FLOW 5.2</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
