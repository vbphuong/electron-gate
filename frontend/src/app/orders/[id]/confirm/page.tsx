"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetOrderById,
  apiGetOrderPayment,
  type OrderRead,
  type PaymentRead,
} from "@/app/lib/api";
import {
  CheckCircle2,
  Package,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ShoppingCart,
  Receipt,
  Clock,
  LogOut,
  AlertCircle,
  Truck,
  Cpu,
} from "lucide-react";

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderRead | null>(null);
  const [payment, setPayment] = useState<PaymentRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Order Details & Payment Data
  const loadOrderData = useCallback(async () => {
    if (!orderId || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [orderData, paymentData] = await Promise.all([
        apiGetOrderById(orderId, token),
        apiGetOrderPayment(orderId, token).catch(() => null),
      ]);

      setOrder(orderData);
      setPayment(paymentData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load order confirmation."
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    if (!authLoading) {
      loadOrderData();
    }
  }, [authLoading, loadOrderData]);

  const historyAddress = order?.histories?.[0];

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background canvas grid */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />

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
                  ORDER CONFIRMED · SECTION 4.2
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
                href="/dashboard/chat"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                RAG CHAT
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
                <span className="hidden sm:inline">{user.email}</span>
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded hover:text-[var(--color-restricted-red)]"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Confirmation Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
            <span>Retrieving immutable order ledger...</span>
          </div>
        ) : error || !order ? (
          <div className="atelier-plate p-10 rounded-lg border border-[var(--color-restricted-red)]/40 bg-[var(--color-paper-card)] text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[var(--color-restricted-red)] mx-auto" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)]">
              Order Record Unavailable
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mx-auto">
              {error || "The requested order confirmation could not be verified."}
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono"
              >
                ← Return to Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Top Success Banner Plate */}
            <div className="atelier-plate p-6 sm:p-8 rounded-lg border border-[var(--color-terminal-green)]/40 bg-[var(--color-terminal-green)]/5 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/30 text-[var(--color-terminal-green)] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)]">
                Hardware Order Confirmed
              </h1>
              <p className="font-mono text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                Thank you for your order. Your hardware configurations have been recorded to the immutable ledger and queued for carrier provisioning.
              </p>

              <div className="inline-flex items-center gap-2 pt-2 px-4 py-1.5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] font-mono text-xs">
                <span className="text-[var(--color-ink-dim)]">ORDER NUMBER:</span>
                <span className="font-bold text-[var(--color-atelier-brass)] tracking-wider">
                  {order.order_number}
                </span>
              </div>
            </div>

            {/* Order Ledger Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Order Items Summary */}
              <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-rule)]">
                  <Package className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                  <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                    Purchased Configurations ({order.items.length})
                  </h3>
                </div>

                <div className="divide-y divide-[var(--color-rule-subtle)]">
                  {order.items.map((item) => (
                    <div
                      key={item.order_item_id}
                      className="py-3 flex items-center justify-between font-mono text-xs"
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
                          ${(Number(item.unit_price) * item.quantity).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-dim)]">
                          Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Status */}
                <div className="pt-3 border-t border-[var(--color-rule)] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                    <span>Carrier Dispatch</span>
                    <span className="text-[var(--color-terminal-green)] font-semibold">
                      Free Standard
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                    <span>Order Status</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] border border-[var(--color-terminal-cyan)]/30">
                      ● {order.order_status}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-rule-subtle)] flex items-baseline justify-between font-bold">
                    <span>Total Amount Paid</span>
                    <span className="text-lg text-[var(--color-atelier-brass)]">
                      ${Number(order.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Delivery Address Snapshot & Payment Status */}
              <div className="space-y-6">
                {/* Shipping Destination Snapshot */}
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-rule)]">
                    <MapPin className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                    <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                      Delivery Destination Node
                    </h3>
                  </div>

                  {historyAddress ? (
                    <div className="font-mono text-xs space-y-1">
                      <div className="font-semibold text-[var(--color-ink)]">
                        {historyAddress.recipient_name || user?.email}
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                        {historyAddress.address_line}
                      </p>
                      <p className="text-[10px] text-[var(--color-ink-dim)]">
                        {historyAddress.city_name} · {historyAddress.country_name}
                      </p>
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-[var(--color-ink-dim)]">
                      Primary verified shipping address node on file.
                    </p>
                  )}
                </div>

                {/* Security Verification Badge */}
                <div className="p-5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] space-y-2 font-mono text-[11px] text-[var(--color-ink-dim)]">
                  <div className="flex items-center gap-2 text-[var(--color-ink)] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-terminal-green)] shrink-0" />
                    <span>Cryptographic Order Ledger ID</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-muted)] font-mono break-all">
                    {order.order_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/products"
                className="w-full sm:w-auto atelier-btn atelier-btn-ghost !py-2.5 !px-6 text-xs font-mono text-center"
              >
                ← Continue Shopping
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono flex items-center justify-center gap-2 shadow-md text-center"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE IMMUTABLE TRANSACTION RECORD</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
