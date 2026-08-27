/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListInventoryMovements,
  apiCreateInventoryMovement,
  apiDeleteInventoryMovement,
  apiListInventoryLocations,
  apiGetProducts,
  apiGetProductVariants,
  type InventoryMovementRead,
  type InventoryLocationRead,
  type ProductListItem,
  type VariantBrief,
} from "@/app/lib/api";
import { InventoryNav } from "../InventoryNav";
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  MapPin,
  ShieldAlert,
  Info,
  Clock,
  Layers,
} from "lucide-react";

const MOVEMENT_TYPES = [
  { id: "all", label: "All Movements" },
  { id: "in", label: "Inbound (Receive)", icon: ArrowDownLeft, color: "text-[var(--color-terminal-green)]", bg: "bg-[var(--color-terminal-green)]/10", border: "border-[var(--color-terminal-green)]/30" },
  { id: "out", label: "Outbound (Ship)", icon: ArrowUpRight, color: "text-[var(--color-restricted-red)]", bg: "bg-[var(--color-restricted-red)]/10", border: "border-[var(--color-restricted-red)]/30" },
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight, color: "text-[var(--color-terminal-cyan)]", bg: "bg-[var(--color-terminal-cyan)]/10", border: "border-[var(--color-terminal-cyan)]/30" },
  { id: "adjustment", label: "Adjustment", icon: Sliders, color: "text-[var(--color-enclave-violet)]", bg: "bg-[var(--color-enclave-violet)]/10", border: "border-[var(--color-enclave-violet)]/30" },
  { id: "return", label: "Return", icon: RotateCcw, color: "text-[var(--color-atelier-brass)]", bg: "bg-[var(--color-atelier-brass)]/10", border: "border-[var(--color-atelier-brass)]/30" },
];

export default function InventoryMovementsPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [movements, setMovements] = useState<InventoryMovementRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
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

  // Record Movement Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordVariantId, setRecordVariantId] = useState<string>("");
  const [recordLocationId, setRecordLocationId] = useState<string>("");
  const [recordType, setRecordType] = useState<string>("in");
  const [recordQuantity, setRecordQuantity] = useState<number | "">(1);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState<boolean>(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Delete Modal (Admin only)
  const [deletingMovement, setDeletingMovement] = useState<InventoryMovementRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load movements
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [movementsData, locationsData] = await Promise.all([
        apiListInventoryMovements(token, {
          locationId: selectedLocationFilter !== "all" ? selectedLocationFilter : undefined,
          movementType: selectedTypeFilter !== "all" ? selectedTypeFilter : undefined,
        }),
        apiListInventoryLocations(token),
      ]);
      setMovements(movementsData);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory movements ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedLocationFilter, selectedTypeFilter]);

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

  // Load products when opening record modal
  const handleOpenRecordModal = async () => {
    setRecordError(null);
    setIsRecordModalOpen(true);
    if (products.length === 0 && token) {
      try {
        const prodData = await apiGetProducts(token);
        setProducts(prodData);
        if (prodData.length > 0) {
          setSelectedProductId(prodData[0].product_id);
        }
      } catch (err: any) {
        setRecordError(err?.message || "Failed to load product catalog.");
      }
    }
  };

  // Load variants when selected product changes in record modal
  useEffect(() => {
    if (!selectedProductId || !token || !isRecordModalOpen) return;

    let isMounted = true;
    setIsLoadingVariants(true);
    apiGetProductVariants(selectedProductId, token)
      .then((vars) => {
        if (isMounted) {
          setAvailableVariants(vars);
          if (vars.length > 0) {
            setRecordVariantId(vars[0].variant_id);
          } else {
            setRecordVariantId("");
          }
        }
      })
      .catch((err) => {
        if (isMounted) setRecordError(err?.message || "Failed to load variants");
      })
      .finally(() => {
        if (isMounted) setIsLoadingVariants(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId, token, isRecordModalOpen]);

  // Set default location in record modal
  useEffect(() => {
    if (locations.length > 0 && !recordLocationId) {
      setRecordLocationId(locations[0].location_id);
    }
  }, [locations, recordLocationId]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (m.product_name && m.product_name.toLowerCase().includes(query)) ||
        (m.variant_model && m.variant_model.toLowerCase().includes(query)) ||
        (m.variant_color && m.variant_color.toLowerCase().includes(query)) ||
        (m.location_name && m.location_name.toLowerCase().includes(query)) ||
        m.movement_id.toLowerCase().includes(query) ||
        m.movement_type.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [movements, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalTransactions = movements.length;
    let inQty = 0;
    let outQty = 0;
    let transferQty = 0;

    movements.forEach((m) => {
      if (m.movement_type === "in") inQty += m.quantity;
      else if (m.movement_type === "out") outQty += m.quantity;
      else transferQty += m.quantity;
    });

    return { totalTransactions, inQty, outQty, transferQty };
  }, [movements]);

  // Handle Record Movement
  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!recordVariantId || !recordLocationId) {
      setRecordError("Please specify both the variant and the facility location.");
      return;
    }

    const parsedQty = typeof recordQuantity === "number" ? recordQuantity : parseInt(recordQuantity, 10);
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      setRecordError("Quantity must be a positive non-zero integer.");
      return;
    }

    setIsSubmittingRecord(true);
    setRecordError(null);
    try {
      await apiCreateInventoryMovement(
        {
          variant_id: recordVariantId,
          location_id: recordLocationId,
          movement_type: recordType,
          quantity: Math.abs(parsedQty),
        },
        token
      );
      setActionSuccess(`Recorded ${recordType.toUpperCase()} movement of ${Math.abs(parsedQty)} unit(s).`);
      setIsRecordModalOpen(false);
      setRecordQuantity(1);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setRecordError(err?.message || "Failed to record movement.");
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  // Handle Delete Movement (Admin only)
  const handleDeleteMovement = async () => {
    if (!token || !deletingMovement || !isAdmin) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteInventoryMovement(deletingMovement.movement_id, token);
      setActionSuccess(`Movement record deleted.`);
      setDeletingMovement(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete movement entry.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <InventoryNav activeTab="movements" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Immutable Audit Trail
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Inventory Movements
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Audited transaction ledger for inbound receipts, outbound dispatch, transfers, and inventory reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Movement Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleOpenRecordModal}
              className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-2 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Movement
            </button>
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
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">Total Log Entries</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{stats.totalTransactions}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-green)]">Inbound Received</span>
            <span className="text-xl font-bold text-[var(--color-terminal-green)] mt-1">+{stats.inQty}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-restricted-red)]">Outbound Dispatched</span>
            <span className="text-xl font-bold text-[var(--color-restricted-red)] mt-1">-{stats.outQty}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-cyan)]">Transfers & Audits</span>
            <span className="text-xl font-bold text-[var(--color-terminal-cyan)] mt-1">{stats.transferQty}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Filter by product, facility, type, or movement ID..."
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
            {/* Movement Type Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent text-[var(--color-ink)] focus:outline-hidden text-xs pr-2"
              >
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
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
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Movements Table */}
        {isLoading && movements.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--color-ink-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span>Scanning transaction journal...</span>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-2 text-center">
            <ArrowLeftRight className="w-8 h-8 text-[var(--color-ink-dim)] mb-2" />
            <span className="font-fraunces text-base text-[var(--color-ink)]">No movement entries logged</span>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] max-w-sm">
              {searchQuery || selectedTypeFilter !== "all" || selectedLocationFilter !== "all"
                ? "No movements match your active filters."
                : "No inventory stock transitions have occurred yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenRecordModal}
                className="mt-4 px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded"
              >
                Log Initial Inbound
              </button>
            )}
          </div>
        ) : (
          <div className="border border-[var(--color-rule)] rounded overflow-hidden bg-[var(--color-paper-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Item & Variant</th>
                    <th className="py-3 px-4">Facility Location</th>
                    <th className="py-3 px-4 text-center">Quantity Delta</th>
                    <th className="py-3 px-4">Movement ID</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Audit Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {filteredMovements.map((m) => {
                    const typeConfig = MOVEMENT_TYPES.find((t) => t.id === m.movement_type) || {
                      label: m.movement_type,
                      color: "text-[var(--color-ink-muted)]",
                      bg: "bg-[var(--color-paper-sub)]",
                      border: "border-[var(--color-rule)]",
                    };

                    const isOut = m.movement_type === "out";
                    const isIn = m.movement_type === "in";

                    return (
                      <tr key={m.movement_id} className="hover:bg-[var(--color-paper-hover)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase font-bold border ${typeConfig.bg} ${typeConfig.border} ${typeConfig.color}`}
                          >
                            {isIn && <ArrowDownLeft className="w-3 h-3" />}
                            {isOut && <ArrowUpRight className="w-3 h-3" />}
                            {m.movement_type === "transfer" && <ArrowLeftRight className="w-3 h-3" />}
                            {m.movement_type === "adjustment" && <Sliders className="w-3 h-3" />}
                            {m.movement_type === "return" && <RotateCcw className="w-3 h-3" />}
                            <span>{m.movement_type}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {m.product_name || "Product Reference"}
                            </span>
                            <span className="text-[11px] text-[var(--color-ink-muted)]">
                              {[m.variant_model, m.variant_color].filter(Boolean).join(" / ") || "Standard Variant"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[var(--color-ink)]">
                            <MapPin className="w-3.5 h-3.5 text-[var(--color-atelier-brass)] shrink-0" />
                            <span>{m.location_name || "Facility"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold text-sm ${
                              isIn
                                ? "text-[var(--color-terminal-green)]"
                                : isOut
                                ? "text-[var(--color-restricted-red)]"
                                : "text-[var(--color-ink)]"
                            }`}
                          >
                            {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : `±${m.quantity}`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[10px] text-[var(--color-ink-dim)] font-mono">
                          {m.movement_id.slice(0, 8)}...{m.movement_id.slice(-4)}
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setDeletingMovement(m);
                                setDeleteError(null);
                              }}
                              className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                              title="Delete Audit Entry (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* RECORD MOVEMENT MODAL (STAFF + ADMIN) */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <ArrowLeftRight className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Record Stock Movement
                </span>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded flex items-start gap-2 text-[11px] text-[var(--color-ink-dim)] leading-relaxed">
              <Info className="w-4 h-4 text-[var(--color-atelier-brass)] shrink-0 mt-0.5" />
              <span>
                Movements are immutable audit trail records. Once posted, an entry cannot be modified (no PUT). To correct an error, record an offsetting adjustment.
              </span>
            </div>

            {recordError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recordError}</span>
              </div>
            )}

            <form onSubmit={handleRecordMovement} className="flex flex-col gap-4">
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
                  <span>Product Variant *</span>
                  {isLoadingVariants && <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-atelier-brass)]" />}
                </label>
                <select
                  value={recordVariantId}
                  onChange={(e) => setRecordVariantId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {availableVariants.length === 0 ? (
                    <option value="">No variants found</option>
                  ) : (
                    availableVariants.map((v) => (
                      <option key={v.variant_id} value={v.variant_id}>
                        {[v.model, v.color, v.storage].filter(Boolean).join(" / ") || "Standard"} — ${v.price}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Location *
                </label>
                <select
                  value={recordLocationId}
                  onChange={(e) => setRecordLocationId(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Movement Type *
                  </label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  >
                    <option value="in">in (Receiving)</option>
                    <option value="out">out (Dispatch / Order)</option>
                    <option value="transfer">transfer (Relocation)</option>
                    <option value="adjustment">adjustment (Audit)</option>
                    <option value="return">return (Customer Return)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                    Quantity Delta *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 10"
                    value={recordQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setRecordQuantity("");
                      } else {
                        const num = parseInt(val, 10);
                        setRecordQuantity(isNaN(num) ? "" : num);
                      }
                    }}
                    className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecord || !recordVariantId || !recordLocationId}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingRecord ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Committing...
                    </>
                  ) : (
                    "Post Movement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE AUDIT CONFIRM MODAL (ADMIN ONLY) */}
      {deletingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Purge Movement Entry?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">High-Privilege Audit Override</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              You are about to delete audit entry <strong className="text-[var(--color-ink)]">{deletingMovement.movement_id}</strong> ({deletingMovement.movement_type.toUpperCase()} of {deletingMovement.quantity} units).
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-restricted-red)]/30 rounded text-[11px] text-[var(--color-restricted-red)]">
              Warning: Deleting movement entries compromises historical audit integrity. It should only be done for erroneous test data.
            </div>

            {deleteError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setDeletingMovement(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMovement}
                disabled={isSubmittingDelete}
                className="px-4 py-2 bg-[var(--color-restricted-red)] text-white font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Purge"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
