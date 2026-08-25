/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetCategories,
  apiCreateCategory,
  apiUpdateCategory,
  apiDeleteCategory,
  apiGetProducts,
  type Category,
  type ProductListItem,
} from "@/app/lib/api";
import {
  Tag,
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
  Boxes,
  Users,
  Layers,
  ShoppingBag,
  ExternalLink,
  Package,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user: currentUser, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Category Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Category Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Category Modal
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
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
      const [catsData, prodsData] = await Promise.all([
        apiGetCategories(token),
        apiGetProducts(token),
      ]);
      setCategories(catsData);
      setProducts(prodsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load categories catalog.");
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

  // Map of products per category
  const categoryProductCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      p.categories.forEach((c) => {
        const count = map.get(c.category_id) || 0;
        map.set(c.category_id, count + 1);
      });
    });
    return map;
  }, [products]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.category_id.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newCategoryName.trim()) {
      setCreateError("Category name is required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await apiCreateCategory({ name: newCategoryName.trim() }, token);
      setActionSuccess(`Category '${newCategoryName.trim()}' created successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setIsCreateModalOpen(false);
      setNewCategoryName("");
      await loadData();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create category.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditError(null);
  };

  // Handle Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingCategory) return;
    if (!editCategoryName.trim()) {
      setEditError("Category name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await apiUpdateCategory(editingCategory.category_id, { name: editCategoryName.trim() }, token);
      setActionSuccess(`Category updated to '${editCategoryName.trim()}'.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setEditingCategory(null);
      await loadData();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update category.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async () => {
    if (!token || !deletingCategory) return;
    const attachedCount = categoryProductCountMap.get(deletingCategory.category_id) || 0;
    if (attachedCount > 0) {
      setDeleteError(`Cannot delete '${deletingCategory.name}': ${attachedCount} product(s) are currently associated with this category. Please reassign or remove them first.`);
      return;
    }

    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await apiDeleteCategory(deletingCategory.category_id, token);
      setActionSuccess(`Category '${deletingCategory.name}' deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingCategory(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete category.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  if (authLoading || (!currentUser && !error)) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[var(--color-ink-muted)] tracking-widest uppercase">
            Loading category registry...
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
      <header className="relative z-20 border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/90 backdrop-blur-md sticky top-0 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="font-fraunces text-xl font-bold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-atelier-brass)] transition-colors flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 bg-[var(--color-atelier-brass)] rounded-full animate-pulse shadow-[0_0_8px_var(--color-atelier-brass)]" />
            Electron Gate
          </Link>
          <span className="text-[var(--color-rule-active)] font-mono text-xs">/</span>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-atelier-brass)] font-semibold flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Category Management
          </span>
        </div>

        {/* Global Admin Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 text-xs font-mono">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all flex items-center gap-1.5"
          >
            <Boxes className="w-3.5 h-3.5" />
            Products
          </Link>
          <Link
            href="/admin/categories"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            Categories
          </Link>
          <Link
            href="/admin/orders"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Orders
          </Link>
          <Link
            href="/admin/payments"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Payments
          </Link>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Users
          </Link>
          <Link
            href="/products"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all"
          >
            Storefront
          </Link>
        </nav>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right font-mono text-xs">
            <span className="text-[var(--color-ink)] font-semibold">{currentUser?.email}</span>
            <span className="text-[var(--color-atelier-brass)] uppercase tracking-wider text-[10px]">
              ROLE: {currentUser?.role}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-colors"
            title="Disconnect Terminal Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

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
              PRODUCT TAXONOMY & CLASSIFICATION
            </div>
            <h1 className="font-fraunces text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
              Product Categories
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 max-w-2xl">
              Organize catalog items into structured classification trees for multi-modal vector search and customer storefront navigation.
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
                setNewCategoryName("");
              }}
              className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(212,163,115,0.25)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Category
            </button>
          </div>
        </div>

        {/* Stats & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-ink-dim)]">
            <span>Total Categories: <strong className="text-[var(--color-ink)]">{categories.length}</strong></span>
            <span>·</span>
            <span>Total Classified Products: <strong className="text-[var(--color-ink)]">{products.length}</strong></span>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              placeholder="Search categories..."
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

        {/* Categories Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-xs font-mono text-[var(--color-ink-dim)]">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
              <span>Fetching category tree...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2 text-xs font-mono text-[var(--color-ink-dim)]">
              <Tag className="w-8 h-8 opacity-30" />
              <span>No categories found matching &ldquo;{searchQuery}&rdquo;.</span>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const productCount = categoryProductCountMap.get(cat.category_id) || 0;

              return (
                <div
                  key={cat.category_id}
                  className="rounded-xl bg-[var(--color-paper-card)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] transition-all p-5 flex flex-col justify-between gap-5 group shadow-md"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30 group-hover:scale-105 transition-transform">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)] group-hover:text-[var(--color-atelier-brass)] transition-colors">
                            {cat.name}
                          </h3>
                          <span className="font-mono text-[10px] text-[var(--color-ink-dim)] uppercase tracking-wider">
                            TAXONOMY NODE
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs text-[var(--color-ink-muted)] flex flex-col gap-1 bg-[var(--color-paper-terminal)]/70 p-3 rounded-lg border border-[var(--color-rule)]/50">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-ink-dim)]">Category ID:</span>
                        <span className="text-[var(--color-ink-muted)] select-all font-mono text-[10px]">
                          {cat.category_id.substring(0, 18)}...
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-[var(--color-rule)]/40">
                        <span className="text-[var(--color-ink-dim)]">Associated Products:</span>
                        <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-[var(--color-terminal-cyan)]" />
                          {productCount} product{productCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-rule)] font-mono text-xs">
                    <Link
                      href={`/products?category_id=${cat.category_id}`}
                      className="text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Storefront View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="px-2.5 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-atelier-brass)] transition-colors text-[11px] flex items-center gap-1"
                        title="Rename Category"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={() => {
                          setDeletingCategory(cat);
                          setDeleteError(null);
                        }}
                        className="px-2.5 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-colors text-[11px]"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── CREATE CATEGORY MODAL ────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Create Product Category
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    Register a new classification node
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

            <form onSubmit={handleCreateCategory} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workstations, Quantum Processors, Audio"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
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
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CATEGORY MODAL ──────────────────────────────────────────── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-rule-active)] rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--color-atelier-brass)]/10 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                    Rename Category
                  </h2>
                  <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                    ID: {editingCategory.category_id.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
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

            <form onSubmit={handleUpdateCategory} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  New Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
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

      {/* ── DELETE CATEGORY CONFIRMATION MODAL ────────────────────────────── */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 text-[var(--color-restricted-red)] border-b border-[var(--color-rule)] pb-4">
              <div className="p-2 rounded-lg bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  Delete Category
                </h2>
                <p className="text-xs font-mono text-[var(--color-ink-dim)]">
                  Node: {deletingCategory.name}
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
              Are you sure you want to delete category{" "}
              <strong className="text-[var(--color-ink)]">&ldquo;{deletingCategory.name}&rdquo;</strong>?
              Categories associated with active catalog products cannot be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-rule)] font-mono text-xs">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded bg-[var(--color-restricted-red)] hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
