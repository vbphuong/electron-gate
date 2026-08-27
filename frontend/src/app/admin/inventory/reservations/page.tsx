/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListStockReservations,
  apiCreateStockReservation,
  apiUpdateStockReservation,
  apiDeleteStockReservation,
  apiListInventoryLocations,
  apiGetProducts,
  apiGetProductVariants,
  type StockReservationRead,
  type InventoryLocationRead,
  type ProductListItem,
  type VariantBrief,
} from "@/app/lib/api";
import { InventoryNav } from "../InventoryNav";
import {
  BookmarkCheck,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Filter,
  Clock,
  MapPin,
  ShoppingCart,
  Layers,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";

export default function StockReservationsPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [reservations, setReservations] = useState<StockReservationRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("active");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Products & Variants lookup for creation
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [availableVariants, setAvailableVariants] = useState<VariantBrief[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(false);

  // Create Reservation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createVariantId, setCreateVariantId] = useState<string>("");
  const [createLocationId, setCreateLocationId] = useState<string>("");
  const [createCartId, setCreateCartId] = useState<string>("");
  const [createQuantity, setCreateQuantity] = useState<number | "">(1);
  const [createExpiryHours, setCreateExpiryHours] = useState<number | "">(2);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status Action Modal
  const [actionReservation, setActionReservation] = useState<StockReservationRead | null>(null);
  const [targetStatus, setTargetStatus] = useState<"released" | "expired">("released");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Delete Modal
  const [deletingReservation, setDeletingReservation] = useState<StockReservationRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load reservations
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [resData, locData] = await Promise.all([
        apiListStockReservations(token, {
          status: selectedStatusFilter !== "all" ? selectedStatusFilter : undefined,
          locationId: selectedLocationFilter !== "all" ? selectedLocationFilter : undefined,
        }),
        apiListInventoryLocations(token),
      ]);
      setReservations(resData);
      setLocations(locData);
    } catch (err: any) {
      setError(err?.message || "Failed to load stock reservations.");
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedStatusFilter, selectedLocationFilter]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (!isAuthorized) {
        router.replace("/dashboard");
      } else {
        loadData();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadData]);

  // Load products when opening create modal
  const handleOpenCreateModal = async () => {
    setCreateError(null);
    setIsCreateModalOpen(true);
    if (products.length === 0 && token) {
      try {
        const prodData = await apiGetProducts(token);
        setProducts(prodData);
        if (prodData.length > 0) {
          setSelectedProductId(prodData[0].product_id);
        }
      } catch (err: any) {
        setCreateError(err?.message || "Failed to load product catalog.");
      }
    }
  };

  // Load variants when selected product changes in create modal
  useEffect(() => {
    if (!selectedProductId || !token || !isCreateModalOpen) return;

    let isMounted = true;
    setIsLoadingVariants(true);
    apiGetProductVariants(selectedProductId, token)
      .then((vars) => {
        if (isMounted) {
          setAvailableVariants(vars);
          if (vars.length > 0) {
            setCreateVariantId(vars[0].variant_id);
          } else {
            setCreateVariantId("");
          }
        }
      })
      .catch((err) => {
        if (isMounted) setCreateError(err?.message || "Failed to load variants");
      })
      .finally(() => {
        if (isMounted) setIsLoadingVariants(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId, token, isCreateModalOpen]);

  // Set default location in create modal
  useEffect(() => {
    if (locations.length > 0 && !createLocationId) {
      setCreateLocationId(locations[0].location_id);
    }
  }, [locations, createLocationId]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (r.product_name && r.product_name.toLowerCase().includes(query)) ||
        (r.variant_model && r.variant_model.toLowerCase().includes(query)) ||
        (r.location_name && r.location_name.toLowerCase().includes(query)) ||
        r.reservation_id.toLowerCase().includes(query) ||
        r.cart_id.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [reservations, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = reservations.length;
    const activeCount = reservations.filter((r) => r.status === "active").length;
    const releasedCount = reservations.filter((r) => r.status === "released").length;
    const expiredCount = reservations.filter((r) => r.status === "expired").length;
    const activeReservedUnits = reservations
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + r.quantity, 0);

    return { total, activeCount, releasedCount, expiredCount, activeReservedUnits };
  }, [reservations]);

  // Handle Create Reservation (Admin only)
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;

    if (!createVariantId || !createLocationId || !createCartId.trim()) {
      setCreateError("Variant, facility location, and cart UUID are required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + (Number(createExpiryHours) || 2));

      await apiCreateStockReservation(
        {
          variant_id: createVariantId,
          location_id: createLocationId,
          cart_id: createCartId.trim(),
          quantity: Math.max(1, Number(createQuantity) || 1),
          expires_at: expiryDate.toISOString(),
          status: "active",
        },
        token
      );
      setActionSuccess("Stock reservation initialized successfully.");
      setIsCreateModalOpen(false);
      setCreateCartId("");
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create reservation.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Status Update (Staff + Admin)
  const handleUpdateStatus = async () => {
    if (!token || !actionReservation) return;

    setIsSubmittingStatus(true);
    setStatusError(null);
    try {
      await apiUpdateStockReservation(
        actionReservation.reservation_id,
        { status: targetStatus },
        token
      );
      setActionSuccess(`Reservation marked as ${targetStatus.toUpperCase()}.`);
      setActionReservation(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setStatusError(err?.message || "Failed to update reservation status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Handle Delete Reservation (Admin only)
  const handleDelete = async () => {
    if (!token || !deletingReservation || !isAdmin) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteStockReservation(deletingReservation.reservation_id, token);
      setActionSuccess("Reservation deleted.");
      setDeletingReservation(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete reservation.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <InventoryNav activeTab="reservations" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <BookmarkCheck className="w-3.5 h-3.5" />
              Checkout Hold Queue
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Stock Reservations
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Manage temporary stock allocations held for active user checkout carts and release expired holds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Reservations"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-2 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Hold
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

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-atelier-brass)]">Active Holds</span>
            <span className="text-xl font-bold text-[var(--color-atelier-brass)] mt-1">{stats.activeCount}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">Units on Hold</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{stats.activeReservedUnits}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-green)]">Released Holds</span>
            <span className="text-xl font-bold text-[var(--color-terminal-green)] mt-1">{stats.releasedCount}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-restricted-red)]">Expired Holds</span>
            <span className="text-xl font-bold text-[var(--color-restricted-red)] mt-1">{stats.expiredCount}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search product, variant, cart, or reservation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded pl-9 pr-3 py-2 text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-[var(--color-ink)] focus:outline-hidden text-xs pr-2"
              >
                <option value="active">Active Holds Only</option>
                <option value="all">All Reservation Statuses</option>
                <option value="released">Released Only</option>
                <option value="expired">Expired Only</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="bg-transparent text-[var(--color-ink)] focus:outline-hidden text-xs pr-2"
              >
                <option value="all">All Facilities</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reservations Table */}
        {isLoading && reservations.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--color-ink-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span>Scanning reservation holds...</span>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-2 text-center">
            <BookmarkCheck className="w-8 h-8 text-[var(--color-ink-dim)] mb-2" />
            <span className="font-fraunces text-base text-[var(--color-ink)]">No reservations found</span>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] max-w-sm">
              {searchQuery || selectedStatusFilter !== "all"
                ? "No reservations match your active filter."
                : "No stock items are currently reserved in checkout baskets."}
            </p>
          </div>
        ) : (
          <div className="border border-[var(--color-rule)] rounded overflow-hidden bg-[var(--color-paper-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item & Variant</th>
                    <th className="py-3 px-4">Facility Location</th>
                    <th className="py-3 px-4 text-center">Quantity Held</th>
                    <th className="py-3 px-4">Cart Reference</th>
                    <th className="py-3 px-4">Expiration Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {filteredReservations.map((r) => {
                    const isActive = r.status === "active";
                    const isReleased = r.status === "released";
                    const isExpired = r.status === "expired";

                    const expiryDate = new Date(r.expires_at);
                    const isTimePast = expiryDate.getTime() < Date.now();

                    return (
                      <tr key={r.reservation_id} className="hover:bg-[var(--color-paper-hover)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {r.product_name || "Product Reference"}
                            </span>
                            <span className="text-[11px] text-[var(--color-ink-muted)]">
                              {[r.variant_model, r.variant_color].filter(Boolean).join(" / ") || "Standard"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-[var(--color-ink)]">
                            <MapPin className="w-3.5 h-3.5 text-[var(--color-atelier-brass)] shrink-0" />
                            <span>{r.location_name || "Facility"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-sm text-[var(--color-atelier-brass)]">
                          {r.quantity}
                        </td>

                        <td className="py-3.5 px-4 text-[10px] text-[var(--color-ink-dim)] font-mono">
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-[var(--color-ink-dim)]" />
                            <span>{r.cart_id.slice(0, 8)}...</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isActive && isTimePast ? "text-[var(--color-restricted-red)]" : "text-[var(--color-ink-dim)]"}`} />
                            <span className={isActive && isTimePast ? "text-[var(--color-restricted-red)] font-semibold" : "text-[var(--color-ink-muted)]"}>
                              {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)]">
                              Active Hold
                            </span>
                          ) : isReleased ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)]">
                              Released
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)]">
                              Expired
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isActive && (
                              <>
                                <button
                                  onClick={() => {
                                    setActionReservation(r);
                                    setTargetStatus("released");
                                    setStatusError(null);
                                  }}
                                  className="px-2 py-1 rounded border border-[var(--color-rule)] hover:border-[var(--color-terminal-green)] hover:text-[var(--color-terminal-green)] text-[11px] flex items-center gap-1 transition-colors"
                                  title="Release Hold"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Release</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActionReservation(r);
                                    setTargetStatus("expired");
                                    setStatusError(null);
                                  }}
                                  className="px-2 py-1 rounded border border-[var(--color-rule)] hover:border-[var(--color-restricted-red)] hover:text-[var(--color-restricted-red)] text-[11px] flex items-center gap-1 transition-colors"
                                  title="Expire Hold"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Expire</span>
                                </button>
                              </>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setDeletingReservation(r);
                                  setDeleteError(null);
                                }}
                                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                title="Delete Reservation Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE HOLD MODAL (ADMIN ONLY) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <BookmarkCheck className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Create Stock Hold
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

            <form onSubmit={handleCreateReservation} className="flex flex-col gap-4">
              {/* Product */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Target Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1 flex items-center justify-between">
                  <span>Variant *</span>
                  {isLoadingVariants && <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-atelier-brass)]" />}
                </label>
                <select
                  value={createVariantId}
                  onChange={(e) => setCreateVariantId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {availableVariants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {[v.model, v.color, v.storage].filter(Boolean).join(" / ") || "Standard"} — ${v.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Location *
                </label>
                <select
                  value={createLocationId}
                  onChange={(e) => setCreateLocationId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart ID */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Cart UUID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                  value={createCartId}
                  onChange={(e) => setCreateCartId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)] font-mono text-[11px]"
                />
              </div>

              {/* Quantity & Expiry Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Hold Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={createQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCreateQuantity("");
                      } else {
                        const num = parseInt(val, 10);
                        setCreateQuantity(isNaN(num) ? "" : Math.max(1, num));
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    required
                    placeholder="2"
                    value={createExpiryHours}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCreateExpiryHours("");
                      } else {
                        const num = parseInt(val, 10);
                        setCreateExpiryHours(isNaN(num) ? "" : Math.max(1, num));
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                </div>
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
                  disabled={isSubmittingCreate || !createVariantId || !createLocationId || !createCartId.trim()}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    "Allocate Hold"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS ACTION MODAL (STAFF + ADMIN) */}
      {actionReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-[var(--color-atelier-brass)] border-b border-[var(--color-rule)] pb-3">
              <BookmarkCheck className="w-4 h-4" />
              <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                {targetStatus === "released" ? "Release Stock Hold" : "Expire Stock Hold"}
              </span>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Are you sure you want to mark reservation <strong className="text-[var(--color-ink)]">{actionReservation.reservation_id.slice(0, 8)}...</strong> as <strong className="text-[var(--color-ink)] uppercase">{targetStatus}</strong>?
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded text-[11px] text-[var(--color-ink-dim)]">
              This will update the reservation status in the registry. Released reservations allow stock to become unblocked for other purchasers.
            </div>

            {statusError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setActionReservation(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmittingStatus}
                className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Confirm ${targetStatus.toUpperCase()}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL (ADMIN ONLY) */}
      {deletingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Delete Reservation?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Permanent record deletion</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Remove reservation entry <strong className="text-[var(--color-ink)]">{deletingReservation.reservation_id}</strong>?
            </p>

            {deleteError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setDeletingReservation(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
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
