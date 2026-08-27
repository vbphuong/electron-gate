/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListInventoryStock,
  apiListInventoryLocations,
  apiListInventoryMovements,
  apiListStockReservations,
  type InventoryStockRead,
  type InventoryLocationRead,
  type InventoryMovementRead,
  type StockReservationRead,
} from "@/app/lib/api";
import { InventoryNav } from "./InventoryNav";
import {
  Warehouse,
  Boxes,
  MapPin,
  ArrowLeftRight,
  BookmarkCheck,
  AlertTriangle,
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingDown,
  Building2,
  Store,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";

export default function AdminInventoryOverviewPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [stocks, setStocks] = useState<InventoryStockRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRead[]>([]);
  const [reservations, setReservations] = useState<StockReservationRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load all overview metrics
  const loadOverview = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [stocksData, locationsData, movementsData, reservationsData] = await Promise.all([
        apiListInventoryStock(token),
        apiListInventoryLocations(token),
        apiListInventoryMovements(token),
        apiListStockReservations(token, { status: "active" }),
      ]);
      setStocks(stocksData);
      setLocations(locationsData);
      setMovements(movementsData);
      setReservations(reservationsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory dashboard data.");
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
        loadOverview();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadOverview]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalAvailable = stocks.reduce((sum, s) => sum + s.qty_available, 0);
    const totalReserved = stocks.reduce((sum, s) => sum + s.qty_reserved, 0);
    const totalOnHoldReservations = reservations.reduce((sum, r) => sum + r.quantity, 0);

    const lowStockItems = stocks.filter((s) => s.qty_available <= 5);
    const depletedItems = stocks.filter((s) => s.qty_available === 0);

    // Group units by location
    const locationStockMap = new Map<string, { available: number; reserved: number; skus: number }>();
    stocks.forEach((s) => {
      const cur = locationStockMap.get(s.location_id) || { available: 0, reserved: 0, skus: 0 };
      cur.available += s.qty_available;
      cur.reserved += s.qty_reserved;
      cur.skus += 1;
      locationStockMap.set(s.location_id, cur);
    });

    return {
      totalAvailable,
      totalReserved,
      totalOnHoldReservations,
      totalSKUs: stocks.length,
      totalFacilities: locations.length,
      lowStockCount: lowStockItems.length,
      depletedCount: depletedItems.length,
      lowStockItems: lowStockItems.slice(0, 5),
      recentMovements: movements.slice(-6).reverse(),
      locationStockMap,
    };
  }, [stocks, locations, movements, reservations]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <InventoryNav activeTab="overview" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <Warehouse className="w-3.5 h-3.5" />
              Unified Supply Chain Enclave
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Inventory Control Center
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Centralized visibility across regional storage facilities, SKU on-hand levels, and stock audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadOverview}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50 flex items-center gap-2 font-mono text-xs"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            {isAdmin && (
              <Link
                href="/admin/inventory/stock"
                className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-2 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs"
              >
                <Boxes className="w-4 h-4" />
                Manage Stock
              </Link>
            )}
          </div>
        </div>

        {/* Error Notification */}
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

        {/* Executive Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Available Units */}
          <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--color-ink-dim)] text-[10px] uppercase tracking-wider">
              <span>Available Units</span>
              <Boxes className="w-4 h-4 text-[var(--color-terminal-green)]" />
            </div>
            <div className="my-3">
              <span className="text-2xl lg:text-3xl font-bold text-[var(--color-terminal-green)]">
                {isLoading ? "..." : metrics.totalAvailable}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] ml-1">in stock</span>
            </div>
            <div className="text-[11px] text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-rule)] flex justify-between">
              <span>Across {metrics.totalSKUs} SKU combos</span>
            </div>
          </div>

          {/* Card 2: Reserved Units */}
          <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--color-ink-dim)] text-[10px] uppercase tracking-wider">
              <span>Reserved Units</span>
              <BookmarkCheck className="w-4 h-4 text-[var(--color-atelier-amber)]" />
            </div>
            <div className="my-3">
              <span className="text-2xl lg:text-3xl font-bold text-[var(--color-atelier-amber)]">
                {isLoading ? "..." : metrics.totalReserved}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] ml-1">allocated</span>
            </div>
            <div className="text-[11px] text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-rule)] flex justify-between">
              <span>{reservations.length} checkout holds</span>
            </div>
          </div>

          {/* Card 3: Stock Depletion Warnings */}
          <div
            className={`p-5 bg-[var(--color-paper-card)] border rounded-lg flex flex-col justify-between ${
              metrics.lowStockCount > 0
                ? "border-[var(--color-restricted-red)]/50 bg-[var(--color-restricted-red)]/5"
                : "border-[var(--color-rule)]"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-restricted-red)] font-semibold">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Depleted / Low
              </span>
              <span>{metrics.depletedCount} out of stock</span>
            </div>
            <div className="my-3">
              <span className="text-2xl lg:text-3xl font-bold text-[var(--color-restricted-red)]">
                {isLoading ? "..." : metrics.lowStockCount}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] ml-1">critical SKUs</span>
            </div>
            <div className="text-[11px] text-[var(--color-restricted-red)] pt-2 border-t border-[var(--color-restricted-red)]/20">
              <Link href="/admin/inventory/stock" className="hover:underline flex items-center gap-1">
                Review replenishments <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 4: Storage Facilities */}
          <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--color-ink-dim)] text-[10px] uppercase tracking-wider">
              <span>Active Facilities</span>
              <MapPin className="w-4 h-4 text-[var(--color-atelier-brass)]" />
            </div>
            <div className="my-3">
              <span className="text-2xl lg:text-3xl font-bold text-[var(--color-atelier-brass)]">
                {isLoading ? "..." : metrics.totalFacilities}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] ml-1">nodes</span>
            </div>
            <div className="text-[11px] text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-rule)] flex justify-between">
              <Link href="/admin/inventory/locations" className="hover:underline text-[var(--color-atelier-brass)] flex items-center gap-1">
                Facility network <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Access Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/inventory/stock"
            className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-atelier-brass)]">
                  Stock Matrix
                </h3>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">Allocate & track quantities</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/inventory/locations"
            className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-terminal-cyan)]">
                  Facility Registry
                </h3>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">Warehouses & Stores</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/inventory/movements"
            className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[var(--color-terminal-green)]/10 text-[var(--color-terminal-green)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-terminal-green)]">
                  Movement Audit
                </h3>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">Inbound, out & transfers</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/inventory/reservations"
            className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[var(--color-atelier-amber)]/10 text-[var(--color-atelier-amber)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-atelier-amber)]">
                  Checkout Holds
                </h3>
                <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">Cart reservations queue</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Two Columns: Low Stock Alerts & Recent Movement Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Low Stock Alert Table */}
          <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--color-restricted-red)]" />
                <h2 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Depleted & Low Stock Attention
                </h2>
              </div>
              <Link
                href="/admin/inventory/stock"
                className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {metrics.lowStockItems.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)] font-mono text-xs">
                <CheckCircle2 className="w-6 h-6 text-[var(--color-terminal-green)] mb-1" />
                <span>All tracked SKUs maintain adequate stock buffers.</span>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-rule)] font-mono text-xs">
                {metrics.lowStockItems.map((item) => {
                  const isDepleted = item.qty_available === 0;

                  return (
                    <div
                      key={`${item.variant_id}-${item.location_id}`}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {item.product_name || "Unnamed Product"}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-dim)]">
                          <span>{[item.variant_model, item.variant_color].filter(Boolean).join(" / ") || "Standard"}</span>
                          <span>•</span>
                          <span className="text-[var(--color-atelier-brass)]">{item.location_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                            isDepleted
                              ? "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                              : "bg-[var(--color-atelier-amber)]/15 text-[var(--color-atelier-amber)] border border-[var(--color-atelier-amber)]/30"
                          }`}
                        >
                          {item.qty_available} left
                        </span>
                        <Link
                          href={`/admin/inventory/stock?location_id=${item.location_id}`}
                          className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] transition-colors"
                          title="Restock Variant"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Recent Movement Activity */}
          <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                <h2 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Recent Inventory Activity
                </h2>
              </div>
              <Link
                href="/admin/inventory/movements"
                className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
              >
                Full ledger <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {metrics.recentMovements.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)] font-mono text-xs">
                <Clock className="w-6 h-6 text-[var(--color-ink-dim)] mb-1" />
                <span>No movement transactions recorded yet.</span>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-rule)] font-mono text-xs">
                {metrics.recentMovements.map((m) => {
                  const isIn = m.movement_type === "in";
                  const isOut = m.movement_type === "out";

                  return (
                    <div key={m.movement_id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            isIn
                              ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)]"
                              : isOut
                              ? "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)]"
                              : "bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)]"
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : isOut ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowLeftRight className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-ink)] truncate max-w-[200px] sm:max-w-xs">
                            {m.product_name || "Product Item"}
                          </span>
                          <span className="text-[10px] text-[var(--color-ink-dim)]">
                            {m.location_name} • {m.movement_type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold ${
                            isIn
                              ? "text-[var(--color-terminal-green)]"
                              : isOut
                              ? "text-[var(--color-restricted-red)]"
                              : "text-[var(--color-ink)]"
                          }`}
                        >
                          {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : `±${m.quantity}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Facilities Regional Status */}
        <div className="p-5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-atelier-brass)]" />
              <h2 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                Storage Facility Network Status
              </h2>
            </div>
            <Link
              href="/admin/inventory/locations"
              className="font-mono text-xs text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
            >
              Manage facilities <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {locations.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[var(--color-ink-muted)]">
              No storage locations configured.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locations.map((loc) => {
                const stockSummary = metrics.locationStockMap.get(loc.location_id) || {
                  available: 0,
                  reserved: 0,
                  skus: 0,
                };
                const isWarehouse = loc.type.toLowerCase() === "warehouse";

                return (
                  <div
                    key={loc.location_id}
                    className="p-4 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded flex flex-col justify-between gap-3 font-mono"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-fraunces text-sm font-bold text-[var(--color-ink)]">
                          {loc.name}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                            isWarehouse
                              ? "bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] border-[var(--color-terminal-cyan)]/30"
                              : "bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border-[var(--color-atelier-brass)]/30"
                          }`}
                        >
                          {loc.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-ink-dim)] truncate">
                        {loc.address || "No address assigned"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[var(--color-terminal-green)] font-bold">
                          {stockSummary.available}
                        </span>
                        <span className="text-[var(--color-ink-dim)] text-[10px] ml-1">avail</span>
                        <span className="mx-1.5 text-[var(--color-rule)]">|</span>
                        <span className="text-[var(--color-atelier-amber)] font-bold">
                          {stockSummary.reserved}
                        </span>
                        <span className="text-[var(--color-ink-dim)] text-[10px] ml-1">res</span>
                      </div>

                      <Link
                        href={`/admin/inventory/stock?location_id=${loc.location_id}`}
                        className="text-[10px] text-[var(--color-atelier-brass)] hover:underline flex items-center gap-0.5"
                      >
                        Browse <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
