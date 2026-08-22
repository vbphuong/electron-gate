"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetMyCart,
  apiUpdateCartItem,
  apiDeleteCartItem,
  type CartRead,
  type CartItemBrief,
} from "@/app/lib/api";
import {
  ShoppingCart,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Shield,
  Zap,
  ArrowRight,
  Boxes,
  Cpu,
  LogOut,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Cart state
  const [cart, setCart] = useState<CartRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load Cart Data from GET /carts/me
  const loadCart = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiGetMyCart(token);
      setCart(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load shopping cart."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) {
      loadCart();
    }
  }, [authLoading, loadCart]);

  // Handle Toggle Item Selection (PUT /carts/{cart_id}/items/{variant_id})
  const handleToggleSelect = async (item: CartItemBrief) => {
    if (!cart || !token) return;

    const newSelected = !item.is_selected;

    // Optimistic local update
    setCart((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.variant_id === item.variant_id
            ? { ...i, is_selected: newSelected }
            : i
        ),
      };
    });

    try {
      await apiUpdateCartItem(
        cart.cart_id,
        item.variant_id,
        { is_selected: newSelected },
        token
      );
    } catch (err) {
      // Rollback on error
      setError(err instanceof Error ? err.message : "Failed to update item selection");
      loadCart();
    }
  };

  // Handle Select All / Deselect All
  const handleToggleSelectAll = async (targetSelect: boolean) => {
    if (!cart || !token || cart.items.length === 0) return;

    // Optimistic local update
    setCart((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) => ({ ...i, is_selected: targetSelect })),
      };
    });

    try {
      await Promise.all(
        cart.items.map((item) =>
          apiUpdateCartItem(
            cart.cart_id,
            item.variant_id,
            { is_selected: targetSelect },
            token
          )
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update selection");
      loadCart();
    }
  };

  // Handle Quantity Change (PUT /carts/{cart_id}/items/{variant_id})
  const handleQuantityChange = async (item: CartItemBrief, delta: number) => {
    if (!cart || !token) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleDeleteItem(item);
      return;
    }

    setUpdatingVariantId(item.variant_id);

    // Optimistic update
    setCart((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.variant_id === item.variant_id ? { ...i, quantity: newQty } : i
        ),
      };
    });

    try {
      await apiUpdateCartItem(
        cart.cart_id,
        item.variant_id,
        { quantity: newQty },
        token
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
      loadCart();
    } finally {
      setUpdatingVariantId(null);
    }
  };

  // Handle Delete Item (DELETE /carts/{cart_id}/items/{variant_id})
  const handleDeleteItem = async (item: CartItemBrief) => {
    if (!cart || !token) return;

    setDeletingVariantId(item.variant_id);

    try {
      await apiDeleteCartItem(cart.cart_id, item.variant_id, token);
      
      setCart((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((i) => i.variant_id !== item.variant_id),
        };
      });

      setActionSuccess(`Removed "${item.product_name || "Hardware item"}" from cart.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item from cart");
    } finally {
      setDeletingVariantId(null);
    }
  };

  // Calculations for Order Summary
  const selectedItems = useMemo(() => {
    return cart?.items?.filter((i) => i.is_selected) || [];
  }, [cart]);

  const selectedCount = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => acc + Number(item.unit_price) * item.quantity,
      0
    );
  }, [selectedItems]);

  const allSelected = useMemo(() => {
    return (
      (cart?.items?.length ?? 0) > 0 &&
      cart?.items?.every((i) => i.is_selected)
    );
  }, [cart]);

  const isCheckoutReady = selectedItems.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Drafting grid background */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-paper)]/90 backdrop-blur-md border-b border-[var(--color-rule)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
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
                  SHOPPING ENCLAVE · SECTION 3
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
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                DASHBOARD
              </Link>
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* Auth status */}
            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-rule)]">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="font-mono text-[11px] text-[var(--color-ink)] leading-none truncate max-w-[130px]">
                        {user.email}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--color-atelier-brass)] uppercase tracking-wider">
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-rule)] font-mono text-xs">
                    <Link
                      href="/login"
                      className="px-3 py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 hover:text-[var(--color-atelier-brass)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-ink)] font-semibold">Shopping Cart</span>
          </div>

          {cart && cart.items.length > 0 && (
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {cart.items.length} {cart.items.length === 1 ? "Configuration" : "Configurations"} in Enclave
            </span>
          )}
        </div>

        {/* Action Alert Banner */}
        {actionSuccess && (
          <div className="mb-6 p-3.5 rounded border border-[var(--color-terminal-green)]/40 bg-[var(--color-terminal-green)]/10 text-xs font-mono text-[var(--color-terminal-green)] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 p-3.5 rounded border border-[var(--color-restricted-red)]/40 bg-[var(--color-restricted-red)]/10 text-xs font-mono text-[var(--color-restricted-red)] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Not Logged In State */}
        {!authLoading && !user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-card)] my-8">
            <ShoppingCart className="w-14 h-14 text-[var(--color-atelier-brass)] mb-4 opacity-40" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)] mb-2">
              Secure Cart Enclave Locked
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6 leading-relaxed">
              Please authenticate to access your persistent hardware provisioning cart and retrieve active orders.
            </p>
            <Link
              href="/login"
              className="atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono"
            >
              Sign In to Access Cart →
            </Link>
          </div>
        ) : isLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 animate-pulse">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-10 bg-[var(--color-paper-sub)] rounded" />
              <div className="h-32 bg-[var(--color-paper-sub)] rounded-lg" />
              <div className="h-32 bg-[var(--color-paper-sub)] rounded-lg" />
            </div>
            <div className="lg:col-span-4 h-64 bg-[var(--color-paper-sub)] rounded-lg" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-card)] my-8">
            <Boxes className="w-16 h-16 text-[var(--color-ink-dim)] mb-4 opacity-30" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)] mb-2">
              Your Hardware Cart is Empty
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6 leading-relaxed">
              Explore our verified Apple devices, hardware modules, and cryptographic enclaves to populate your cart.
            </p>
            <Link
              href="/products"
              className="atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono inline-flex items-center gap-2"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Active Cart Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Select All Bar */}
              <div className="p-3.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] flex items-center justify-between font-mono text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--color-rule-active)] text-[var(--color-atelier-brass)] accent-[var(--color-atelier-brass)] cursor-pointer"
                  />
                  <span className="font-semibold text-[var(--color-ink)]">
                    Select All Items ({cart.items.length})
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(!allSelected)}
                  className="text-[11px] text-[var(--color-atelier-brass)] hover:underline"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-3">
                {cart.items.map((item) => {
                  const isUpdating = updatingVariantId === item.variant_id;
                  const isDeleting = deletingVariantId === item.variant_id;
                  const itemTotal = Number(item.unit_price) * item.quantity;

                  return (
                    <div
                      key={item.variant_id}
                      className={`atelier-plate relative p-4 sm:p-5 rounded-lg border transition-all ${
                        item.is_selected
                          ? "border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-sm"
                          : "border-[var(--color-rule)] bg-[var(--color-paper-sub)] opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={item.is_selected}
                            onChange={() => handleToggleSelect(item)}
                            className="w-4 h-4 rounded border-[var(--color-rule-active)] text-[var(--color-atelier-brass)] accent-[var(--color-atelier-brass)] cursor-pointer"
                            aria-label={`Select ${item.product_name || "item"}`}
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0 flex items-center justify-center p-2">
                          {item.variant_image_url ? (
                            <img
                              src={item.variant_image_url}
                              alt={item.product_name || "Hardware item"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Cpu className="w-8 h-8 text-[var(--color-ink-dim)] opacity-40" />
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 mb-2">
                            <div>
                              <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)] leading-snug">
                                {item.product_name || "Hardware Product"}
                              </h3>

                              {/* Specs & Configuration Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[11px] text-[var(--color-ink-muted)]">
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

                            {/* Item Subtotal Price */}
                            <div className="text-left sm:text-right font-mono mt-1 sm:mt-0">
                              <div className="text-base font-bold text-[var(--color-atelier-brass)]">
                                ${itemTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-[var(--color-ink-dim)]">
                                ${Number(item.unit_price).toFixed(2)} each
                              </div>
                            </div>
                          </div>

                          {/* Controls Row: Quantity Stepper & Remove */}
                          <div className="pt-3 mt-3 border-t border-[var(--color-rule-subtle)] flex items-center justify-between">
                            {/* Stepper */}
                            <div className="flex items-center border border-[var(--color-rule)] rounded bg-[var(--color-paper-terminal)] h-8">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item, -1)}
                                disabled={isUpdating || isDeleting}
                                className="px-2.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30 transition-colors"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 font-mono text-xs font-bold text-[var(--color-ink)] min-w-[24px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item, 1)}
                                disabled={isUpdating || isDeleting}
                                className="px-2.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30 transition-colors"
                                title="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              disabled={isDeleting}
                              className="text-xs font-mono text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] transition-colors flex items-center gap-1.5 py-1 px-2 rounded hover:bg-[var(--color-restricted-red)]/10"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Plate */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-lg space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                      Order Summary
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--color-terminal-cyan)] uppercase tracking-wider">
                      FLOW 3.1 CART
                    </span>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Selected Items</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        {selectedCount} {selectedCount === 1 ? "unit" : "units"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Hardware Subtotal</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Encrypted Carrier Dispatch</span>
                      <span className="text-[var(--color-terminal-green)] font-semibold">
                        Free Standard
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Estimated Sales Tax</span>
                      <span>$0.00</span>
                    </div>
                  </div>

                  {/* Total Line */}
                  <div className="pt-4 border-t border-[var(--color-rule)] flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-xs text-[var(--color-ink-dim)] uppercase block">
                        Estimated Total
                      </span>
                      <span className="text-2xl font-bold text-[var(--color-atelier-brass)]">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                      USD
                    </span>
                  </div>

                  {/* Checkout Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => router.push("/checkout")}
                      disabled={!isCheckoutReady}
                      className="w-full h-12 atelier-btn atelier-btn-primary font-mono text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {!isCheckoutReady && (
                      <p className="mt-2 text-[10px] text-center font-mono text-[var(--color-ink-dim)]">
                        Select at least one item to proceed to checkout.
                      </p>
                    )}
                  </div>
                </div>

                {/* Trust & Guarantee Badge */}
                <div className="p-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] space-y-2 font-mono text-[11px] text-[var(--color-ink-dim)]">
                  <div className="flex items-center gap-2 text-[var(--color-ink)] font-semibold">
                    <Shield className="w-4 h-4 text-[var(--color-terminal-green)] shrink-0" />
                    <span>Cryptographic Security Verified</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-muted)] leading-relaxed">
                    Orders are cryptographically signed with immutable tracking receipts recorded across our PostgreSQL ledger.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE CHECKOUT SYSTEM · FLOW 3</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
