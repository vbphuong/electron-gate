/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetMyAddresses,
  apiCreateAddress,
  apiUpdateAddress,
  apiDeleteAddress,
  apiGetCountries,
  apiGetCities,
  type AddressRead,
  type CountryRead,
  type CityRead,
} from "@/app/lib/api";
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Clock,
  LogOut,
  ShoppingCart,
  Check,
  X,
  RefreshCw,
  Globe,
  Building2,
  Navigation,
} from "lucide-react";

export default function AddressManagementPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // State
  const [addresses, setAddresses] = useState<AddressRead[]>([]);
  const [countries, setCountries] = useState<CountryRead[]>([]);
  const [cities, setCities] = useState<CityRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<AddressRead | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation modal
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load addresses
  const loadAddresses = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetMyAddresses(token);
      setAddresses(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load address nodes."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load countries on mount
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        loadAddresses();
        apiGetCountries(token || "")
          .then((data) => setCountries(data))
          .catch(() => setCountries([]));
      }
    }
  }, [authLoading, user, router, token, loadAddresses]);

  // Load cities when selectedCountryId changes
  useEffect(() => {
    if (selectedCountryId && token) {
      apiGetCities(selectedCountryId, token)
        .then((data) => {
          setCities(data);
          if (!editingAddress && data.length > 0) {
            setSelectedCityId(data[0].city_id);
          }
        })
        .catch(() => setCities([]));
    } else {
      setCities([]);
    }
  }, [selectedCountryId, token, editingAddress]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAddress(null);
    setAddressLine("");
    setIsDefault(addresses.length === 0); // default if first
    setFormError(null);
    if (countries.length > 0) {
      setSelectedCountryId(countries[0].country_id);
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (addr: AddressRead) => {
    setEditingAddress(addr);
    setAddressLine(addr.address_line);
    setIsDefault(addr.is_default);
    setFormError(null);

    // Find country for this city if available
    if (countries.length > 0 && token) {
      // Find matching city in preloaded lists or search across countries
      let matchedCountryId = "";
      for (const country of countries) {
        try {
          const cityList = await apiGetCities(country.country_id, token);
          const hasCity = cityList.some((c) => c.city_id === addr.city_id);
          if (hasCity) {
            matchedCountryId = country.country_id;
            setCities(cityList);
            break;
          }
        } catch {
          // continue
        }
      }
      if (matchedCountryId) {
        setSelectedCountryId(matchedCountryId);
      } else {
        setSelectedCountryId(countries[0].country_id);
      }
    }

    setSelectedCityId(addr.city_id);
    setIsModalOpen(true);
  };

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!addressLine.trim()) {
      setFormError("Address line is required.");
      return;
    }
    if (!selectedCityId) {
      setFormError("Please select a city destination.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingAddress) {
        // Update
        await apiUpdateAddress(
          editingAddress.address_id,
          {
            address_line: addressLine.trim(),
            city_id: selectedCityId,
            is_default: isDefault,
          },
          token
        );
        setActionSuccess("Address node updated successfully.");
      } else {
        // Create
        await apiCreateAddress(
          {
            address_line: addressLine.trim(),
            city_id: selectedCityId,
            is_default: isDefault,
          },
          token
        );
        setActionSuccess("New destination node registered to ledger.");
      }

      setIsModalOpen(false);
      await loadAddresses();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save address node."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addressId: string) => {
    if (!token) return;
    try {
      await apiUpdateAddress(addressId, { is_default: true }, token);
      setActionSuccess("Default destination node updated.");
      await loadAddresses();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set default address."
      );
    }
  };

  // Delete Address
  const handleDeleteAddress = async () => {
    if (!token || !deletingAddressId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiDeleteAddress(deletingAddressId, token);
      setDeletingAddressId(null);
      setActionSuccess("Destination node removed from registry.");
      await loadAddresses();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete address. It may be linked to an existing order."
      );
      setDeletingAddressId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background drafting grid & ambient glow */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Bar */}
      

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 hover:text-[var(--color-atelier-brass)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-ink)] font-semibold">
              Delivery Nodes
            </span>
          </div>

          <button
            onClick={loadAddresses}
            className="p-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
            title="Refresh address nodes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Hero Plate */}
        <section className="atelier-plate p-6 sm:p-8 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--color-terminal-green)] uppercase tracking-wider font-semibold">
                  SECTION 6.1 · ADDRESS DISPATCH REGISTRY
                </span>
                <span className="text-[var(--color-rule)]">/</span>
                <span className="font-mono text-xs text-[var(--color-ink-dim)]">
                  {addresses.length} ACTIVE NODES
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight">
                Delivery Destination Nodes
              </h1>

              <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] font-sans max-w-xl leading-relaxed">
                Configure physical shipping destinations for encrypted carrier dispatch. Default nodes are automatically applied during checkout.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="atelier-btn atelier-btn-primary !py-2.5 !px-5 text-xs font-mono flex items-center justify-center gap-2 shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Node</span>
            </button>
          </div>
        </section>

        {/* Notification Toasts */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] font-mono text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] font-mono text-xs flex items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Address Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-48 bg-[var(--color-paper-sub)] rounded-lg" />
            <div className="h-48 bg-[var(--color-paper-sub)] rounded-lg" />
          </div>
        ) : addresses.length === 0 ? (
          /* Empty State */
          <div className="atelier-plate p-12 rounded-lg border border-dashed border-[var(--color-rule-active)] bg-[var(--color-paper-card)] text-center space-y-4 my-6">
            <div className="w-14 h-14 rounded-full bg-[var(--color-paper-sub)] border border-[var(--color-rule)] flex items-center justify-center mx-auto text-[var(--color-ink-dim)]">
              <MapPin className="w-7 h-7" />
            </div>
            <h2 className="font-fraunces font-bold text-xl text-[var(--color-ink)]">
              No Delivery Nodes Registered
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mx-auto leading-relaxed">
              You have not registered any shipping destinations yet. Add a destination node to expedite hardware dispatch.
            </p>
            <div className="pt-2">
              <button
                onClick={handleOpenCreateModal}
                className="atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Primary Destination</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {addresses.map((addr, idx) => (
              <div
                key={addr.address_id}
                className={`atelier-plate p-6 rounded-lg border transition-all flex flex-col justify-between ${
                  addr.is_default
                    ? "border-[var(--color-atelier-brass)] bg-[var(--color-paper-card)] shadow-md"
                    : "border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-rule-active)]"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Node Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={`w-4 h-4 ${
                          addr.is_default
                            ? "text-[var(--color-atelier-brass)]"
                            : "text-[var(--color-ink-dim)]"
                        }`}
                      />
                      <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                        NODE [ 0{idx + 1} ]
                      </span>
                    </div>

                    {addr.is_default ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>DEFAULT DESTINATION</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(addr.address_id)}
                        className="font-mono text-[11px] text-[var(--color-ink-dim)] hover:text-[var(--color-atelier-brass)] transition-colors underline"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  {/* Address Content */}
                  <div className="font-mono text-xs space-y-1.5">
                    <div className="font-bold text-[var(--color-ink)] text-sm leading-snug">
                      {addr.address_line}
                    </div>
                    <div className="text-[var(--color-ink-muted)] text-[11px]">
                      {addr.city_name || "City Region"}
                      {addr.postal_code ? ` · ${addr.postal_code}` : ""}
                    </div>
                    <div className="text-[var(--color-terminal-cyan)] text-[11px]">
                      {addr.country_name || "Global Destination"}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-5 mt-4 border-t border-[var(--color-rule-subtle)] flex items-center justify-between">
                  <span className="font-mono text-[9px] text-[var(--color-ink-dim)] uppercase">
                    ID: {addr.address_id.slice(0, 8)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="atelier-btn atelier-btn-ghost !py-1 !px-2.5 text-xs font-mono flex items-center gap-1.5 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)]"
                      title="Edit address"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingAddressId(addr.address_id)}
                      className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-restricted-red)]/10 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-lg p-6 sm:p-8 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                <h2 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                  {editingAddress ? "Modify Destination Node" : "Register Destination Node"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 font-mono text-xs">
              {/* Country Selection */}
              <div className="space-y-1.5">
                <label className="block text-[var(--color-ink-muted)] font-semibold">
                  Country Destination
                </label>
                <select
                  value={selectedCountryId}
                  onChange={(e) => setSelectedCountryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  disabled={countries.length === 0}
                >
                  {countries.map((c) => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Selection */}
              <div className="space-y-1.5">
                <label className="block text-[var(--color-ink-muted)] font-semibold">
                  City Region
                </label>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  disabled={cities.length === 0}
                >
                  {cities.map((ct) => (
                    <option key={ct.city_id} value={ct.city_id}>
                      {ct.city_name} {ct.postal_code ? `· Postal: ${ct.postal_code}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address Line */}
              <div className="space-y-1.5">
                <label className="block text-[var(--color-ink-muted)] font-semibold">
                  Street Address &amp; Suite / Unit
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Enclave Tower #402"
                  className="w-full px-3 py-2.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              {/* Default Toggle */}
              <div className="pt-2 flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="is_default_checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-atelier-brass)] rounded cursor-pointer"
                />
                <label
                  htmlFor="is_default_checkbox"
                  className="text-[var(--color-ink)] text-xs cursor-pointer select-none"
                >
                  Set as primary default destination for instant checkout
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="atelier-btn atelier-btn-ghost !py-2 !px-4 text-xs font-mono"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingAddress ? "Update Node" : "Save Node"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAddressId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-md p-6 rounded-lg border border-[var(--color-restricted-red)]/50 bg-[var(--color-paper-card)] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                Decommission Delivery Node?
              </h3>
            </div>

            <p className="text-xs text-[var(--color-ink-muted)] font-mono leading-relaxed">
              Are you sure you want to remove this delivery node from your registry? If this node is referenced in past immutable orders, deletion will be blocked by system integrity rules.
            </p>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--color-rule)]">
              <button
                onClick={() => setDeletingAddressId(null)}
                className="atelier-btn atelier-btn-ghost !py-1.5 !px-4 text-xs font-mono"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAddress}
                className="atelier-btn !bg-[var(--color-restricted-red)] hover:!bg-[var(--color-restricted-red)]/80 text-white !py-1.5 !px-4 text-xs font-mono flex items-center gap-1.5"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE IMMUTABLE DELIVERY REGISTRY · FLOW 6.1</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
