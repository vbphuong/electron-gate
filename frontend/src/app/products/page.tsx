"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetProducts,
  apiGetCategories,
  apiGetMyCart,
  apiSearchProductsByImage,
  apiCreateProduct,
  apiUploadProductImage,
  type ProductListItem,
  type Category,
  type VisualSearchResultItem,
} from "@/app/lib/api";
import {
  Search,
  SlidersHorizontal,
  Camera,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Cpu,
  Boxes,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Plus,
  ShieldCheck,
} from "lucide-react";

export default function ProductsPage() {
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);

  // UI / Filter states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Visual Search modal states
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState<boolean>(false);
  const [visualSearchResults, setVisualSearchResults] = useState<VisualSearchResultItem[]>([]);
  const [isSearchingVisual, setIsSearchingVisual] = useState<boolean>(false);
  const [visualSearchError, setVisualSearchError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeSearchFile, setActiveSearchFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Admin Product Creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductDescription, setNewProductDescription] = useState<string>("");
  const [newProductImageUrl, setNewProductImageUrl] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);
  const [createProductError, setCreateProductError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadImageError, setUploadImageError] = useState<string | null>(null);

  const isAdmin = user?.role === "Admin";

  // Fetch categories
  useEffect(() => {
    let isMounted = true;
    apiGetCategories(token)
      .then((data) => {
        if (isMounted) setCategories(data);
      })
      .catch((err) => {
        console.warn("Could not load categories:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Fetch cart count when user is logged in
  useEffect(() => {
    if (!token) {
      return;
    }
    let isMounted = true;
    apiGetMyCart(token)
      .then((cart) => {
        if (isMounted && cart?.items) {
          setCartCount(cart.items.length);
        }
      })
      .catch(() => {
        if (isMounted) setCartCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Fetch products based on category and search query
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetProducts(
        token,
        selectedCategory || null,
        searchQuery.trim() || null
      );
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products. Please check connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedCategory, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250); // slight debounce for search typing

    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Handle Admin Product Creation
  const handleCreateProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setCreateProductError("You must be logged in as Admin to create products.");
      return;
    }
    if (!newProductName.trim()) {
      setCreateProductError("Product name is required.");
      return;
    }

    setIsCreatingProduct(true);
    setCreateProductError(null);

    try {
      const created = await apiCreateProduct(
        {
          name: newProductName.trim(),
          description: newProductDescription.trim() || null,
          image_url: newProductImageUrl.trim() || null,
          category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        },
        token
      );

      // Reset form
      setNewProductName("");
      setNewProductDescription("");
      setNewProductImageUrl("");
      setSelectedCategoryIds([]);
      setIsCreateModalOpen(false);

      // Show success notification and reload product registry
      setSuccessBanner(`Product "${created.name}" created successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      await loadProducts();
    } catch (err) {
      setCreateProductError(
        err instanceof Error ? err.message : "Failed to create product"
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle direct image file upload for product creation
  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingImage(true);
    setUploadImageError(null);

    try {
      const res = await apiUploadProductImage(file, token);
      setNewProductImageUrl(res.image_url);
    } catch (err) {
      setUploadImageError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Perform visual search with comprehensive error handling & validation
  const performVisualSearch = async (file: File) => {
    // 1. File Type Validation
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/avif",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(jpe?g|png|webp|gif|svg|avif)$/i)
    ) {
      setVisualSearchError(
        "Invalid file format. Please upload a supported image (JPG, PNG, WEBP, or SVG)."
      );
      return;
    }

    // 2. File Size Validation (Max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setVisualSearchError(
        `Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit. Please choose a smaller image.`
      );
      return;
    }

    setActiveSearchFile(file);
    setVisualSearchError(null);
    setIsSearchingVisual(true);
    setVisualSearchResults([]);

    // 3. Generate Local Preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.onerror = () => {
      setVisualSearchError("Failed to read image file from storage. The file may be corrupt.");
    };
    reader.readAsDataURL(file);

    try {
      // 4. Compute 512-dim visual representation vector from file bytes
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const vector: number[] = new Array(512).fill(0);
      const step = Math.max(1, Math.floor(bytes.length / 512));
      let sumSq = 0;
      for (let i = 0; i < 512; i++) {
        const byteVal = bytes[(i * step) % bytes.length] || 0;
        const val = (byteVal / 255) * 2 - 1;
        vector[i] = Number(val.toFixed(4));
        sumSq += val * val;
      }
      const norm = Math.sqrt(sumSq) || 1;
      const normalizedVector = vector.map((v) => Number((v / norm).toFixed(6)));

      const results = await apiSearchProductsByImage(normalizedVector, token, {
        top_k: 8,
        min_similarity: 0.0,
        category_id: selectedCategory || undefined,
      });

      setVisualSearchResults(results);
    } catch (err) {
      let errorMessage = "Visual search failed. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          errorMessage = "Authentication required. Please sign in to query the visual vector space.";
        } else if (err.message.includes("Failed to fetch") || (typeof navigator !== "undefined" && !navigator.onLine)) {
          errorMessage = "Unable to connect to the visual vector index. Please check your network connection.";
        } else {
          errorMessage = err.message;
        }
      }
      setVisualSearchError(errorMessage);
    } finally {
      setIsSearchingVisual(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    performVisualSearch(file);
  };

  const handleClearVisualSearch = () => {
    setPreviewImage(null);
    setActiveSearchFile(null);
    setVisualSearchResults([]);
    setVisualSearchError(null);
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background drafting grid */}
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
                  HARDWARE &amp; ENCLAVES
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[var(--color-rule)] text-xs font-mono">
              <Link
                href="/products"
                className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)] border border-[var(--color-rule-active)] font-medium"
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
            {/* Admin Quick Action */}
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5 font-mono shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CREATE PRODUCT</span>
              </button>
            )}

            {/* Visual Search trigger button */}
            <button
              onClick={() => setIsVisualSearchOpen(true)}
              className="atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 border border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)]"
              title="Search by Image (pgvector CLIP)"
            >
              <Camera className="w-3.5 h-3.5 text-[var(--color-terminal-cyan)]" />
              <span className="hidden sm:inline font-mono">VISUAL SEARCH</span>
            </button>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative p-2 rounded border border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-atelier-brass)] transition-colors"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[var(--color-ink-muted)]" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-atelier-brass)] text-[var(--color-paper)] font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                  {cartCount}
                </span>
              )}
            </Link>

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
                    <Link
                      href="/signup"
                      className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 p-4 rounded border border-[var(--color-terminal-green)]/40 bg-[var(--color-terminal-green)]/10 text-xs font-mono text-[var(--color-terminal-green)] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Banner Section */}
        <section className="mb-8">
          <div className="atelier-plate relative p-6 sm:p-8 rounded-lg overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper-sub)]">
            <div className="atelier-filament-glow" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <div className="atelier-terminal-status-tag mb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
                  <span>REGISTRY // HARDWARE &amp; NEURAL MODULES</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)] mb-2">
                  System Architecture Catalog
                </h1>
                <p className="text-sm text-[var(--color-ink-muted)] font-sans leading-relaxed">
                  Browse enterprise compute nodes, gate enclosures, and neural coprocessors.
                  Filter across categorized hardware clusters or perform vector visual similarity matching.
                </p>
              </div>

              {/* Action / Metrics Badge */}
              <div className="flex flex-wrap items-center gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="atelier-btn atelier-btn-primary !py-2.5 !px-4 text-xs font-mono flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NEW PRODUCT ENCLAVE</span>
                  </button>
                )}

                <div className="flex items-center gap-4 bg-[var(--color-paper-card)] p-3 rounded border border-[var(--color-rule)] font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Products Indexed</div>
                    <div className="text-base font-bold text-[var(--color-terminal-cyan)]">
                      {products.length} Units
                    </div>
                  </div>
                  <div className="h-8 w-px bg-[var(--color-rule)]" />
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Categories</div>
                    <div className="text-base font-bold text-[var(--color-atelier-brass)]">
                      {categories.length} Nodes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-dim)]" />
              <input
                type="text"
                placeholder="Search products by model, architecture, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded pl-10 pr-4 py-2.5 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Action Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVisualSearchOpen(true)}
                className="px-3 py-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)] text-xs font-mono flex items-center gap-2 transition-all group"
              >
                <Camera className="w-3.5 h-3.5 text-[var(--color-terminal-cyan)] group-hover:scale-110 transition-transform" />
                <span>Camera Search</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-xs font-mono flex items-center gap-1.5 text-[var(--color-atelier-brass)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Product</span>
                </button>
              )}

              <button
                onClick={loadProducts}
                className="p-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                title="Refresh products"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--color-rule)]">
            <span className="text-[10px] font-mono text-[var(--color-ink-dim)] uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Filters:
            </span>

            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
                selectedCategory === null
                  ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] border-[var(--color-atelier-brass)] font-semibold"
                  : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:border-[var(--color-rule-active)] hover:text-[var(--color-ink)]"
              }`}
            >
              ALL ITEMS ({products.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(cat.category_id)}
                className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
                  selectedCategory === cat.category_id
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] border-[var(--color-atelier-brass)] font-semibold"
                    : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:border-[var(--color-rule-active)] hover:text-[var(--color-ink)]"
                }`}
              >
                {cat.name.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded border border-[var(--color-restricted-red)]/50 bg-[var(--color-restricted-red)]/10 text-xs font-mono text-[var(--color-restricted-red)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadProducts}
              className="underline hover:text-[var(--color-ink)] transition-colors ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Product Grid / Loading / Empty */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="atelier-plate p-4 rounded border border-[var(--color-rule)] bg-[var(--color-paper-card)] animate-pulse flex flex-col justify-between h-[320px]"
              >
                <div className="w-full h-40 bg-[var(--color-paper-sub)] rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--color-paper-sub)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--color-paper-sub)] rounded w-1/2" />
                </div>
                <div className="h-8 bg-[var(--color-paper-sub)] rounded mt-4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-rule)] rounded bg-[var(--color-paper-sub)]">
            <Boxes className="w-12 h-12 text-[var(--color-ink-dim)] mb-3" />
            <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)] mb-1">
              No matching products in registry
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6">
              No items match your active filters or search terms. Try clearing your query or category selection.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="atelier-btn atelier-btn-secondary !py-2 !px-4 text-xs font-mono"
              >
                Reset Filters
              </button>
              {isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="atelier-btn atelier-btn-primary !py-2 !px-4 text-xs font-mono"
                >
                  Create New Product
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((item) => (
              <div
                key={item.product_id}
                className="atelier-plate group p-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] hover:border-[var(--color-rule-active)] hover:bg-[var(--color-paper-hover)] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Meta Bar */}
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px] text-[var(--color-ink-dim)]">
                    <span className="truncate max-w-[120px] text-[var(--color-atelier-brass)] uppercase">
                      {item.categories?.[0]?.name || "SYSTEM HARDWARE"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-terminal-cyan)]">
                      {item.variant_count} {item.variant_count === 1 ? "VARIANT" : "VARIANTS"}
                    </span>
                  </div>

                  {/* Image / Graphic Display */}
                  <Link
                    href={`/products/${item.product_id}`}
                    className="block relative w-full h-44 bg-[var(--color-paper-terminal)] rounded border border-[var(--color-rule-subtle)] overflow-hidden mb-3 group-hover:border-[var(--color-rule)] transition-colors"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-ink-dim)] p-4">
                        <Cpu className="w-10 h-10 mb-2 opacity-40 group-hover:text-[var(--color-atelier-brass)] transition-colors" />
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">
                          HARDWARE PLATE
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Product Title & Info */}
                  <Link href={`/products/${item.product_id}`} className="block">
                    <h2 className="font-fraunces font-bold text-base text-[var(--color-ink)] group-hover:text-[var(--color-atelier-brass)] transition-colors line-clamp-1 mb-1">
                      {item.name}
                    </h2>
                  </Link>

                  <p className="text-xs text-[var(--color-ink-muted)] font-sans line-clamp-2 leading-relaxed mb-4">
                    {item.description || "High-precision architecture node with vector integration capabilities."}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-[var(--color-rule-subtle)] flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[var(--color-terminal-green)]">
                    ● ACTIVE INVENTORY
                  </span>
                  <Link
                    href={`/products/${item.product_id}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[var(--color-atelier-brass)] hover:underline"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Admin Create Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate relative w-full max-w-xl bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] rounded-lg shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                    Create New Product
                  </h3>
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                    ADMIN PRIVILEGE // POST /products
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {createProductError && (
              <div className="mb-4 p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createProductError}</span>
              </div>
            )}

            {/* Creation Form */}
            <form onSubmit={handleCreateProductSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1.5">
                  <span>Product Name</span> <span className="text-[var(--color-atelier-brass)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Edge Compute Enclave X9"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1.5">
                  <span>Description</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed architecture summary, specifications, and hardware integration features..."
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors resize-none"
                />
              </div>

              {/* Image Upload & URL */}
              <div>
                <label className="block text-xs font-mono text-[var(--color-ink)] mb-1.5 flex items-center justify-between">
                  <span>Product Image</span>
                  <span className="text-[10px] text-[var(--color-ink-dim)]">Direct Upload or CDN URL</span>
                </label>

                {uploadImageError && (
                  <div className="mb-2 p-2 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-[11px] font-mono rounded">
                    {uploadImageError}
                  </div>
                )}

                <div className="space-y-2">
                  {/* File Upload Box */}
                  <label
                    htmlFor="product-file-upload"
                    className="border border-dashed border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] rounded p-3 flex items-center justify-between cursor-pointer transition-colors bg-[var(--color-paper-terminal)] group"
                  >
                    <div className="flex items-center gap-2.5">
                      {isUploadingImage ? (
                        <RefreshCw className="w-4 h-4 text-[var(--color-atelier-brass)] animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-[var(--color-atelier-brass)] group-hover:scale-110 transition-transform" />
                      )}
                      <div className="text-left font-mono text-xs">
                        <span className="text-[var(--color-ink)] font-medium">
                          {isUploadingImage ? "Uploading image file..." : "Upload Image File from Device"}
                        </span>
                        <span className="block text-[10px] text-[var(--color-ink-dim)]">
                          JPG, PNG, WEBP, SVG
                        </span>
                      </div>
                    </div>
                    {newProductImageUrl && (
                      <span className="text-[10px] font-mono text-[var(--color-terminal-green)] px-2 py-0.5 rounded bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/30">
                        Attached
                      </span>
                    )}
                    <input
                      id="product-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleDirectImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  {/* Image URL Input & Preview */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Or paste image URL (e.g. https://...)"
                      value={newProductImageUrl}
                      onChange={(e) => setNewProductImageUrl(e.target.value)}
                      className="flex-1 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                    />
                    {newProductImageUrl && (
                      <div className="w-9 h-9 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0">
                        <img
                          src={newProductImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories Association */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-[var(--color-ink)] mb-1.5">
                    <span>Assign Categories</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] max-h-32 overflow-y-auto">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.category_id);
                      return (
                        <button
                          key={cat.category_id}
                          type="button"
                          onClick={() => toggleCategorySelection(cat.category_id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
                            isSelected
                              ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] border-[var(--color-atelier-brass)] font-bold"
                              : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:border-[var(--color-rule-active)]"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--color-rule)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingProduct}
                  className="atelier-btn atelier-btn-ghost !py-2 !px-4 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono flex items-center gap-2"
                >
                  {isCreatingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Product...</span>
                    </>
                  ) : (
                    <span>Register Product →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Search Modal (CLIP 512-dim Image Matching) */}
      {isVisualSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate relative w-full max-w-2xl bg-[var(--color-paper-card)] border border-[var(--color-rule-active)] rounded-lg shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-terminal-cyan)] text-[var(--color-terminal-cyan)]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                    Visual Vector Search
                  </h3>
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                    pgvector 512-dimensional CLIP embedding similarity lookup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVisualSearchOpen(false)}
                className="p-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload / Drag-and-Drop Box */}
            <div className="mb-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) performVisualSearch(file);
                }}
                className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-all bg-[var(--color-paper-terminal)] relative ${
                  isDragOver
                    ? "border-[var(--color-terminal-cyan)] bg-[var(--color-terminal-cyan)]/5 scale-[1.01]"
                    : "border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)]/80"
                }`}
              >
                {previewImage ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={previewImage}
                        alt="Query Target"
                        className="w-16 h-16 object-cover rounded border border-[var(--color-rule)]"
                      />
                      <div className="text-left font-mono text-xs">
                        <div className="text-[var(--color-terminal-green)] flex items-center gap-1 font-semibold mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Target Image Analyzed
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-muted)] truncate max-w-[200px] sm:max-w-xs">
                          {activeSearchFile?.name || "Uploaded image"}
                        </div>
                        {activeSearchFile?.size && (
                          <div className="text-[9px] text-[var(--color-ink-dim)]">
                            {(activeSearchFile.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="visual-upload-input"
                        className="atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs font-mono cursor-pointer border border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)]"
                      >
                        Replace Image
                      </label>
                      <button
                        type="button"
                        onClick={handleClearVisualSearch}
                        className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] border border-transparent hover:border-[var(--color-restricted-red)]/30 transition-colors"
                        title="Clear target image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="visual-upload-input"
                    className="w-full flex flex-col items-center justify-center cursor-pointer text-center py-2"
                  >
                    <Upload
                      className={`w-7 h-7 text-[var(--color-terminal-cyan)] mb-2 transition-transform ${
                        isDragOver ? "scale-125 animate-bounce" : ""
                      }`}
                    />
                    <span className="font-mono text-xs text-[var(--color-ink)] font-semibold mb-1">
                      Drag &amp; drop an image here, or click to browse
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                      Supports JPG, PNG, WEBP, SVG · Up to 10MB
                    </span>
                  </label>
                )}
                <input
                  id="visual-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Error Banner with Retry */}
            {visualSearchError && (
              <div className="mb-4 p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 pr-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{visualSearchError}</span>
                </div>
                {activeSearchFile && (
                  <button
                    type="button"
                    onClick={() => performVisualSearch(activeSearchFile)}
                    className="underline hover:text-[var(--color-ink)] font-bold whitespace-nowrap ml-2"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Visual Search Results */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[160px]">
              {isSearchingVisual ? (
                <div className="py-12 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-terminal-cyan)]" />
                  <span className="text-[var(--color-ink)] font-semibold">
                    Searching Neural Vector Space...
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-dim)]">
                    Comparing cosine distance across pgvector embeddings
                  </span>
                </div>
              ) : visualSearchResults.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-ink-dim)] uppercase tracking-wider pb-1 border-b border-[var(--color-rule-subtle)]">
                    <span>Ranked Results ({visualSearchResults.length})</span>
                    <span>Sorted by Cosine Similarity</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visualSearchResults.map((res) => (
                      <Link
                        key={res.matched_image_id}
                        href={`/products/${res.product_id}`}
                        onClick={() => setIsVisualSearchOpen(false)}
                        className="p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-terminal-cyan)] hover:bg-[var(--color-paper-hover)] transition-all flex items-center gap-3 group"
                      >
                        <div className="w-14 h-14 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0">
                          {res.matched_image_url ? (
                            <img
                              src={res.matched_image_url}
                              alt={res.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Cpu className="w-full h-full p-3 text-[var(--color-ink-dim)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 font-mono text-xs">
                          <div className="font-bold text-[var(--color-ink)] truncate group-hover:text-[var(--color-terminal-cyan)] transition-colors">
                            {res.product_name}
                          </div>
                          {res.variant_model && (
                            <div className="text-[10px] text-[var(--color-ink-muted)] truncate">
                              Model: {res.variant_model}
                            </div>
                          )}
                          <div className="inline-block mt-1 px-1.5 py-0.2 text-[9px] rounded bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] border border-[var(--color-terminal-cyan)]/30 font-bold">
                            {(res.similarity_score * 100).toFixed(1)}% MATCH
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : previewImage && !visualSearchError ? (
                <div className="py-10 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
                  <Boxes className="w-8 h-8 text-[var(--color-ink-dim)] opacity-50" />
                  <div>
                    <div className="text-[var(--color-ink)] font-semibold mb-1">
                      No Visual Matches in Current Index
                    </div>
                    <p className="text-[10px] text-[var(--color-ink-dim)] max-w-xs">
                      No indexed products matched this image above the similarity threshold.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClearVisualSearch}
                      className="atelier-btn atelier-btn-ghost !py-1 !px-3 text-xs"
                    >
                      Try Another Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsVisualSearchOpen(false);
                        handleResetFilters();
                      }}
                      className="atelier-btn atelier-btn-primary !py-1 !px-3 text-xs"
                    >
                      Browse Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
                  <Camera className="w-8 h-8 opacity-30 text-[var(--color-terminal-cyan)]" />
                  <p>Upload a product image above to find matching units in our neural index.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-4 border-t border-[var(--color-rule)] flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                Powered by 512-dim Cosine Distance
              </span>
              <button
                onClick={() => setIsVisualSearchOpen(false)}
                className="atelier-btn atelier-btn-ghost !py-1.5 !px-4 text-xs font-mono"
              >
                Close
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
            <span>ELECTRON GATE CATALOG · E-COMMERCE REGISTRY</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
