"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  apiGetOrders,
  apiGetMyCart,
  apiGetMyAddresses,
  type OrderListItem,
  type CartRead,
  type AddressRead,
} from "@/app/lib/api";
import {
  Package,
  ShoppingCart,
  MapPin,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Boxes,
  Compass,
  FileText,
  Plus,
  RefreshCw,
} from "lucide-react";

function UserDashboardContent() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [cart, setCart] = useState<CartRead | null>(null);
  const [addresses, setAddresses] = useState<AddressRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const isAdmin = user?.role === "Admin";
  const isStaff = user?.role === "Staff";
  const isOperator = isAdmin || isStaff;

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      apiGetOrders(token, user?.user_id ? { userId: user.user_id } : undefined),
      apiGetMyCart(token),
      apiGetMyAddresses(token),
    ]).then(([ordersRes, cartRes, addressesRes]) => {
      if (!isMounted) return;
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        setOrders(ordersRes.value);
      }
      if (cartRes.status === "fulfilled") {
        setCart(cartRes.value);
      }
      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)) {
        setAddresses(addressesRes.value);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token, user?.user_id, refreshKey]);

  const latestOrder = orders.length > 0 ? orders[0] : null;
  const cartItemsCount = cart?.items?.length || 0;
  const cartTotal =
    cart?.items?.reduce((acc, item) => acc + Number(item.unit_price) * item.quantity, 0) || 0;

  // Order status progression calculation
  const getOrderStep = (status: string) => {
    const s = status.toLowerCase();
    if (s === "delivered") return 4;
    if (s === "shipped" || s === "in_transit") return 3;
    if (s === "paid" || s === "processing") return 2;
    return 1; // pending / created
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-35" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col relative z-10">
        {/* Operator Quick Access Banner (for Admin/Staff) */}
        {isOperator && (
          <div className="mb-6 p-4 rounded-lg border border-[var(--color-terminal-cyan)]/40 bg-[var(--color-paper-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-[var(--color-ink)] flex items-center gap-2">
                  <span>Operator Privileges Active</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)]">
                    {user?.role}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-ink-muted)]">
                  You have full system access to all 25 FastAPI domain routers, inventory nodes, and ledgers.
                </div>
              </div>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--color-terminal-cyan)] text-white font-mono text-xs font-bold hover:bg-[var(--color-terminal-cyan)]/80 transition-colors self-start sm:self-auto"
            >
              <span>Open Operations Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* User Hub Welcome Header */}
        <section className="mb-8">
          <div className="atelier-plate relative p-6 sm:p-8 rounded-lg overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper-sub)]">
            <div className="atelier-filament-glow" />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
              <div>
                <div className="font-mono text-xs text-[var(--color-atelier-brass)] uppercase tracking-wider mb-2 font-semibold">
                  MEMBER COMMAND HUB // {user?.email}
                </div>
                <h1 className="text-3xl sm:text-4xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)] mb-2">
                  Welcome back, {user?.full_name || "Hardware Enthusiast"}
                </h1>
                <p className="text-sm text-[var(--color-ink-muted)] font-sans max-w-2xl leading-relaxed">
                  Track physical shipments, manage verified delivery locations, review active shopping reservations, and consult the neural hardware enclave.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  className="p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                  title="Refresh dashboard metrics"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-white font-mono text-xs font-bold transition-all shadow"
                >
                  <Compass className="w-4 h-4" />
                  <span>Browse Store</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Core 3-Column Usability Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Column 1 & 2: Active Orders & Shipment Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Order Plate */}
            <div className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg p-6">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-[var(--color-atelier-brass)]" />
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Active Order &amp; Fulfillment
                  </h2>
                </div>
                <Link
                  href="/account/orders"
                  className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                >
                  <span>All Orders ({orders.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {latestOrder ? (
                <div className="space-y-6">
                  {/* Order Meta Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Order Reference</div>
                      <div className="font-bold text-[var(--color-ink)]">
                        {latestOrder.order_number || `#${latestOrder.order_id.slice(0, 8).toUpperCase()}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Settled</div>
                      <div className="font-bold text-[var(--color-atelier-brass)] tabular-nums">
                        ${(Number(latestOrder.subtotal || 0) + Number(latestOrder.shipping_fee || 0) - Number(latestOrder.discount_amount || 0)).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Hardware Units</div>
                      <div className="text-[var(--color-ink)] font-semibold tabular-nums">
                        {latestOrder.item_count} Items Included
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Placed At</div>
                      <div className="text-[var(--color-ink-muted)]">
                        {latestOrder.created_at ? new Date(latestOrder.created_at).toLocaleDateString() : "Recent"}
                      </div>
                    </div>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30">
                        {latestOrder.order_status}
                      </span>
                    </div>
                  </div>

                  {/* 4-Stage Lifecycle Stepper */}
                  <div>
                    <div className="font-mono text-[11px] text-[var(--color-ink-dim)] uppercase tracking-wider mb-3">
                      Dispatch Pipeline Status
                    </div>
                    <div className="grid grid-cols-4 gap-2 relative">
                      {[
                        { step: 1, label: "Created", icon: Clock },
                        { step: 2, label: "Payment Confirmed", icon: CreditCard },
                        { step: 3, label: "In Transit", icon: Truck },
                        { step: 4, label: "Delivered", icon: CheckCircle2 },
                      ].map((item) => {
                        const currentStep = getOrderStep(latestOrder.order_status);
                        const isDone = currentStep >= item.step;
                        const isCurrent = currentStep === item.step;
                        const Icon = item.icon;

                        return (
                          <div key={item.step} className="flex flex-col items-center text-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                isDone
                                  ? "bg-[var(--color-atelier-brass)] border-[var(--color-atelier-brass)] text-white"
                                  : "bg-[var(--color-paper-card)] border-[var(--color-rule)] text-[var(--color-ink-dim)]"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span
                              className={`font-mono text-[11px] mt-2 font-medium ${
                                isCurrent
                                  ? "text-[var(--color-atelier-brass)] font-bold"
                                  : isDone
                                  ? "text-[var(--color-ink)]"
                                  : "text-[var(--color-ink-dim)]"
                              }`}
                            >
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Link
                      href={`/account/orders/${latestOrder.order_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-atelier-brass)] hover:underline"
                    >
                      <span>Inspect Complete Waybill &amp; Receipt</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <Package className="w-8 h-8 text-[var(--color-ink-dim)] mx-auto mb-2" />
                  <p className="font-fraunces text-base text-[var(--color-ink)] mb-1">
                    No orders placed yet
                  </p>
                  <p className="font-sans text-xs text-[var(--color-ink-muted)] max-w-sm mx-auto mb-4">
                    Your acquired precision electronics and reservation waybills will appear here with live tracking.
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-[var(--color-atelier-brass)] text-white font-mono text-xs font-bold"
                  >
                    <span>Browse Hardware Catalog</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Neural Knowledge & Consultation Plate */}
            <div className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[var(--color-terminal-cyan)]" />
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Hardware Advisor &amp; Knowledge Base
                  </h2>
                </div>
                <Link
                  href="/dashboard/chat"
                  className="font-mono text-xs text-[var(--color-terminal-cyan)] hover:underline flex items-center gap-1"
                >
                  <span>Full Research Lab</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="font-sans text-xs text-[var(--color-ink-muted)] mb-4">
                Have questions regarding PCB actuation, sound acoustics, or DAC pinouts? Ask our RAG intelligence engine grounded on real datasheets.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  "Which mechanical switch has the lowest debounce latency?",
                  "Explain Gasket mount vs Top mount acoustic differences",
                  "Check impedance range for custom headphone amps",
                  "What is the return window for custom electronics?",
                ].map((q, i) => (
                  <Link
                    key={i}
                    href={`/dashboard/chat?query=${encodeURIComponent(q)}`}
                    className="p-3 rounded bg-[var(--color-paper-card)] hover:bg-[var(--color-paper-hover)] border border-[var(--color-rule)] text-left font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] transition-colors flex items-start gap-2 group"
                  >
                    <span className="text-[var(--color-terminal-green)]">❯</span>
                    <span className="leading-snug">{q}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Cart Preview, Addresses, & Quick Tools */}
          <div className="space-y-6">
            {/* Active Cart & Checkout Plate */}
            <div className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                  <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                    Active Cart
                  </h3>
                </div>
                <span className="font-mono text-xs text-[var(--color-ink-dim)]">
                  {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"}
                </span>
              </div>

              {cartItemsCount > 0 ? (
                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-2">
                    {cart?.items?.slice(0, 3).map((ci, idx) => (
                      <div
                        key={ci.variant_id || idx}
                        className="p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] flex items-center justify-between"
                      >
                        <div className="truncate max-w-[160px]">
                          <div className="text-[var(--color-ink)] font-semibold truncate">
                            {ci.product_name || ci.variant_model || "Hardware SKU"}
                          </div>
                          <div className="text-[10px] text-[var(--color-ink-dim)]">
                            Qty: {ci.quantity} {ci.variant_color ? `· ${ci.variant_color}` : ""}
                          </div>
                        </div>
                        <div className="font-bold text-[var(--color-atelier-brass)] tabular-nums">
                          ${(Number(ci.unit_price) * ci.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--color-rule)] flex items-center justify-between">
                    <span className="text-[var(--color-ink-dim)]">Subtotal:</span>
                    <span className="font-bold text-base text-[var(--color-ink)] tabular-nums">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full py-2.5 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Proceed to Checkout</span>
                  </Link>
                </div>
              ) : (
                <div className="p-6 text-center rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <ShoppingCart className="w-6 h-6 text-[var(--color-ink-dim)] mx-auto mb-2" />
                  <p className="font-sans text-xs text-[var(--color-ink-muted)] mb-3">
                    Your shopping cart is currently empty.
                  </p>
                  <Link
                    href="/products"
                    className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline"
                  >
                    Explore Hardware Catalog →
                  </Link>
                </div>
              )}
            </div>

            {/* Saved Delivery Addresses Plate */}
            <div className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-terminal-green)]" />
                  <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                    Delivery Addresses
                  </h3>
                </div>
                <Link
                  href="/account/addresses"
                  className="font-mono text-xs text-[var(--color-terminal-green)] hover:underline"
                >
                  Manage ({addresses.length})
                </Link>
              </div>

              {addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.slice(0, 2).map((addr) => (
                    <div
                      key={addr.address_id}
                      className="p-3 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] text-xs font-sans"
                    >
                      <div className="font-semibold text-[var(--color-ink)] flex items-center justify-between">
                        <span>{user?.full_name || "Primary Shipping Location"}</span>
                        {addr.is_default && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)]">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-[var(--color-ink-muted)] mt-1">
                        {addr.address_line}, {addr.city_name || "Local Area"}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--color-ink-dim)] mt-0.5">
                        {addr.country_name || "Region"} {addr.postal_code ? `· Postal: ${addr.postal_code}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <p className="font-sans text-xs text-[var(--color-ink-muted)] mb-3">
                    No shipping address registered.
                  </p>
                  <Link
                    href="/account/addresses"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--color-paper-hover)] border border-[var(--color-rule)] font-mono text-xs text-[var(--color-ink)] hover:border-[var(--color-terminal-green)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Ingested Documents & Manuals */}
            <div className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg p-6">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
                  <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                    Datasheets &amp; Guides
                  </h3>
                </div>
                <Link
                  href="/dashboard/documents"
                  className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline"
                >
                  View Library
                </Link>
              </div>
              <p className="font-sans text-xs text-[var(--color-ink-muted)] mb-3">
                Browse verified technical manuals, schematic PDFs, and component warranty specifications.
              </p>
              <Link
                href="/dashboard/documents"
                className="w-full py-2 rounded bg-[var(--color-paper-card)] hover:bg-[var(--color-paper-hover)] border border-[var(--color-rule)] text-center font-mono text-xs text-[var(--color-ink)] block transition-colors"
              >
                Access Technical Library →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <ProtectedRoute>
      <UserDashboardContent />
    </ProtectedRoute>
  );
}
