/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

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
  ArrowRight,
  ShoppingCart,
  Clock,
  LogOut,
  AlertCircle,
  Truck,
  Cpu,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderRead | null>(null);
  const [payment, setPayment] = useState<PaymentRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

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
        err instanceof Error ? err.message : "Failed to verify order confirmation."
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

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const historyAddress = order?.histories?.[0];

  const formattedTimestamp = order?.created_at
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
      {/* Background canvas grid & ambient filament */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Bar */}
      

      {/* Main Confirmation Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-4">
            <div className="w-9 h-9 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--color-ink)]">Sealing Transaction In PostgreSQL Ledger...</p>
              <p className="text-[11px] text-[var(--color-ink-dim)]">Verifying cryptographic node signatures and address snapshot</p>
            </div>
          </div>
        ) : error || !order ? (
          <div className="atelier-plate p-10 rounded-lg border border-[var(--color-restricted-red)]/40 bg-[var(--color-paper-card)] text-center space-y-4 my-8">
            <AlertCircle className="w-12 h-12 text-[var(--color-restricted-red)] mx-auto" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)]">
              Confirmation Unavailable
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mx-auto leading-relaxed">
              {error || "The requested order ledger confirmation could not be verified."}
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono inline-flex items-center gap-2"
              >
                <span>Return to Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Monumental Order Certificate Header */}
            <section className="atelier-plate relative p-6 sm:p-10 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/30 text-[var(--color-terminal-green)] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>TRANSACTION SEALED</span>
                    </span>
                    <span className="text-[var(--color-rule)]">/</span>
                    <span className="font-mono text-xs text-[var(--color-ink-dim)]">
                      {formattedTimestamp}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight">
                    Order Provisioned &amp; Locked
                  </h1>

                  <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] font-sans max-w-xl leading-relaxed">
                    Your hardware configurations have been recorded to the immutable ledger. Stock is reserved, and transit dispatch has been queued.
                  </p>
                </div>

                {/* Right Stamp Badge */}
                <div className="p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] font-mono text-xs flex flex-col gap-2 min-w-[240px]">
                  <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                    Assigned Order Number
                  </div>
                  <div className="text-lg font-bold text-[var(--color-atelier-brass)] tracking-wide flex items-center justify-between">
                    <span>{order.order_number}</span>
                    <button
                      onClick={() => handleCopyId(order.order_number)}
                      className="p-1 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                      title="Copy Order Number"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-[var(--color-terminal-green)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-[var(--color-terminal-cyan)] font-mono truncate">
                    HASH: {order.order_id}
                  </div>
                </div>
              </div>
            </section>

            {/* Asymmetrical 2-Column Ledger Manifest */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column (7 cols): Itemized Hardware Configurations */}
              <div className="lg:col-span-7 space-y-6">
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                      <h2 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                        Hardware Manifest ({order.items?.length || 0} Units)
                      </h2>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--color-terminal-green)] uppercase">
                      ● Stock Reserved
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--color-rule-subtle)]">
                    {order.items?.map((item) => (
                      <div
                        key={item.order_item_id}
                        className="py-3.5 flex items-center justify-between gap-4 font-mono text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0 flex items-center justify-center p-1">
                            {item.variant_image_url ? (
                              <img
                                src={item.variant_image_url}
                                alt={item.product_name || "Hardware Node"}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Cpu className="w-6 h-6 text-[var(--color-ink-dim)] opacity-40" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-[var(--color-ink)] truncate max-w-xs sm:max-w-md">
                              {item.product_name || "Secure Hardware Node"}
                            </div>
                            <div className="text-[10px] text-[var(--color-ink-dim)] space-x-1.5 mt-0.5">
                              {item.variant_model && <span>{item.variant_model}</span>}
                              {item.variant_color && <span>· {item.variant_color}</span>}
                              {item.variant_storage && (
                                <span className="font-semibold text-[var(--color-ink)]">
                                  · {item.variant_storage}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-[var(--color-atelier-brass)]">
                            ${(Number(item.unit_price) * item.quantity).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-[10px] text-[var(--color-ink-dim)]">
                            {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations */}
                  <div className="pt-4 border-t border-[var(--color-rule)] space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Hardware Subtotal</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        ${Number(order.subtotal).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Encrypted Carrier Dispatch</span>
                      <span className="text-[var(--color-terminal-green)] font-semibold">
                        Free Standard
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-rule-subtle)] flex items-baseline justify-between font-bold">
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

              {/* Right Column (5 cols): Destination Node */}
              <div className="lg:col-span-5 space-y-6">
                {/* Destination Node */}
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-rule)]">
                    <MapPin className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                    <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                      Delivery Destination Node
                    </h3>
                  </div>

                  {historyAddress ? (
                    <div className="font-mono text-xs space-y-1 p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                      <div className="font-bold text-[var(--color-ink)] text-sm">
                        {historyAddress.recipient_name || user?.email}
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                        {historyAddress.address_line}
                      </p>
                      <p className="text-[10px] text-[var(--color-ink-dim)]">
                        {historyAddress.city_name} · {historyAddress.country_name}
                      </p>
                      {historyAddress.phone && (
                        <p className="text-[10px] text-[var(--color-ink-dim)]">
                          Tel: {historyAddress.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-[var(--color-ink-dim)] p-3">
                      Primary verified shipping destination on file.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Ribbon */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/account/orders/${order.order_id}`}
                className="w-full sm:w-auto atelier-btn atelier-btn-primary !py-3 !px-7 text-xs font-mono flex items-center justify-center gap-2 shadow-md text-center"
              >
                <Truck className="w-4 h-4" />
                <span>Track Order &amp; Live Telemetry →</span>
              </Link>
              <Link
                href="/account/orders"
                className="w-full sm:w-auto atelier-btn atelier-btn-secondary !py-3 !px-6 text-xs font-mono text-center"
              >
                View All Orders
              </Link>
              <Link
                href="/products"
                className="w-full sm:w-auto atelier-btn atelier-btn-ghost !py-3 !px-6 text-xs font-mono text-center"
              >
                ← Return to Catalog
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
            <span>ELECTRON GATE IMMUTABLE TRANSACTION RECORD · FLOW 4.2</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
