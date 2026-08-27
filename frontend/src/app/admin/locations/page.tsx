/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetCountries,
  apiCreateCountry,
  apiUpdateCountry,
  apiDeleteCountry,
  apiListCities,
  apiCreateCity,
  apiUpdateCity,
  apiDeleteCity,
  type CountryRead,
  type CityRead,
} from "@/app/lib/api";
import {
  Globe,
  MapPin,
  Building,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Check,
  ChevronRight,
  Shield,
  Layers,
  Compass,
} from "lucide-react";

export default function AdminLocationsPage() {
  const router = useRouter();
  const { user: currentUser, token, isLoading: authLoading } = useAuth();

  // Data states
  const [countries, setCountries] = useState<CountryRead[]>([]);
  const [cities, setCities] = useState<CityRead[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  // Search queries
  const [countrySearch, setCountrySearch] = useState<string>("");
  const [citySearch, setCitySearch] = useState<string>("");

  // Loading & feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Country Modals
  const [isCreateCountryOpen, setIsCreateCountryOpen] = useState<boolean>(false);
  const [countryNameInput, setCountryNameInput] = useState<string>("");
  const [editingCountry, setEditingCountry] = useState<CountryRead | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<CountryRead | null>(null);
  const [isSubmittingCountry, setIsSubmittingCountry] = useState<boolean>(false);
  const [countryModalError, setCountryModalError] = useState<string | null>(null);

  // City Modals
  const [isCreateCityOpen, setIsCreateCityOpen] = useState<boolean>(false);
  const [cityNameInput, setCityNameInput] = useState<string>("");
  const [cityPostalCodeInput, setCityPostalCodeInput] = useState<string>("");
  const [cityCountryIdInput, setCityCountryIdInput] = useState<string>("");
  const [editingCity, setEditingCity] = useState<CityRead | null>(null);
  const [deletingCity, setDeletingCity] = useState<CityRead | null>(null);
  const [isSubmittingCity, setIsSubmittingCity] = useState<boolean>(false);
  const [cityModalError, setCityModalError] = useState<string | null>(null);

  // Role permissions
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAuthorized = isAdmin || role === "staff";

  // Load all countries and cities
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [countriesData, citiesData] = await Promise.all([
        apiGetCountries(token),
        apiListCities(token),
      ]);
      setCountries(countriesData);
      setCities(citiesData);
    } catch (err: any) {
      setError(err?.message || "Failed to load geographic locations.");
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
        loadData();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadData]);

  // Compute city count per country
  const cityCountMap = useMemo(() => {
    const map = new Map<string, number>();
    cities.forEach((c) => {
      map.set(c.country_id, (map.get(c.country_id) || 0) + 1);
    });
    return map;
  }, [cities]);

  // Filtered countries
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.country_name.toLowerCase().includes(q));
  }, [countries, countrySearch]);

  // Filtered cities
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return cities.filter((c) => {
      const matchesCountry = selectedCountryId ? c.country_id === selectedCountryId : true;
      const matchesSearch =
        !q ||
        c.city_name.toLowerCase().includes(q) ||
        (c.postal_code && c.postal_code.toLowerCase().includes(q)) ||
        (c.country_name && c.country_name.toLowerCase().includes(q));
      return matchesCountry && matchesSearch;
    });
  }, [cities, selectedCountryId, citySearch]);

  // Selected country object
  const activeCountry = useMemo(() => {
    if (!selectedCountryId) return null;
    return countries.find((c) => c.country_id === selectedCountryId) || null;
  }, [countries, selectedCountryId]);

  // ── COUNTRY CRUD HANDLERS ──────────────────────────────────────────────────
  const handleOpenCreateCountry = () => {
    setCountryNameInput("");
    setCountryModalError(null);
    setIsCreateCountryOpen(true);
  };

  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    if (!countryNameInput.trim()) {
      setCountryModalError("Country name is required.");
      return;
    }

    setIsSubmittingCountry(true);
    setCountryModalError(null);
    try {
      await apiCreateCountry({ country_name: countryNameInput.trim() }, token);
      setActionSuccess(`Country "${countryNameInput.trim()}" registered successfully.`);
      setIsCreateCountryOpen(false);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCountryModalError(err?.message || "Failed to create country.");
    } finally {
      setIsSubmittingCountry(false);
    }
  };

  const handleOpenEditCountry = (c: CountryRead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCountry(c);
    setCountryNameInput(c.country_name);
    setCountryModalError(null);
  };

  const handleUpdateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingCountry || !isAdmin) return;
    if (!countryNameInput.trim()) {
      setCountryModalError("Country name cannot be blank.");
      return;
    }

    setIsSubmittingCountry(true);
    setCountryModalError(null);
    try {
      await apiUpdateCountry(
        editingCountry.country_id,
        { country_name: countryNameInput.trim() },
        token
      );
      setActionSuccess(`Country updated to "${countryNameInput.trim()}".`);
      setEditingCountry(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCountryModalError(err?.message || "Failed to update country.");
    } finally {
      setIsSubmittingCountry(false);
    }
  };

  const handleOpenDeleteCountry = (c: CountryRead, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCountry(c);
    setCountryModalError(null);
  };

  const handleDeleteCountry = async () => {
    if (!token || !deletingCountry || !isAdmin) return;
    setIsSubmittingCountry(true);
    setCountryModalError(null);
    try {
      await apiDeleteCountry(deletingCountry.country_id, token);
      setActionSuccess(`Country "${deletingCountry.country_name}" deleted.`);
      if (selectedCountryId === deletingCountry.country_id) {
        setSelectedCountryId(null);
      }
      setDeletingCountry(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCountryModalError(err?.message || "Failed to delete country.");
    } finally {
      setIsSubmittingCountry(false);
    }
  };

  // ── CITY CRUD HANDLERS ─────────────────────────────────────────────────────
  const handleOpenCreateCity = () => {
    setCityNameInput("");
    setCityPostalCodeInput("");
    setCityCountryIdInput(selectedCountryId || (countries[0]?.country_id ?? ""));
    setCityModalError(null);
    setIsCreateCityOpen(true);
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    if (!cityNameInput.trim() || !cityCountryIdInput) {
      setCityModalError("City name and country selection are required.");
      return;
    }

    setIsSubmittingCity(true);
    setCityModalError(null);
    try {
      await apiCreateCity(
        {
          city_name: cityNameInput.trim(),
          postal_code: cityPostalCodeInput.trim() || null,
          country_id: cityCountryIdInput,
        },
        token
      );
      setActionSuccess(`City "${cityNameInput.trim()}" created successfully.`);
      setIsCreateCityOpen(false);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCityModalError(err?.message || "Failed to create city.");
    } finally {
      setIsSubmittingCity(false);
    }
  };

  const handleOpenEditCity = (c: CityRead) => {
    setEditingCity(c);
    setCityNameInput(c.city_name);
    setCityPostalCodeInput(c.postal_code || "");
    setCityCountryIdInput(c.country_id);
    setCityModalError(null);
  };

  const handleUpdateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingCity || !isAdmin) return;
    if (!cityNameInput.trim() || !cityCountryIdInput) {
      setCityModalError("City name and country are required.");
      return;
    }

    setIsSubmittingCity(true);
    setCityModalError(null);
    try {
      await apiUpdateCity(
        editingCity.city_id,
        {
          city_name: cityNameInput.trim(),
          postal_code: cityPostalCodeInput.trim() || null,
          country_id: cityCountryIdInput,
        },
        token
      );
      setActionSuccess(`City "${cityNameInput.trim()}" updated.`);
      setEditingCity(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCityModalError(err?.message || "Failed to update city.");
    } finally {
      setIsSubmittingCity(false);
    }
  };

  const handleOpenDeleteCity = (c: CityRead) => {
    setDeletingCity(c);
    setCityModalError(null);
  };

  const handleDeleteCity = async () => {
    if (!token || !deletingCity || !isAdmin) return;
    setIsSubmittingCity(true);
    setCityModalError(null);
    try {
      await apiDeleteCity(deletingCity.city_id, token);
      setActionSuccess(`City "${deletingCity.city_name}" deleted.`);
      setDeletingCity(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCityModalError(err?.message || "Failed to delete city.");
    } finally {
      setIsSubmittingCity(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper-terminal)] text-[var(--color-ink)] min-h-screen">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-widest mb-1">
              <Globe className="w-3.5 h-3.5" />
              Territory & Address Architecture
            </div>
            <h1 className="font-fraunces text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Geographic Locations
            </h1>
            <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-1">
              Manage supported sovereign nations, delivery cities, and postal codes for customer shipping destinations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper-sub)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              title="Refresh Locations"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handleOpenCreateCountry}
                  className="px-3 py-2 border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-[var(--color-ink)] font-mono text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
                  Add Country
                </button>

                <button
                  onClick={handleOpenCreateCity}
                  disabled={countries.length === 0}
                  className="px-3.5 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold rounded flex items-center gap-1.5 hover:bg-[var(--color-atelier-amber)] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add City
                </button>
              </>
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
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-atelier-brass)]">Countries</span>
            <span className="text-xl font-bold text-[var(--color-ink)] mt-1">{countries.length}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-cyan)]">Cities & Municipalities</span>
            <span className="text-xl font-bold text-[var(--color-terminal-cyan)] mt-1">{cities.length}</span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">Selected Focus</span>
            <span className="text-sm font-bold text-[var(--color-atelier-brass)] mt-1 truncate">
              {activeCountry ? activeCountry.country_name : "All Territories"}
            </span>
          </div>
          <div className="p-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-terminal-green)]">Cities in Focus</span>
            <span className="text-xl font-bold text-[var(--color-terminal-green)] mt-1">{filteredCities.length}</span>
          </div>
        </div>

        {/* Master-Detail Dual Pane Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANE: Countries Registry (5 cols) */}
          <div className="lg:col-span-4 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg p-4 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                <span className="font-fraunces text-sm font-bold text-[var(--color-ink)]">
                  Countries ({filteredCountries.length})
                </span>
              </div>
              {isAdmin && (
                <button
                  onClick={handleOpenCreateCountry}
                  className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] transition-colors"
                  title="Add Country"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Country search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
              <input
                type="text"
                placeholder="Filter countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
              />
              {countrySearch && (
                <button
                  onClick={() => setCountrySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* "All Countries" selector */}
            <button
              onClick={() => setSelectedCountryId(null)}
              className={`w-full p-2.5 rounded text-left flex items-center justify-between transition-all ${
                selectedCountryId === null
                  ? "bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)]"
                  : "hover:bg-[var(--color-paper-sub)] text-[var(--color-ink)] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[var(--color-atelier-brass)]" />
                <span className="font-semibold">All Territories</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-paper-sub)] text-[var(--color-ink-dim)]">
                {cities.length} cities
              </span>
            </button>

            {/* Countries List */}
            {isLoading && countries.length === 0 ? (
              <div className="py-8 text-center text-[var(--color-ink-dim)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-atelier-brass)]" />
                <span>Loading countries...</span>
              </div>
            ) : filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-[var(--color-ink-dim)]">
                No countries found.
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-1">
                {filteredCountries.map((c) => {
                  const isSelected = selectedCountryId === c.country_id;
                  const count = cityCountMap.get(c.country_id) || 0;

                  return (
                    <div
                      key={c.country_id}
                      onClick={() => setSelectedCountryId(c.country_id)}
                      className={`group p-2.5 rounded flex items-center justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-[var(--color-atelier-brass)]/15 border-[var(--color-atelier-brass)]/50 text-[var(--color-atelier-brass)]"
                          : "border-transparent hover:bg-[var(--color-paper-sub)] text-[var(--color-ink)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[var(--color-atelier-brass)]" : "text-[var(--color-ink-dim)]"}`} />
                        <span className="font-medium truncate">{c.country_name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-paper-terminal)] text-[var(--color-ink-dim)] border border-[var(--color-rule)]">
                          {count}
                        </span>

                        {isAdmin && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => handleOpenEditCountry(c, e)}
                              className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-terminal)]"
                              title="Edit Country"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleOpenDeleteCountry(c, e)}
                              className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-terminal)]"
                              title="Delete Country"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? "translate-x-0.5 text-[var(--color-atelier-brass)]" : "text-[var(--color-ink-dim)] opacity-40"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANE: Cities Registry (7 cols) */}
          <div className="lg:col-span-8 bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg p-4 flex flex-col gap-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-rule)]">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[var(--color-terminal-cyan)]" />
                  <h2 className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                    {activeCountry ? `Cities in ${activeCountry.country_name}` : "All Municipalities"}
                  </h2>
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                  {selectedCountryId
                    ? `Showing ${filteredCities.length} registered cities for this sovereign territory.`
                    : `Showing all ${filteredCities.length} cities across all nations.`}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={handleOpenCreateCity}
                  disabled={countries.length === 0}
                  className="px-3 py-1.5 bg-[var(--color-terminal-cyan)]/15 border border-[var(--color-terminal-cyan)]/40 text-[var(--color-terminal-cyan)] hover:bg-[var(--color-terminal-cyan)] hover:text-[var(--color-paper-terminal)] font-bold rounded flex items-center gap-1.5 transition-all text-xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add City
                </button>
              )}
            </div>

            {/* City search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
              <input
                type="text"
                placeholder="Search city by name, postal code, or country..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded pl-8 pr-3 py-2 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
              />
              {citySearch && (
                <button
                  onClick={() => setCitySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Cities Table */}
            {isLoading && cities.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-ink-dim)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-terminal-cyan)]" />
                <span>Loading city records...</span>
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="py-12 border border-dashed border-[var(--color-rule)] rounded-lg text-center flex flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]">
                <Building className="w-6 h-6 text-[var(--color-ink-dim)] mb-1" />
                <span className="font-semibold text-sm text-[var(--color-ink)]">No cities found</span>
                <p className="text-[11px] text-[var(--color-ink-dim)] max-w-xs">
                  {citySearch
                    ? "No cities match your current search query."
                    : selectedCountryId
                    ? "No cities have been assigned to this country yet."
                    : "No cities have been created yet."}
                </p>
                {isAdmin && countries.length > 0 && (
                  <button
                    onClick={handleOpenCreateCity}
                    className="mt-2 px-3 py-1.5 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded text-xs hover:bg-[var(--color-atelier-amber)] transition-colors"
                  >
                    + Add First City
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-[var(--color-rule)] rounded overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3.5">City Name</th>
                      <th className="py-2.5 px-3.5">Postal Code</th>
                      <th className="py-2.5 px-3.5">Territory</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-rule)]">
                    {filteredCities.map((c) => (
                      <tr key={c.city_id} className="hover:bg-[var(--color-paper-hover)]/30 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-[var(--color-terminal-cyan)] shrink-0" />
                            <span className="font-semibold text-[var(--color-ink)]">{c.city_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-[var(--color-ink-muted)]">
                          {c.postal_code ? (
                            <span className="font-mono bg-[var(--color-paper-terminal)] px-2 py-0.5 rounded border border-[var(--color-rule)] text-[11px]">
                              {c.postal_code}
                            </span>
                          ) : (
                            <span className="text-[var(--color-ink-dim)]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)]">
                            {c.country_name || "Country"}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditCity(c)}
                                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-terminal-cyan)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                title="Edit City"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteCity(c)}
                                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                                title="Delete City"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--color-ink-dim)]">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CREATE COUNTRY MODAL */}
      {isCreateCountryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Globe className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Register Country
                </span>
              </div>
              <button
                onClick={() => setIsCreateCountryOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {countryModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{countryModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCountry} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Country Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vietnam, United States, Japan"
                  value={countryNameInput}
                  onChange={(e) => setCountryNameInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateCountryOpen(false)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCountry || !countryNameInput.trim()}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCountry ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Country"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COUNTRY MODAL */}
      {editingCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-atelier-brass)]">
                <Edit2 className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Edit Country
                </span>
              </div>
              <button
                onClick={() => setEditingCountry(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {countryModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{countryModalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCountry} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Country Name *
                </label>
                <input
                  type="text"
                  required
                  value={countryNameInput}
                  onChange={(e) => setCountryNameInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-atelier-brass)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingCountry(null)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCountry || !countryNameInput.trim()}
                  className="px-4 py-2 bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold rounded hover:bg-[var(--color-atelier-amber)] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCountry ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Country"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE COUNTRY MODAL */}
      {deletingCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Delete Country?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Permanent territory removal</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Delete country <strong className="text-[var(--color-ink)]">"{deletingCountry.country_name}"</strong>?
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded text-[11px] text-[var(--color-ink-dim)]">
              ⚠️ Note: The backend will reject deletion if this country has registered cities. You must delete or reassign its cities first.
            </div>

            {countryModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{countryModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setDeletingCountry(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCountry}
                disabled={isSubmittingCountry}
                className="px-4 py-2 bg-[var(--color-restricted-red)] text-white font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingCountry ? (
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

      {/* CREATE CITY MODAL */}
      {isCreateCityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-terminal-cyan)]">
                <Building className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Register City / Municipality
                </span>
              </div>
              <button
                onClick={() => setIsCreateCityOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cityModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cityModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCity} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Country *
                </label>
                <select
                  required
                  value={cityCountryIdInput}
                  onChange={(e) => setCityCountryIdInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                >
                  {countries.map((c) => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  City Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hanoi, Ho Chi Minh City, Tokyo"
                  value={cityNameInput}
                  onChange={(e) => setCityNameInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100000, 700000"
                  value={cityPostalCodeInput}
                  onChange={(e) => setCityPostalCodeInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateCityOpen(false)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCity || !cityNameInput.trim() || !cityCountryIdInput}
                  className="px-4 py-2 bg-[var(--color-terminal-cyan)] text-[var(--color-paper-terminal)] font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCity ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save City"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CITY MODAL */}
      {editingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-rule)] rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-terminal-cyan)]">
                <Edit2 className="w-4 h-4" />
                <span className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                  Edit City
                </span>
              </div>
              <button
                onClick={() => setEditingCity(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cityModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cityModalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCity} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Country *
                </label>
                <select
                  required
                  value={cityCountryIdInput}
                  onChange={(e) => setCityCountryIdInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                >
                  {countries.map((c) => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  City Name *
                </label>
                <input
                  type="text"
                  required
                  value={cityNameInput}
                  onChange={(e) => setCityNameInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--color-ink-muted)] uppercase mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={cityPostalCodeInput}
                  onChange={(e) => setCityPostalCodeInput(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-[var(--color-ink)] focus:outline-hidden focus:border-[var(--color-terminal-cyan)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
                  className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCity || !cityNameInput.trim()}
                  className="px-4 py-2 bg-[var(--color-terminal-cyan)] text-[var(--color-paper-terminal)] font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCity ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update City"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CITY MODAL */}
      {deletingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-restricted-red)]/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-fraunces text-base font-bold text-[var(--color-ink)]">Delete City?</h3>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Permanent municipality removal</span>
              </div>
            </div>

            <p className="text-[var(--color-ink-muted)] leading-relaxed">
              Delete city <strong className="text-[var(--color-ink)]">"{deletingCity.city_name}"</strong>?
            </p>

            <div className="p-3 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded text-[11px] text-[var(--color-ink-dim)]">
              ⚠️ Note: The backend will reject deletion if this city has existing customer addresses.
            </div>

            {cityModalError && (
              <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30 rounded text-[var(--color-restricted-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cityModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => setDeletingCity(null)}
                className="px-3.5 py-2 border border-[var(--color-rule)] rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCity}
                disabled={isSubmittingCity}
                className="px-4 py-2 bg-[var(--color-restricted-red)] text-white font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingCity ? (
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
