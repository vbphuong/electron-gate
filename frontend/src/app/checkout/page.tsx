"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetMyCart,
  apiGetMyAddresses,
  apiCreateAddress,
  apiGetCountries,
  apiGetCities,
  apiCheckout,
  type CartRead,
  type AddressRead,
  type CountryRead,
  type CityRead,
} from "@/app/lib/api";
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  Cpu,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Plus,
  ArrowRight,
  Boxes,
  Lock,
  LogOut,
  X,
  CreditCard,
  Building,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [cart, setCart] = useState<CartRead | null>(null);
  const [addresses, setAddresses] = useState<AddressRead[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // New Address Modal states
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState<boolean>(false);
  const [countries, setCountries] = useState<CountryRead[]>([]);
  const [cities, setCities] = useState<CityRead[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [isDefaultAddress, setIsDefaultAddress] = useState<boolean>(false);
  const [isCreatingAddress, setIsCreatingAddress] = useState<boolean>(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);

  // Load Cart & Addresses
  const loadCheckoutData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCheckoutError(null);

    try {
      const [cartData, addressList] = await Promise.all([
        apiGetMyCart(token),
        apiGetMyAddresses(token),
      ]);

      setCart(cartData);
      setAddresses(addressList);

      // Auto-select default address or first available
      const defaultAddr = addressList.find((a) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.address_id);
      } else if (addressList.length > 0) {
        setSelectedAddressId(addressList[0].address_id);
      }
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Failed to load checkout parameters."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        loadCheckoutData();
      }
    }
  }, [authLoading, user, router, loadCheckoutData]);

  // Load Countries & Cities when opening new address modal
  const openNewAddressModal = async () => {
    setIsNewAddressModalOpen(true);
    setAddressFormError(null);
    if (!token) return;

    setIsLoadingLocations(true);
    try {
      const countryList = await apiGetCountries(token);
      setCountries(countryList);
      if (countryList.length > 0) {
        const initialCountryId = selectedCountryId || countryList[0].country_id;
        setSelectedCountryId(initialCountryId);
        // Load cities for country
        const cityList = await apiGetCities(initialCountryId, token);
        setCities(cityList);
        if (cityList.length > 0) {
          setSelectedCityId(cityList[0].city_id);
        }
      }
    } catch (err) {
      setAddressFormError("Failed to load country and city registry.");
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // When selected country changes, reload cities
  const handleCountryChange = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedCityId("");
    if (!token) return;

    setIsLoadingLocations(true);
    try {
      const cityList = await apiGetCities(countryId, token);
      setCities(cityList);
      if (cityList.length > 0) {
        setSelectedCityId(cityList[0].city_id);
      }
    } catch {
      setAddressFormError("Failed to load cities for selected country.");
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Submit New Address
  const handleCreateAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!addressLine.trim()) {
      setAddressFormError("Please enter your street address line.");
      return;
    }
    if (!selectedCityId) {
      setAddressFormError("Please select a city location.");
      return;
    }

    setIsCreatingAddress(true);
    setAddressFormError(null);

    try {
      const newAddr = await apiCreateAddress(
        {
          address_line: addressLine.trim(),
          city_id: selectedCityId,
          is_default: isDefaultAddress,
        },
        token
      );

      // Refresh address list and auto-select new address
      const updatedList = await apiGetMyAddresses(token);
      setAddresses(updatedList);
      setSelectedAddressId(newAddr.address_id);

      // Close modal
      setAddressLine("");
      setIsDefaultAddress(false);
      setIsNewAddressModalOpen(false);
    } catch (err) {
      setAddressFormError(
        err instanceof Error ? err.message : "Failed to create address."
      );
    } finally {
      setIsCreatingAddress(false);
    }
  };

  // Filter selected items from cart
  const selectedCartItems = useMemo(() => {
    return cart?.items?.filter((i) => i.is_selected) || [];
  }, [cart]);

  const subtotal = useMemo(() => {
    return selectedCartItems.reduce(
      (acc, item) => acc + Number(item.unit_price) * item.quantity,
      0
    );
  }, [selectedCartItems]);

  const totalItemsCount = selectedCartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Handle Checkout Execution
  const handlePlaceOrder = async () => {
    if (!token) {
      router.push("/login");
      return;
    }

    if (selectedCartItems.length === 0) {
      setCheckoutError("No items selected in cart for checkout.");
      return;
    }

    if (!selectedAddressId) {
      setCheckoutError("Please select or add a shipping destination address.");
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutError(null);

    try {
      const order = await apiCheckout(selectedAddressId, token);
      // Redirect to Order Confirmation screen (Section 4.2)
      router.push(`/orders/${order.order_id}/confirm`);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Order placement failed. Please retry."
      );
      setIsSubmittingOrder(false);
    }
  };

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
                  SECURE CHECKOUT · SECTION 4.1
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
                href="/cart"
                className="px-3 py-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                CART
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[var(--color-ink-dim)]">
            <div className="flex items-center gap-1.5 text-[var(--color-terminal-green)] px-2.5 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)]">
              <Lock className="w-3.5 h-3.5" />
              <span>TLS 1.3 256-BIT ENCRYPTED</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 hover:text-[var(--color-atelier-brass)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Cart</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-ink)] font-semibold">Secure Checkout</span>
          </div>

          <span className="font-mono text-xs text-[var(--color-atelier-brass)] uppercase font-semibold">
            Order Provisioning
          </span>
        </div>

        {/* Global Checkout Error */}
        {checkoutError && (
          <div className="mb-6 p-4 rounded border border-[var(--color-restricted-red)]/40 bg-[var(--color-restricted-red)]/10 text-xs font-mono text-[var(--color-restricted-red)] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{checkoutError}</span>
            </div>
            <button
              onClick={() => setCheckoutError(null)}
              className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
            >
              ✕
            </button>
          </div>
        )}

        {isLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 animate-pulse">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-40 bg-[var(--color-paper-sub)] rounded-lg" />
              <div className="h-40 bg-[var(--color-paper-sub)] rounded-lg" />
            </div>
            <div className="lg:col-span-4 h-72 bg-[var(--color-paper-sub)] rounded-lg" />
          </div>
        ) : selectedCartItems.length === 0 ? (
          /* No Selected Items Warning */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-card)] my-8">
            <ShoppingCart className="w-14 h-14 text-[var(--color-ink-dim)] mb-4 opacity-40" />
            <h2 className="font-fraunces font-bold text-2xl text-[var(--color-ink)] mb-2">
              No Items Selected for Checkout
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6 leading-relaxed">
              Your cart has no active items marked for purchase. Please select the items you wish to order.
            </p>
            <Link
              href="/cart"
              className="atelier-btn atelier-btn-primary !py-2.5 !px-6 text-xs font-mono inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Cart</span>
            </Link>
          </div>
        ) : (
          /* Main Checkout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Column: Shipping Address & Hardware Verification */}
            <div className="lg:col-span-8 space-y-8">
              {/* STEP 1: Shipping Address Selection */}
              <section className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                        1. Shipping &amp; Destination Address
                      </h2>
                      <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                        Select hardware delivery node or enter a new address
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openNewAddressModal}
                    className="atelier-btn atelier-btn-ghost !py-1 !px-2.5 text-xs font-mono flex items-center gap-1 border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Address</span>
                  </button>
                </div>

                {/* Address Cards Grid */}
                {addresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.address_id;

                      return (
                        <div
                          key={addr.address_id}
                          onClick={() => setSelectedAddressId(addr.address_id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all font-mono text-xs flex flex-col justify-between relative ${
                            isSelected
                              ? "border-[var(--color-atelier-brass)] bg-[var(--color-paper-terminal)] ring-1 ring-[var(--color-atelier-brass)] shadow-sm"
                              : "border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-rule-active)] opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                                {addr.city_name || "Location Node"}
                              </span>
                              {addr.is_default && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[var(--color-atelier-brass)]/15 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                                  Default
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                              {addr.address_line}
                            </p>
                            <p className="text-[10px] text-[var(--color-ink-dim)] mt-1">
                              {addr.city_name} {addr.postal_code ? `· ${addr.postal_code}` : ""}{" "}
                              {addr.country_name ? `· ${addr.country_name}` : ""}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[var(--color-rule-subtle)] flex items-center justify-between text-[10px]">
                            <span className="text-[var(--color-ink-dim)]">
                              {isSelected ? "Selected Destination" : "Click to select"}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[var(--color-atelier-brass)] text-[var(--color-paper)] flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center font-mono text-xs text-[var(--color-ink-dim)] border border-dashed border-[var(--color-rule)] rounded-lg space-y-2">
                    <MapPin className="w-8 h-8 opacity-30 mx-auto" />
                    <p>No shipping addresses registered to your account yet.</p>
                    <button
                      type="button"
                      onClick={openNewAddressModal}
                      className="atelier-btn atelier-btn-primary !py-1.5 !px-4 text-xs font-mono inline-flex items-center gap-1 mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Destination Address</span>
                    </button>
                  </div>
                )}
              </section>

              {/* STEP 2: Selected Hardware Items Review */}
              <section className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)]">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                        2. Hardware Verification ({totalItemsCount} units)
                      </h2>
                      <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                        Verify configurations and serial models prior to snapshotting
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/cart"
                    className="text-xs font-mono text-[var(--color-atelier-brass)] hover:underline"
                  >
                    Edit Cart
                  </Link>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[var(--color-rule-subtle)]">
                  {selectedCartItems.map((item) => (
                    <div
                      key={item.variant_id}
                      className="py-3.5 flex items-center justify-between gap-4 font-mono text-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {item.variant_image_url ? (
                            <img
                              src={item.variant_image_url}
                              alt={item.product_name || "Hardware"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Cpu className="w-6 h-6 text-[var(--color-ink-dim)] opacity-40" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-[var(--color-ink)] truncate max-w-xs sm:max-w-md">
                            {item.product_name}
                          </div>
                          <div className="text-[10px] text-[var(--color-ink-muted)] space-x-1.5 mt-0.5">
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
                          Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary & Place Order */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-lg space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
                    <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                      Order Summary
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--color-terminal-cyan)] uppercase tracking-wider">
                      FLOW 4.1 CHECKOUT
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Total Hardware Units</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        {totalItemsCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Subtotal</span>
                      <span className="font-bold text-[var(--color-ink)]">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Secure Dispatch Delivery</span>
                      <span className="text-[var(--color-terminal-green)] font-semibold">
                        Free Standard
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--color-ink-muted)]">
                      <span>Estimated VAT / Tax</span>
                      <span>$0.00</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t border-[var(--color-rule)] flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-xs text-[var(--color-ink-dim)] uppercase block">
                        Final Total Amount
                      </span>
                      <span className="text-2xl font-bold text-[var(--color-atelier-brass)]">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">
                      USD
                    </span>
                  </div>

                  {/* Submit Order Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={isSubmittingOrder || !selectedAddressId || selectedCartItems.length === 0}
                      className="w-full h-12 atelier-btn atelier-btn-primary font-mono text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Immutable Order...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm &amp; Place Order</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {!selectedAddressId && (
                      <p className="mt-2 text-[10px] text-center font-mono text-[var(--color-restricted-red)]">
                        * Please select a destination address to place order.
                      </p>
                    )}
                  </div>
                </div>

                {/* Assurance Plate */}
                <div className="p-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] space-y-2 font-mono text-[11px] text-[var(--color-ink-dim)]">
                  <div className="flex items-center gap-2 text-[var(--color-ink)] font-semibold">
                    <Shield className="w-4 h-4 text-[var(--color-terminal-green)] shrink-0" />
                    <span>Immutable Order Ledger</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-muted)] leading-relaxed">
                    Upon confirmation, shipping addresses and prices are permanently locked into the PostgreSQL audit history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add New Address Modal */}
      {isNewAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate relative w-full max-w-lg bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] rounded-lg shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                    Register Delivery Destination
                  </h3>
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                    POST /addresses · Shipping Address Configuration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewAddressModalOpen(false)}
                className="p-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addressFormError && (
              <div className="mb-4 p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addressFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAddressSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Country Picker */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                  Country / Sovereign Territory <span className="text-[var(--color-atelier-brass)]">*</span>
                </label>
                <select
                  value={selectedCountryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={isLoadingLocations || countries.length === 0}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                >
                  {countries.map((c) => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Picker */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                  City / Region Node <span className="text-[var(--color-atelier-brass)]">*</span>
                </label>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  disabled={isLoadingLocations || cities.length === 0}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                >
                  {cities.map((city) => (
                    <option key={city.city_id} value={city.city_id}>
                      {city.city_name} {city.postal_code ? `(${city.postal_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Street Address Line */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                  Street Address &amp; Suite / Building <span className="text-[var(--color-atelier-brass)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 Infinite Loop, Building 4"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              {/* Set as Default Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs select-none">
                  <input
                    type="checkbox"
                    checked={isDefaultAddress}
                    onChange={(e) => setIsDefaultAddress(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--color-rule)] text-[var(--color-atelier-brass)] accent-[var(--color-atelier-brass)]"
                  />
                  <span>Set as primary default destination address</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[var(--color-rule)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewAddressModalOpen(false)}
                  disabled={isCreatingAddress}
                  className="atelier-btn atelier-btn-ghost !py-2 !px-4 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAddress}
                  className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono flex items-center gap-2"
                >
                  {isCreatingAddress ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <span>Register Address →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE SECURE PAYMENT &amp; PROVISIONING GATEWAY</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
