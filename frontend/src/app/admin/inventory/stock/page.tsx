/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListInventoryStock,
  apiCreateInventoryStock,
  apiUpdateInventoryStock,
  apiDeleteInventoryStock,
  apiListInventoryLocations,
  apiGetProducts,
  apiGetProductVariants,
  type InventoryStockRead,
  type InventoryLocationRead,
  type ProductListItem,
  type VariantBrief,
} from "@/app/lib/api";
import { InventoryNav } from "../InventoryNav";
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Filter,
  AlertTriangle,
  MapPin,
  Package,
  Layers,
  ArrowUpDown,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

function InventoryStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location_id") || "all";

  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [stockList, setStockList] = useState<InventoryStockRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationParam);
  const [isLowStockOnly, setIsLowStockOnly] = useState<boolean>(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Products & Variants lookup for creation
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [availableVariants, setAvailableVariants] = useState<VariantBrief[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(false);

  // Initialize Stock Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createVariantId, setCreateVariantId] = useState<string>("");
  const [createLocationId, setCreateLocationId] = useState<string>("");
  const [createQtyAvailable, setCreateQtyAvailable] = useState<number | "">("");
  const [createQtyReserved, setCreateQtyReserved] = useState<number | "">("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Quick Adjust / Edit Modal
  const [editingStock, setEditingStock] = useState<InventoryStockRead | null>(null);
  const [editQtyAvailable, setEditQtyAvailable] = useState<number | "">(0);
  const [editQtyReserved, setEditQtyReserved] = useState<number | "">(0);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deletingStock, setDeletingStock] = useState<InventoryStockRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Role permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load stock and aux data
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [stocksData, locationsData] = await Promise.all([
        apiListInventoryStock(token, {
          locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
          lowStock: isLowStockOnly ? lowStockThreshold : undefined,
        }),
        apiListInventoryLocations(token),
      ]);
      setStockList(stocksData);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory stock entries.");
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedLocationId, isLowStockOnly, lowStockThreshold]);

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
    setCreateQtyAvailable("");
    setCreateQtyReserved("");
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

  // Filtered Stock list
  const filteredStocks = useMemo(() => {
    return stockList.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (item.product_name && item.product_name.toLowerCase().includes(query)) ||
        (item.variant_model && item.variant_model.toLowerCase().includes(query)) ||
        (item.variant_color && item.variant_color.toLowerCase().includes(query)) ||
        (item.location_name && item.location_name.toLowerCase().includes(query)) ||
        item.variant_id.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [stockList, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalRecords = stockList.length;
    let totalAvailableUnits = 0;
    let totalReservedUnits = 0;
    let lowStockAlerts = 0;

    stockList.forEach((s) => {
      totalAvailableUnits += s.qty_available;
      totalReservedUnits += s.qty_reserved;
      if (s.qty_available <= lowStockThreshold) {
        lowStockAlerts += 1;
      }
    });

    return {
      totalRecords,
      totalAvailableUnits,
      totalReservedUnits,
      lowStockAlerts,
    };
  }, [stockList, lowStockThreshold]);

  // Handle Create Stock
  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;

    if (!createVariantId || !createLocationId) {
      setCreateError("Please select both a variant and a facility location.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await apiCreateInventoryStock(
        {
          variant_id: createVariantId,
          location_id: createLocationId,
          qty_available: Number(createQtyAvailable) || 0,
          qty_reserved: Number(createQtyReserved) || 0,
        },
        token
      );
      setActionSuccess("Stock entry initialized successfully.");
      setIsCreateModalOpen(false);
      setCreateQtyAvailable("");
      setCreateQtyReserved("");
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to initialize stock.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (stock: InventoryStockRead) => {
    setEditingStock(stock);
    setEditQtyAvailable(stock.qty_available);
    setEditQtyReserved(stock.qty_reserved);
    setEditError(null);
  };

  // Handle Edit Stock
  const handleEditStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingStock) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await apiUpdateInventoryStock(
        editingStock.variant_id,
        editingStock.location_id,
        {
          qty_available: Number(editQtyAvailable),
          qty_reserved: Number(editQtyReserved),
        },
        token
      );
      setActionSuccess("Stock levels adjusted successfully.");
      setEditingStock(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update stock levels.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Stock
  const handleDeleteStock = async () => {
    if (!token || !deletingStock || !isAdmin) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteInventoryStock(deletingStock.variant_id, deletingStock.location_id, token);
      setActionSuccess("Stock record deleted.");
      setDeletingStock(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete stock record.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <InventoryNav activeTab="stock" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <Boxes className="w-3.5 h-3.5" />
              SKU Stock Allotment Matrix
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Inventory Stock
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Monitor real-time warehouse on-hand levels, reserved units, and critical stock depletion warnings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Stock Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-2 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Initialize Stock
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
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">Stock Records</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{stats.totalRecords}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-green)]">Available Units</span>
            <span className="text-xl font-bold text-[var(--color-terminal-green)] mt-1">{stats.totalAvailableUnits}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-atelier-amber)]">Reserved Units</span>
            <span className="text-xl font-bold text-[var(--color-atelier-amber)] mt-1">{stats.totalReservedUnits}</span>
          </div>
          <div className={`p-4 bg-[var(--color-paper-card)] border rounded flex flex-col ${stats.lowStockAlerts > 0 ? "border-[var(--color-restricted-red)]/40 bg-[var(--color-restricted-red)]/5" : "border-[var(--color-rule)]"}`}>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-restricted-red)] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock Alerts
            </span>
            <span className="text-xl font-bold text-[var(--color-restricted-red)] mt-1">{stats.lowStockAlerts}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search product, model, color, or location..."
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
            {/* Location selector */}
            <div className="flex items-center gap-1.5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="bg-transparent text-[var(--color-ink)] focus:outline-hidden text-xs pr-2"
              >
                <option value="all">All Facilities</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Low stock toggle */}
            <button
              onClick={() => setIsLowStockOnly(!isLowStockOnly)}
              className={`px-3 py-1.5 rounded border flex items-center gap-2 transition-all ${
                isLowStockOnly
                  ? "bg-[var(--color-restricted-red)]/15 border-[var(--color-restricted-red)] text-[var(--color-restricted-red)] font-semibold"
                  : "bg-[var(--color-paper-card)] border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Low Stock Only (≤{lowStockThreshold})</span>
            </button>
          </div>
        </div>

        {/* Stock Table */}
        {isLoading && stockList.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--color-ink-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span>Scanning stock allocations...</span>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-2 text-center">
            <Boxes className="w-8 h-8 text-[var(--color-ink-dim)] mb-2" />
            <span className="font-fraunces text-base text-[var(--color-ink)]">No stock records found</span>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] max-w-sm">
              {searchQuery || isLowStockOnly || selectedLocationId !== "all"
                ? "No inventory matches your active filter criteria."
                : "No variant stock has been allocated to warehouse facilities yet."}
            </p>
            {isAdmin && !searchQuery && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded"
              >
                Initialize First Stock
              </button>
            )}
          </div>
        ) : (
          <div className="border border-[var(--color-rule)] rounded overflow-hidden bg-[var(--color-paper-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item & Variant</th>
                    <th className="py-3 px-4">Facility Location</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Total On-Hand</th>
                    <th className="py-3 px-4">Stock Health</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {filteredStocks.map((stock) => {
                    const totalUnits = stock.qty_available + stock.qty_reserved;
                    const isDepleted = stock.qty_available === 0;
                    const isLow = stock.qty_available > 0 && stock.qty_available <= lowStockThreshold;

                    return (
                      <tr
                        key={`${stock.variant_id}-${stock.location_id}`}
                        className="hover:bg-[var(--color-paper-hover)]/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {stock.product_name || "Unnamed Product"}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                              {stock.variant_model && <span>{stock.variant_model}</span>}
                              {stock.variant_color && (
                                <>
                                  <span className="text-[var(--color-ink-dim)]">•</span>
                                  <span>{stock.variant_color}</span>
                                </>
                              )}
                              {stock.variant_storage && (
                                <>
                                  <span className="text-[var(--color-ink-dim)]">•</span>
                                  <span>{stock.variant_storage}</span>
                                </>
                              )}
                            </div>
                            <span className="text-[9px] text-[var(--color-ink-dim)] mt-0.5">
                              VAR: {stock.variant_id.slice(0, 8)}...
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[var(--color-ink)]">
                            <MapPin className="w-3.5 h-3.5 text-[var(--color-atelier-brass)] shrink-0" />
                            <span>{stock.location_name || "Central Facility"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold text-sm ${
                              isDepleted
                                ? "text-[var(--color-restricted-red)]"
                                : isLow
                                ? "text-[var(--color-atelier-amber)]"
                                : "text-[var(--color-terminal-green)]"
                            }`}
                          >
                            {stock.qty_available}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-[var(--color-ink-muted)] font-mono">
                          {stock.qty_reserved}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-[var(--color-ink)]">
                          {totalUnits}
                        </td>

                        <td className="py-3.5 px-4">
                          {isDepleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)]">
                              <AlertCircle className="w-3 h-3" /> Depleted
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-atelier-amber)]/15 border border-[var(--color-atelier-amber)]/40 text-[var(--color-atelier-amber)]">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)]">
                              Healthy
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(stock)}
                              className="px-2 py-1 rounded border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] hover:text-[var(--color-atelier-brass)] text-[var(--color-ink-muted)] text-[11px] flex items-center gap-1 transition-colors"
                              title="Adjust Quantity"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Adjust</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setDeletingStock(stock);
                                  setDeleteError(null);
                                }}
                                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                title="Remove Stock Record"
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

      {/* INITIALIZE STOCK MODAL (ADMIN ONLY) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Boxes className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Initialize Stock Record
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

            <form onSubmit={handleCreateStock} className="flex flex-col gap-4">
              {/* Product Selection */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  1. Target Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name} ({p.variant_count} variants)
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant Selection */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1 flex items-center justify-between">
                  <span>2. Product Variant *</span>
                  {isLoadingVariants && <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-atelier-brass)]" />}
                </label>
                <select
                  value={createVariantId}
                  onChange={(e) => setCreateVariantId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {availableVariants.length === 0 ? (
                    <option value="">No variants defined for this product</option>
                  ) : (
                    availableVariants.map((v) => (
                      <option key={v.variant_id} value={v.variant_id}>
                        {[v.model, v.color, v.storage].filter(Boolean).join(" / ") || "Standard"} — ${v.price}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Location Selection */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  3. Facility Location *
                </label>
                <select
                  value={createLocationId}
                  onChange={(e) => setCreateLocationId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Initial Available Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={createQtyAvailable}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCreateQtyAvailable("");
                      } else {
                        const num = parseInt(val, 10);
                        setCreateQtyAvailable(isNaN(num) ? "" : Math.max(0, num));
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Reserved Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={createQtyReserved}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCreateQtyReserved("");
                      } else {
                        const num = parseInt(val, 10);
                        setCreateQtyReserved(isNaN(num) ? "" : Math.max(0, num));
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
                  disabled={isSubmittingCreate || !createVariantId || !createLocationId}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Allocate Stock"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST QUANTITY MODAL (STAFF + ADMIN) */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Edit3 className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Adjust Inventory Stock
                </span>
              </div>
              <button
                onClick={() => setEditingStock(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded flex flex-col gap-1">
              <span className="font-semibold text-[var(--color-ink)]">{editingStock.product_name}</span>
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                {[editingStock.variant_model, editingStock.variant_color, editingStock.variant_storage]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              <span className="text-[10px] text-[var(--color-atelier-brass)] flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {editingStock.location_name}
              </span>
            </div>

            {editError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditStock} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Available Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editQtyAvailable}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setEditQtyAvailable("");
                      } else {
                        const num = parseInt(val, 10);
                        setEditQtyAvailable(isNaN(num) ? "" : Math.max(0, num));
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[-5, -1, +1, +5].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setEditQtyAvailable((prev) => Math.max(0, (typeof prev === "number" ? prev : 0) + delta))}
                        className="flex-1 py-1 bg-[var(--color-paper-hover)] border border-[var(--color-rule)] rounded text-[10px] hover:border-[var(--color-atelier-brass)]"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Reserved Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editQtyReserved}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setEditQtyReserved("");
                      } else {
                        const num = parseInt(val, 10);
                        setEditQtyReserved(isNaN(num) ? "" : Math.max(0, num));
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[-1, +1].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setEditQtyReserved((prev) => Math.max(0, (typeof prev === "number" ? prev : 0) + delta))}
                        className="flex-1 py-1 bg-[var(--color-paper-hover)] border border-[var(--color-rule)] rounded text-[10px] hover:border-[var(--color-atelier-brass)]"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-[var(--color-paper-sub)] rounded border border-[var(--color-rule)] flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-ink-muted)]">Calculated Total On-Hand:</span>
                <span className="font-bold text-[var(--color-ink)]">{(Number(editQtyAvailable) || 0) + (Number(editQtyReserved) || 0)} units</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Quantities"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL (ADMIN ONLY) */}
      {deletingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Remove Stock Record?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Facility Stock Unlink</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Are you sure you want to remove the inventory record for <strong className="text-[var(--color-ink)]">{deletingStock.product_name}</strong> at <strong className="text-[var(--color-ink)]">{deletingStock.location_name}</strong>?
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
                onClick={() => setDeletingStock(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStock}
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

export default function InventoryStockPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12 font-mono text-xs text-[var(--color-ink-muted)]">
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-atelier-brass)] mr-2" />
        Loading inventory stock system...
      </div>
    }>
      <InventoryStockContent />
    </Suspense>
  );
}
