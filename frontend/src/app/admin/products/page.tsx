/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetProducts,
  apiGetCategories,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
  apiUploadProductImage,
  type ProductListItem,
  type Category,
} from "@/app/lib/api";
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Tag,
  Upload,
  Layers,
  ShoppingBag,
  ExternalLink,
  Package,
  SlidersHorizontal,
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

export default function AdminProductsPage() {
  const router = useRouter();
  const { user: currentUser, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Product Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createImageUrl, setCreateImageUrl] = useState<string>("");
  const [createCategoryIds, setCreateCategoryIds] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editImageUrl, setEditImageUrl] = useState<string>("");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Product Modal
  const [deletingProduct, setDeletingProduct] = useState<ProductListItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userRole = (currentUser?.role || "").toLowerCase();
  const isAuthorized = userRole === "admin" || userRole === "staff";

  // Load data
  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [prodsData, catsData] = await Promise.all([
        apiGetProducts(token),
        apiGetCategories(token),
      ]);
      setProducts(prodsData);
      setCategories(catsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load product catalog.");
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

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        p.categories.some((c) => c.category_id === selectedCategory);

      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description || "").toLowerCase().includes(query) ||
        p.product_id.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Image Upload
  const handleUploadImage = async (file: File, isEdit: boolean = false) => {
    if (!token) return;
    setIsUploadingImage(true);
    try {
      const res = await apiUploadProductImage(file, token);
      if (isEdit) {
        setEditImageUrl(res.image_url);
      } else {
        setCreateImageUrl(res.image_url);
      }
    } catch (err: any) {
      if (isEdit) {
        setEditError(err?.message || "Failed to upload image.");
      } else {
        setCreateError(err?.message || "Failed to upload image.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!createName.trim()) {
      setCreateError("Product name is required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      const created = await apiCreateProduct(
        {
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          image_url: createImageUrl.trim() || undefined,
          category_ids: createCategoryIds,
        },
        token
      );

      setActionSuccess(`Product '${created.name}' created successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateImageUrl("");
      setCreateCategoryIds([]);
      await loadData();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create product.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: ProductListItem) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditDescription(p.description || "");
    setEditImageUrl(p.image_url || "");
    setEditCategoryIds(p.categories.map((c) => c.category_id));
    setEditError(null);
  };

  // Handle Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingProduct) return;
    if (!editName.trim()) {
      setEditError("Product name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await apiUpdateProduct(
        editingProduct.product_id,
        {
          name: editName.trim(),
          description: editDescription.trim() || null,
          image_url: editImageUrl.trim() || null,
          category_ids: editCategoryIds,
        },
        token
      );

      setActionSuccess(`Product '${editName.trim()}' updated successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update product.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (!token || !deletingProduct) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteProduct(deletingProduct.product_id, token);
      setActionSuccess(`Product '${deletingProduct.name}' permanently deleted.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingProduct(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete product.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Toggle Category selection
  const toggleCategorySelection = (categoryId: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditCategoryIds((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      setCreateCategoryIds((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    }
  };

  if (authLoading || (!currentUser && !error)) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[var(--color-ink-muted)] tracking-widest uppercase">
            Loading products registry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)]/20 selection:text-[var(--color-atelier-brass)]">
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Top System Enclave Bar */}
      

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Banner Alerts */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/40 flex items-center justify-between text-[var(--color-terminal-green)] font-mono text-xs animate-in fade-in duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[var(--color-terminal-green)]/70 hover:text-[var(--color-terminal-green)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 flex items-center justify-between text-[var(--color-restricted-red)] font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-restricted-red)]/70 hover:text-[var(--color-restricted-red)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Section & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--color-rule)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-atelier-brass)] uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 bg-[var(--color-atelier-brass)] rounded-full" />
              COMMERCE CATALOG & HARDWARE SPECS
            </div>
            <h1 className="font-fraunces text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
              Product Catalog Management
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 max-w-2xl">
              Create and manage devices, hardware models, technical specifications, and multi-modal vector image galleries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all font-mono text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--color-atelier-brass)]" : ""}`} />
              Sync
            </button>
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setCreateError(null);
              }}
              className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(212,163,115,0.25)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded font-mono text-xs transition-all uppercase tracking-wider whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold shadow-sm"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]"
              }`}
            >
              ALL PRODUCTS ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.category_id}
                onClick={() => setSelectedCategory(c.category_id)}
                className={`px-3 py-1.5 rounded font-mono text-xs transition-all uppercase tracking-wider whitespace-nowrap ${
                  selectedCategory === c.category_id
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold shadow-sm"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search by title or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/60 text-[var(--color-ink-dim)] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-medium">Product & Cover</th>
                  <th className="py-3.5 px-4 font-medium">Categories</th>
                  <th className="py-3.5 px-4 font-medium">Variants Available</th>
                  <th className="py-3.5 px-4 font-medium hidden sm:table-cell">Product ID</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--color-ink-dim)]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-atelier-brass)]" />
                        <span>Querying product catalog...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--color-ink-dim)]">
                      <div className="flex flex-col items-center gap-2">
                        <Boxes className="w-8 h-8 opacity-30" />
                        <span>No products found matching criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    return (
                      <tr
                        key={p.product_id}
                        className="hover:bg-[var(--color-paper-hover)]/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-[var(--color-ink-dim)]" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--color-ink)] text-sm group-hover:text-[var(--color-atelier-brass)] transition-colors">
                                {p.name}
                              </span>
                              <span className="text-[11px] text-[var(--color-ink-muted)] line-clamp-1 max-w-sm">
                                {p.description || "No description provided."}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.categories.length > 0 ? (
                              p.categories.map((c) => (
                                <span
                                  key={c.category_id}
                                  className="px-2 py-0.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[10px] text-[var(--color-ink-muted)] font-mono"
                                >
                                  {c.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[var(--color-ink-dim)] italic">
                                Uncategorized
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-terminal-cyan)]/30 bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] font-mono text-[11px] font-medium">
                            <Package className="w-3 h-3" />
                            {p.variant_count} Variant{p.variant_count === 1 ? "" : "s"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 hidden sm:table-cell text-[var(--color-ink-dim)] text-[11px] select-all">
                          {p.product_id.substring(0, 16)}...
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/products/${p.product_id}`}
                              className="px-3 py-1.5 rounded bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-brass)] hover:text-[var(--color-paper-terminal)] font-semibold transition-all flex items-center gap-1 text-[11px]"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2.5 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-atelier-brass)] transition-all flex items-center gap-1 text-[11px]"
                              title="Edit Basic Metadata"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setDeletingProduct(p);
                                setDeleteError(null);
                              }}
                              className="px-2.5 py-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-all flex items-center gap-1 text-[11px]"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-[var(--color-paper-terminal)]/60 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] font-mono text-[var(--color-ink-dim)]">
            <span>Showing {filteredProducts.length} of {products.length} products</span>
            <Link
              href="/admin/categories"
              className="text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
            >
              <span>Manage Categories Taxonomy</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* ── CREATE PRODUCT MODAL ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Create New Product
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    Register hardware entity in catalog
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M3 Max 16"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief architectural overview and highlights..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={createImageUrl}
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                  <label className="px-3 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file, false);
                      }}
                    />
                  </label>
                </div>
                {isUploadingImage && (
                  <span className="text-[var(--color-atelier-brass)] text-[10px] animate-pulse">
                    Uploading image to enclave storage...
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Category Assignment
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)]">
                  {categories.map((c) => {
                    const isSelected = createCategoryIds.includes(c.category_id);
                    return (
                      <button
                        type="button"
                        key={c.category_id}
                        onClick={() => toggleCategorySelection(c.category_id, false)}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
                          isSelected
                            ? "bg-[var(--color-atelier-brass)]/20 text-[var(--color-atelier-brass)] border-[var(--color-atelier-brass)]"
                            : "bg-[var(--color-paper-card)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || isUploadingImage}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PRODUCT MODAL ───────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[var(--color-paper-card)] border border-[var(--color-rule-active)] rounded-xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Edit Product Metadata
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    ID: {editingProduct.product_id.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                  <label className="px-3 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file, true);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Category Assignment
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)]">
                  {categories.map((c) => {
                    const isSelected = editCategoryIds.includes(c.category_id);
                    return (
                      <button
                        type="button"
                        key={c.category_id}
                        onClick={() => toggleCategorySelection(c.category_id, true)}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
                          isSelected
                            ? "bg-[var(--color-atelier-brass)]/20 text-[var(--color-atelier-brass)] border-[var(--color-atelier-brass)]"
                            : "bg-[var(--color-paper-card)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || isUploadingImage}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
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

      {/* ── DELETE PRODUCT CONFIRMATION MODAL ────────────────────────────── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)] border-b border-[var(--color-rule)] pb-4">
              <div className="p-2 rounded-lg bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  Delete Product
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                  Irreversible Catalog Deletion
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-[var(--color-ink-muted)] font-mono leading-relaxed">
              Are you sure you want to delete product{" "}
              <strong className="text-[var(--color-ink)]">&ldquo;{deletingProduct.name}&rdquo;</strong>?
              This will permanently remove the product along with its associated variants, specs, and gallery images.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-rule)] font-mono text-xs">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded bg-[var(--color-restricted-red)] hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Product"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
