/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListInventoryLocations,
  apiCreateInventoryLocation,
  apiUpdateInventoryLocation,
  apiDeleteInventoryLocation,
  type InventoryLocationRead,
} from "@/app/lib/api";
import { InventoryNav } from "../InventoryNav";
import {
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Warehouse,
  Building2,
  Store,
  Filter,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function InventoryLocationsPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createType, setCreateType] = useState<string>("warehouse");
  const [createAddress, setCreateAddress] = useState<string>("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingLocation, setEditingLocation] = useState<InventoryLocationRead | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editType, setEditType] = useState<string>("warehouse");
  const [editAddress, setEditAddress] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deletingLocation, setDeletingLocation] = useState<InventoryLocationRead | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Role permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load locations
  const loadLocations = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiListInventoryLocations(
        token,
        selectedTypeFilter !== "all" ? selectedTypeFilter : undefined
      );
      setLocations(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory locations.");
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedTypeFilter]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (!isAuthorized) {
        router.replace("/dashboard");
      } else {
        loadLocations();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadLocations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        loc.name.toLowerCase().includes(query) ||
        (loc.address && loc.address.toLowerCase().includes(query)) ||
        loc.type.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [locations, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = locations.length;
    const warehouseCount = locations.filter((l) => l.type.toLowerCase() === "warehouse").length;
    const storeCount = locations.filter((l) => l.type.toLowerCase() === "store").length;
    const otherCount = total - (warehouseCount + storeCount);
    return { total, warehouseCount, storeCount, otherCount };
  }, [locations]);

  // Handle Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;

    if (!createName.trim()) {
      setCreateError("Location name is required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await apiCreateInventoryLocation(
        {
          name: createName.trim(),
          type: createType.trim(),
          address: createAddress.trim() || undefined,
        },
        token
      );
      setActionSuccess(`Location "${createName}" successfully added.`);
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateAddress("");
      setCreateType("warehouse");
      loadLocations();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create location.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit
  const openEditModal = (loc: InventoryLocationRead) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditType(loc.type);
    setEditAddress(loc.address || "");
    setEditError(null);
  };

  // Handle Edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingLocation || !isAdmin) return;

    if (!editName.trim()) {
      setEditError("Location name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await apiUpdateInventoryLocation(
        editingLocation.location_id,
        {
          name: editName.trim(),
          type: editType.trim(),
          address: editAddress.trim() || undefined,
        },
        token
      );
      setActionSuccess(`Location "${editName}" updated successfully.`);
      setEditingLocation(null);
      loadLocations();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update location.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!token || !deletingLocation || !isAdmin) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteInventoryLocation(deletingLocation.location_id, token);
      setActionSuccess(`Location "${deletingLocation.name}" removed.`);
      setDeletingLocation(null);
      loadLocations();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(
        err?.message || "Cannot delete location. Ensure no stocks or movements exist for this facility."
      );
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      {/* Sub-Nav */}
      <InventoryNav activeTab="locations" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <MapPin className="w-3.5 h-3.5" />
              Facility & Node Registry
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Inventory Locations
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Manage centralized warehouses, local retail hubs, and drop-ship storage facilities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLocations}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Locations"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCreateError(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-2 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
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
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">Total Facilities</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{stats.total}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-cyan)]">Warehouses</span>
            <span className="text-xl font-bold text-[var(--color-terminal-cyan)] mt-1">{stats.warehouseCount}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-atelier-brass)]">Retail Stores</span>
            <span className="text-xl font-bold text-[var(--color-atelier-brass)] mt-1">{stats.storeCount}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">Other Nodes</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{stats.otherCount}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search by facility name or address..."
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

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
            >
              <option value="all">All Facility Types</option>
              <option value="warehouse">Warehouse Only</option>
              <option value="store">Retail Store Only</option>
              <option value="fulfillment">Fulfillment Center</option>
            </select>
          </div>
        </div>

        {/* Locations Grid / Table */}
        {isLoading && locations.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--color-ink-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span>Scanning facility network...</span>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-12 border border-[var(--color-rule)] rounded bg-[var(--color-paper-card)] flex flex-col items-center justify-center gap-2 text-center">
            <MapPin className="w-8 h-8 text-[var(--color-ink-dim)] mb-2" />
            <span className="font-fraunces text-base text-[var(--color-ink)]">No facilities found</span>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] max-w-sm">
              {searchQuery
                ? `No locations match "${searchQuery}". Clear your search query.`
                : "No inventory locations have been registered yet."}
            </p>
            {isAdmin && !searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded"
              >
                Register First Location
              </button>
            )}
          </div>
        ) : (
          <div className="border border-[var(--color-rule)] rounded overflow-hidden bg-[var(--color-paper-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Facility Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Physical Address</th>
                    <th className="py-3 px-4">Facility ID</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {filteredLocations.map((loc) => {
                    const isWarehouse = loc.type.toLowerCase() === "warehouse";
                    const isStore = loc.type.toLowerCase() === "store";

                    return (
                      <tr key={loc.location_id} className="hover:bg-[var(--color-paper-hover)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded flex items-center justify-center border ${
                                isWarehouse
                                  ? "bg-[var(--color-terminal-cyan)]/10 border-[var(--color-terminal-cyan)]/30 text-[var(--color-terminal-cyan)]"
                                  : isStore
                                  ? "bg-[var(--color-atelier-brass)]/10 border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)]"
                                  : "bg-[var(--color-paper-sub)] border-[var(--color-rule)] text-[var(--color-ink-muted)]"
                              }`}
                            >
                              {isWarehouse ? (
                                <Warehouse className="w-3.5 h-3.5" />
                              ) : isStore ? (
                                <Store className="w-3.5 h-3.5" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--color-ink)] block">{loc.name}</span>
                              <Link
                                href={`/admin/inventory/stock?location_id=${loc.location_id}`}
                                className="text-[10px] text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1 mt-0.5"
                              >
                                View stock inventory <ArrowRight className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
                              isWarehouse
                                ? "bg-[var(--color-terminal-cyan)]/10 border-[var(--color-terminal-cyan)]/30 text-[var(--color-terminal-cyan)]"
                                : isStore
                                ? "bg-[var(--color-atelier-brass)]/10 border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)]"
                                : "bg-[var(--color-paper-sub)] border-[var(--color-rule)] text-[var(--color-ink-muted)]"
                            }`}
                          >
                            {loc.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--color-ink-muted)] max-w-xs truncate">
                          {loc.address || <span className="text-[var(--color-ink-dim)] italic">No address provided</span>}
                        </td>
                        <td className="py-3.5 px-4 text-[10px] text-[var(--color-ink-dim)] font-mono">
                          {loc.location_id.slice(0, 8)}...{loc.location_id.slice(-4)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => openEditModal(loc)}
                                  className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                  title="Edit Location"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingLocation(loc);
                                    setDeleteError(null);
                                  }}
                                  className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                  title="Delete Location"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-[var(--color-ink-dim)] italic">Read-only (Staff)</span>
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

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Warehouse className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">Register Location</span>
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

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Warehouse Alpha, Saigon Flagship"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Type *
                </label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  <option value="warehouse">warehouse (Storage & Fulfillment)</option>
                  <option value="store">store (Retail Location)</option>
                  <option value="fulfillment">fulfillment (Distribution Hub)</option>
                  <option value="transit">transit (In-Transit Hub)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 102 Industrial Zone 1, Tan Binh, Ho Chi Minh City"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)] resize-none"
                />
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
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Create Facility"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Edit3 className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">Edit Location</span>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Facility Type *
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                >
                  <option value="warehouse">warehouse (Storage & Fulfillment)</option>
                  <option value="store">store (Retail Location)</option>
                  <option value="fulfillment">fulfillment (Distribution Hub)</option>
                  <option value="transit">transit (In-Transit Hub)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Decommission Facility?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Irreversible action</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Are you certain you want to remove <strong className="text-[var(--color-ink)]">{deletingLocation.name}</strong>?
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded text-[11px] text-[var(--color-ink-dim)]">
              Note: The database protects facilities with active stock entries or movements. If this facility has historical inventory data, removal will be rejected.
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
                onClick={() => setDeletingLocation(null)}
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
                  "Confirm Removal"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
