/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetProductById,
  apiGetCategories,
  apiUpdateProduct,
  apiUploadProductImage,
  apiCreateVariant,
  apiUpdateVariant,
  apiDeleteVariant,
  apiGetProductSpecs,
  apiCreateProductSpec,
  apiUpdateProductSpec,
  apiDeleteProductSpec,
  apiGetProductImages,
  apiCreateProductImage,
  apiUpdateProductImage,
  apiDeleteProductImage,
  type ProductRead,
  type Category,
  type VariantBrief,
  type ProductSpecRead,
  type ProductImageRead,
} from "@/app/lib/api";
import {
  Boxes,
  Package,
  Cpu,
  Image as ImageIcon,
  Tag,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
  AlertCircle,
  X,
  Upload,
  ArrowLeft,
  DollarSign,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Check,
  Star,
} from "lucide-react";

type ActiveTab = "variants" | "specs" | "gallery" | "metadata";

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = typeof params.id === "string" ? params.id : "";

  const { user: currentUser, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [product, setProduct] = useState<ProductRead | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [specs, setSpecs] = useState<ProductSpecRead[]>([]);
  const [images, setImages] = useState<ProductImageRead[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("variants");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── VARIANT MODAL STATES ──────────────────────────────────────────────────
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] = useState<VariantBrief | null>(null);
  const [variantModel, setVariantModel] = useState<string>("");
  const [variantColor, setVariantColor] = useState<string>("");
  const [variantStorage, setVariantStorage] = useState<string>("");
  const [variantPrice, setVariantPrice] = useState<string>("");
  const [variantStatus, setVariantStatus] = useState<string>("active");
  const [variantImageUrl, setVariantImageUrl] = useState<string>("");
  const [isUploadingVariantImage, setIsUploadingVariantImage] = useState<boolean>(false);
  const [isSubmittingVariant, setIsSubmittingVariant] = useState<boolean>(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<VariantBrief | null>(null);
  const [isDeletingVariant, setIsDeletingVariant] = useState<boolean>(false);

  // ── SPEC MODAL STATES ─────────────────────────────────────────────────────
  const [isSpecModalOpen, setIsSpecModalOpen] = useState<boolean>(false);
  const [editingSpec, setEditingSpec] = useState<ProductSpecRead | null>(null);
  const [specName, setSpecName] = useState<string>("");
  const [specValue, setSpecValue] = useState<string>("");
  const [isSubmittingSpec, setIsSubmittingSpec] = useState<boolean>(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<ProductSpecRead | null>(null);
  const [isDeletingSpec, setIsDeletingSpec] = useState<boolean>(false);

  // ── IMAGE GALLERY MODAL STATES ────────────────────────────────────────────
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [newImageVariantId, setNewImageVariantId] = useState<string>("");
  const [newImageIsPrimary, setNewImageIsPrimary] = useState<boolean>(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState<boolean>(false);
  const [isSubmittingImage, setIsSubmittingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<ProductImageRead | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState<boolean>(false);

  // ── METADATA FORM STATES ──────────────────────────────────────────────────
  const [metaName, setMetaName] = useState<string>("");
  const [metaDescription, setMetaDescription] = useState<string>("");
  const [metaImageUrl, setMetaImageUrl] = useState<string>("");
  const [metaCategoryIds, setMetaCategoryIds] = useState<string[]>([]);
  const [isUploadingMetaImage, setIsUploadingMetaImage] = useState<boolean>(false);
  const [isSavingMeta, setIsSavingMeta] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const userRole = (currentUser?.role || "").toLowerCase();
  const isAuthorized = userRole === "admin" || userRole === "staff";

  // Load all product details
  const loadProductData = useCallback(async () => {
    if (!token || !productId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [prodData, catsData, specsData, imagesData] = await Promise.all([
        apiGetProductById(productId, token),
        apiGetCategories(token),
        apiGetProductSpecs(productId, token),
        apiGetProductImages(productId, token),
      ]);
      setProduct(prodData);
      setCategories(catsData);
      setSpecs(specsData);
      setImages(imagesData);

      // Seed metadata form
      setMetaName(prodData.name);
      setMetaDescription(prodData.description || "");
      setMetaImageUrl(prodData.image_url || "");
      setMetaCategoryIds(prodData.categories.map((c) => c.category_id));
    } catch (err: any) {
      setError(err?.message || "Failed to load product details.");
    } finally {
      setIsLoading(false);
    }
  }, [token, productId]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (!isAuthorized) {
        router.replace("/dashboard");
      } else {
        loadProductData();
      }
    }
  }, [authLoading, currentUser, isAuthorized, router, loadProductData]);

  // ── VARIANT HANDLERS ──────────────────────────────────────────────────────
  const openCreateVariantModal = () => {
    setEditingVariant(null);
    setVariantModel("");
    setVariantColor("");
    setVariantStorage("");
    setVariantPrice("");
    setVariantStatus("active");
    setVariantImageUrl("");
    setVariantError(null);
    setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (v: VariantBrief) => {
    setEditingVariant(v);
    setVariantModel(v.model || "");
    setVariantColor(v.color || "");
    setVariantStorage(v.storage || "");
    setVariantPrice(String(v.price));
    setVariantStatus(v.status || "active");
    setVariantImageUrl(v.image_url || "");
    setVariantError(null);
    setIsVariantModalOpen(true);
  };

  const handleUploadVariantImage = async (file: File) => {
    if (!token) return;
    setIsUploadingVariantImage(true);
    try {
      const res = await apiUploadProductImage(file, token);
      setVariantImageUrl(res.image_url);
    } catch (err: any) {
      setVariantError(err?.message || "Failed to upload variant image.");
    } finally {
      setIsUploadingVariantImage(false);
    }
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !productId) return;
    const priceNum = parseFloat(variantPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setVariantError("Price must be a valid positive number.");
      return;
    }

    setIsSubmittingVariant(true);
    setVariantError(null);
    try {
      if (editingVariant) {
        await apiUpdateVariant(
          productId,
          editingVariant.variant_id,
          {
            model: variantModel.trim() || null,
            color: variantColor.trim() || null,
            storage: variantStorage.trim() || null,
            price: priceNum,
            status: variantStatus,
            image_url: variantImageUrl.trim() || null,
          },
          token
        );
        setActionSuccess("Variant updated successfully.");
      } else {
        await apiCreateVariant(
          productId,
          {
            model: variantModel.trim() || null,
            color: variantColor.trim() || null,
            storage: variantStorage.trim() || null,
            price: priceNum,
            status: variantStatus,
            image_url: variantImageUrl.trim() || null,
          },
          token
        );
        setActionSuccess("New variant added to catalog.");
      }
      setTimeout(() => setActionSuccess(null), 5000);
      setIsVariantModalOpen(false);
      await loadProductData();
    } catch (err: any) {
      setVariantError(err?.message || "Failed to save variant.");
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!token || !productId || !deletingVariant) return;
    setIsDeletingVariant(true);
    try {
      await apiDeleteVariant(productId, deletingVariant.variant_id, token);
      setActionSuccess("Variant permanently removed.");
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingVariant(null);
      await loadProductData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete variant.");
    } finally {
      setIsDeletingVariant(false);
    }
  };

  // ── SPEC HANDLERS ─────────────────────────────────────────────────────────
  const openCreateSpecModal = () => {
    setEditingSpec(null);
    setSpecName("");
    setSpecValue("");
    setSpecError(null);
    setIsSpecModalOpen(true);
  };

  const openEditSpecModal = (s: ProductSpecRead) => {
    setEditingSpec(s);
    setSpecName(s.spec_name);
    setSpecValue(s.spec_value);
    setSpecError(null);
    setIsSpecModalOpen(true);
  };

  const handleSaveSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !productId) return;
    if (!specName.trim() || !specValue.trim()) {
      setSpecError("Specification name and value are required.");
      return;
    }

    setIsSubmittingSpec(true);
    setSpecError(null);
    try {
      if (editingSpec) {
        await apiUpdateProductSpec(
          productId,
          editingSpec.spec_product_id,
          { spec_name: specName.trim(), spec_value: specValue.trim() },
          token
        );
        setActionSuccess("Specification updated.");
      } else {
        await apiCreateProductSpec(
          productId,
          { spec_name: specName.trim(), spec_value: specValue.trim() },
          token
        );
        setActionSuccess("Specification added.");
      }
      setTimeout(() => setActionSuccess(null), 5000);
      setIsSpecModalOpen(false);
      await loadProductData();
    } catch (err: any) {
      setSpecError(err?.message || "Failed to save specification.");
    } finally {
      setIsSubmittingSpec(false);
    }
  };

  const handleDeleteSpec = async () => {
    if (!token || !productId || !deletingSpec) return;
    setIsDeletingSpec(true);
    try {
      await apiDeleteProductSpec(productId, deletingSpec.spec_product_id, token);
      setActionSuccess("Specification removed.");
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingSpec(null);
      await loadProductData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete specification.");
    } finally {
      setIsDeletingSpec(false);
    }
  };

  // ── GALLERY IMAGE HANDLERS ────────────────────────────────────────────────
  const handleUploadGalleryImage = async (file: File) => {
    if (!token) return;
    setIsUploadingGalleryImage(true);
    try {
      const res = await apiUploadProductImage(file, token);
      setNewImageUrl(res.image_url);
    } catch (err: any) {
      setImageError(err?.message || "Failed to upload image.");
    } finally {
      setIsUploadingGalleryImage(false);
    }
  };

  const handleSaveGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !productId) return;
    if (!newImageUrl.trim()) {
      setImageError("Image URL or uploaded file is required.");
      return;
    }

    setIsSubmittingImage(true);
    setImageError(null);
    try {
      await apiCreateProductImage(
        productId,
        {
          image_url: newImageUrl.trim(),
          variant_id: newImageVariantId || null,
          is_primary: newImageIsPrimary,
        },
        token
      );
      setActionSuccess("Gallery image registered.");
      setTimeout(() => setActionSuccess(null), 5000);
      setIsImageModalOpen(false);
      setNewImageUrl("");
      setNewImageVariantId("");
      setNewImageIsPrimary(false);
      await loadProductData();
    } catch (err: any) {
      setImageError(err?.message || "Failed to add image to gallery.");
    } finally {
      setIsSubmittingImage(false);
    }
  };

  const handleTogglePrimaryImage = async (img: ProductImageRead) => {
    if (!token || !productId) return;
    try {
      await apiUpdateProductImage(
        productId,
        img.image_id,
        { is_primary: true },
        token
      );
      setActionSuccess("Cover image updated.");
      setTimeout(() => setActionSuccess(null), 5000);
      await loadProductData();
    } catch (err: any) {
      setError(err?.message || "Failed to set primary image.");
    }
  };

  const handleDeleteImage = async () => {
    if (!token || !productId || !deletingImage) return;
    setIsDeletingImage(true);
    try {
      await apiDeleteProductImage(productId, deletingImage.image_id, token);
      setActionSuccess("Image removed from gallery.");
      setTimeout(() => setActionSuccess(null), 5000);
      setDeletingImage(null);
      await loadProductData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete image.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  // ── METADATA HANDLERS ─────────────────────────────────────────────────────
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !productId) return;
    if (!metaName.trim()) {
      setMetaError("Product name is required.");
      return;
    }

    setIsSavingMeta(true);
    setMetaError(null);
    try {
      await apiUpdateProduct(
        productId,
        {
          name: metaName.trim(),
          description: metaDescription.trim() || null,
          image_url: metaImageUrl.trim() || null,
          category_ids: metaCategoryIds,
        },
        token
      );
      setActionSuccess("Product metadata saved.");
      setTimeout(() => setActionSuccess(null), 5000);
      await loadProductData();
    } catch (err: any) {
      setMetaError(err?.message || "Failed to update product metadata.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setMetaCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (authLoading || (!product && isLoading)) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[var(--color-ink-muted)] tracking-widest uppercase">
            Loading entity configuration...
          </p>
        </div>
      </div>
    );
  }

  if (!product && !isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center justify-center gap-4 text-center p-4">
        <AlertCircle className="w-12 h-12 text-[var(--color-restricted-red)]" />
        <h2 className="font-fraunces text-2xl font-bold">Product Entity Not Found</h2>
        <p className="text-xs font-mono text-[var(--color-ink-muted)]">
          ID: {productId}
        </p>
        <Link
          href="/admin/products"
          className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold uppercase"
        >
          Return to Catalog
        </Link>
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
          <Link
            href="/admin/products"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Catalog
          </Link>
          <span className="text-[var(--color-rule-active)] font-mono text-xs">/</span>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-atelier-brass)] font-semibold truncate max-w-[200px]">
            {product?.name}
          </span>
        </div>

        {/* Global Admin Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 text-xs font-mono">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Boxes className="w-3.5 h-3.5" />
            Catalog
          </Link>
          <Link
            href="/admin/categories"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            Categories
          </Link>
          <Link
            href={`/products/${productId}`}
            target="_blank"
            className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-active)] transition-all flex items-center gap-1.5"
          >
            <span>Live View</span>
            <ExternalLink className="w-3.5 h-3.5" />
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

        {/* Product Overview Header Card */}
        <div className="p-6 rounded-xl bg-[var(--color-paper-card)] border border-[var(--color-rule)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {product?.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-[var(--color-ink-dim)]" />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[var(--color-atelier-brass)]/15 border border-[var(--color-atelier-brass)]/30 text-[var(--color-atelier-brass)] text-[10px] font-mono uppercase font-bold tracking-wider">
                  HARDWARE ENTITY
                </span>
                <span className="text-[11px] font-mono text-[var(--color-ink-dim)] select-all">
                  SKU: {product?.product_id.substring(0, 16)}
                </span>
              </div>

              <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[var(--color-ink)]">
                {product?.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {product?.categories.map((c) => (
                  <span
                    key={c.category_id}
                    className="px-2 py-0.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[10px] text-[var(--color-ink-muted)] font-mono"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs bg-[var(--color-paper-terminal)]/70 p-3.5 rounded-lg border border-[var(--color-rule)] w-full md:w-auto justify-around">
            <div className="flex flex-col items-center text-center">
              <span className="text-[var(--color-ink-dim)] text-[10px] uppercase">Variants</span>
              <span className="text-base font-bold text-[var(--color-terminal-cyan)]">
                {product?.variants.length || 0}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-[var(--color-rule)]" />
            <div className="flex flex-col items-center text-center">
              <span className="text-[var(--color-ink-dim)] text-[10px] uppercase">Specs</span>
              <span className="text-base font-bold text-[var(--color-atelier-brass)]">
                {specs.length}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-[var(--color-rule)]" />
            <div className="flex flex-col items-center text-center">
              <span className="text-[var(--color-ink-dim)] text-[10px] uppercase">Gallery</span>
              <span className="text-base font-bold text-[var(--color-terminal-green)]">
                {images.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--color-rule)] pb-px font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("variants")}
            className={`px-4 py-2.5 rounded-t-lg transition-all uppercase tracking-wider flex items-center gap-2 ${
              activeTab === "variants"
                ? "bg-[var(--color-paper-card)] border-t border-x border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-bold shadow-md"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]/40"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Variants ({product?.variants.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={`px-4 py-2.5 rounded-t-lg transition-all uppercase tracking-wider flex items-center gap-2 ${
              activeTab === "specs"
                ? "bg-[var(--color-paper-card)] border-t border-x border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-bold shadow-md"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]/40"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Technical Specs ({specs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2.5 rounded-t-lg transition-all uppercase tracking-wider flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-[var(--color-paper-card)] border-t border-x border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-bold shadow-md"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]/40"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gallery & Embeddings ({images.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("metadata")}
            className={`px-4 py-2.5 rounded-t-lg transition-all uppercase tracking-wider flex items-center gap-2 ${
              activeTab === "metadata"
                ? "bg-[var(--color-paper-card)] border-t border-x border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)] font-bold shadow-md"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)]/40"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Entity Metadata</span>
          </button>
        </div>

        {/* ── TAB 1: VARIANTS ──────────────────────────────────────────────── */}
        {activeTab === "variants" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  SKUs & Configured Variants
                </h3>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Models, colors, storage tiers, inventory pricing, and active status.
                </p>
              </div>

              <button
                onClick={openCreateVariantModal}
                className="px-3.5 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(212,163,115,0.25)] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            <div className="rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/60 text-[var(--color-ink-dim)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-medium">Model & Configuration</th>
                    <th className="py-3 px-4 font-medium">Unit Price</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium hidden sm:table-cell">Variant ID</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {product?.variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[var(--color-ink-dim)]">
                        <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        <span>No variants created yet. Click &ldquo;Add Variant&rdquo; to define models and prices.</span>
                      </td>
                    </tr>
                  ) : (
                    product?.variants.map((v) => (
                      <tr key={v.variant_id} className="hover:bg-[var(--color-paper-hover)]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                              {v.image_url ? (
                                <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-[var(--color-ink-dim)]" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--color-ink)]">
                                {v.model || "Standard Model"}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-muted)]">
                                {v.color && <span>Color: {v.color}</span>}
                                {v.storage && <span>· Storage: {v.storage}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-[var(--color-terminal-green)] text-sm">
                          ${parseFloat(String(v.price)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            v.status === "active"
                              ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                              : "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                          }`}>
                            {v.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 hidden sm:table-cell text-[11px] text-[var(--color-ink-dim)] select-all">
                          {v.variant_id.substring(0, 16)}...
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditVariantModal(v)}
                              className="px-2.5 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-atelier-brass)] transition-colors text-[11px] flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeletingVariant(v)}
                              className="px-2 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-colors text-[11px]"
                              title="Delete Variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: SPECS ─────────────────────────────────────────────────── */}
        {activeTab === "specs" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  Hardware Specifications
                </h3>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Key parameters for architectural comparison and technical documentation.
                </p>
              </div>

              <button
                onClick={openCreateSpecModal}
                className="px-3.5 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(212,163,115,0.25)] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Specification
              </button>
            </div>

            <div className="rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-terminal)]/60 text-[var(--color-ink-dim)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-medium w-1/3">Parameter Name</th>
                    <th className="py-3 px-4 font-medium">Specification Value</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {specs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-[var(--color-ink-dim)]">
                        <Cpu className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        <span>No specifications defined yet.</span>
                      </td>
                    </tr>
                  ) : (
                    specs.map((s) => (
                      <tr key={s.spec_product_id} className="hover:bg-[var(--color-paper-hover)]/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--color-atelier-brass)]">
                          {s.spec_name}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-ink)]">
                          {s.spec_value}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditSpecModal(s)}
                              className="px-2.5 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-atelier-brass)] transition-colors text-[11px]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingSpec(s)}
                              className="px-2 py-1 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-restricted-red)] hover:border-[var(--color-restricted-red)]/50 transition-colors text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: IMAGE GALLERY & VECTORS ───────────────────────────────── */}
        {activeTab === "gallery" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                  Visual Image Assets & Embeddings
                </h3>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">
                  Product gallery, primary cover selector, and 512-dimensional CLIP visual vectors.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewImageUrl("");
                  setNewImageVariantId("");
                  setNewImageIsPrimary(false);
                  setImageError(null);
                  setIsImageModalOpen(true);
                }}
                className="px-3.5 py-2 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(212,163,115,0.25)] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Upload Image
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.length === 0 ? (
                <div className="col-span-full py-16 text-center text-[var(--color-ink-dim)] rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <ImageIcon className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <span>No gallery images uploaded yet.</span>
                </div>
              ) : (
                images.map((img) => (
                  <div
                    key={img.image_id}
                    className={`relative rounded-xl bg-[var(--color-paper-card)] border overflow-hidden flex flex-col justify-between group transition-all ${
                      img.is_primary
                        ? "border-[var(--color-atelier-brass)] shadow-[0_0_15px_rgba(212,163,115,0.2)]"
                        : "border-[var(--color-rule)] hover:border-[var(--color-rule-active)]"
                    }`}
                  >
                    {/* Primary Badge */}
                    {img.is_primary && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-current" />
                        PRIMARY COVER
                      </span>
                    )}

                    {/* Image Box */}
                    <div className="w-full h-48 bg-[var(--color-paper-terminal)] flex items-center justify-center overflow-hidden">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>

                    {/* Meta Footer */}
                    <div className="p-3 bg-[var(--color-paper-terminal)]/90 border-t border-[var(--color-rule)] flex flex-col gap-2 font-mono text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-ink-dim)]">
                        <span>
                          {img.variant_id ? "Variant Bound" : "General Product"}
                        </span>
                        <span className="text-[var(--color-terminal-cyan)]">
                          {img.has_embedding ? "⚡ Vector Indexed" : "Standard Image"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--color-rule)]/50">
                        {!img.is_primary ? (
                          <button
                            onClick={() => handleTogglePrimaryImage(img)}
                            className="text-[10px] text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                          >
                            <Star className="w-3 h-3" />
                            <span>Set Primary</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--color-atelier-brass)] font-semibold">
                            ★ Primary Active
                          </span>
                        )}

                        <button
                          onClick={() => setDeletingImage(img)}
                          className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] transition-colors"
                          title="Delete Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: METADATA ──────────────────────────────────────────────── */}
        {activeTab === "metadata" && (
          <div className="rounded-xl bg-[var(--color-paper-card)] border border-[var(--color-rule)] p-6 shadow-xl max-w-3xl">
            <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)] mb-1">
              General Product Information
            </h3>
            <p className="text-xs font-mono text-[var(--color-ink-muted)] mb-5">
              Update name, description, cover image, and category assignments.
            </p>

            {metaError && (
              <div className="p-3 mb-4 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{metaError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMetadata} className="flex flex-col gap-4 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Detailed Description
                </label>
                <textarea
                  rows={4}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Primary Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={metaImageUrl}
                    onChange={(e) => setMetaImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                  />
                  <label className="px-3 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && token) {
                          setIsUploadingMetaImage(true);
                          try {
                            const res = await apiUploadProductImage(file, token);
                            setMetaImageUrl(res.image_url);
                          } catch (err: any) {
                            setMetaError(err?.message || "Failed to upload image.");
                          } finally {
                            setIsUploadingMetaImage(false);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Taxonomy Categories
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)]">
                  {categories.map((c) => {
                    const isSelected = metaCategoryIds.includes(c.category_id);
                    return (
                      <button
                        type="button"
                        key={c.category_id}
                        onClick={() => toggleCategorySelection(c.category_id)}
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
                  type="submit"
                  disabled={isSavingMeta || isUploadingMetaImage}
                  className="px-5 py-2.5 rounded bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-[var(--color-paper-terminal)] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {isSavingMeta ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Entity...
                    </>
                  ) : (
                    "Save Product Metadata"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ── VARIANT MODAL ────────────────────────────────────────────────── */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                {editingVariant ? "Modify Product Variant" : "Add New SKU Variant"}
              </h2>
              <button onClick={() => setIsVariantModalOpen(false)} className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {variantError && (
              <div className="p-2.5 rounded bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono">
                {variantError}
              </div>
            )}

            <form onSubmit={handleSaveVariant} className="flex flex-col gap-3 text-xs font-mono">
              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Model / Tier Name</label>
                <input
                  type="text"
                  placeholder="e.g. M3 Max 16-core CPU"
                  value={variantModel}
                  onChange={(e) => setVariantModel(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-ink-muted)] uppercase">Color</label>
                  <input
                    type="text"
                    placeholder="Space Black"
                    value={variantColor}
                    onChange={(e) => setVariantColor(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-ink-muted)] uppercase">Storage</label>
                  <input
                    type="text"
                    placeholder="1TB SSD"
                    value={variantStorage}
                    onChange={(e) => setVariantStorage(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-ink-muted)] uppercase">Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3499.00"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] font-bold text-[var(--color-terminal-green)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-ink-muted)] uppercase">Status</label>
                  <select
                    value={variantStatus}
                    onChange={(e) => setVariantStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Variant Image</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={variantImageUrl}
                    onChange={(e) => setVariantImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                  />
                  <label className="px-3 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadVariantImage(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="px-4 py-2 rounded bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVariant}
                  className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold uppercase"
                >
                  {isSubmittingVariant ? "Saving..." : "Save Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE VARIANT MODAL ─────────────────────────────────────────── */}
      {deletingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-fraunces text-lg font-bold text-[var(--color-restricted-red)]">Delete Variant</h3>
            <p className="text-xs font-mono text-[var(--color-ink-muted)]">
              Are you sure you want to delete variant SKU <strong>{deletingVariant.model || deletingVariant.variant_id}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-rule)] font-mono text-xs">
              <button onClick={() => setDeletingVariant(null)} className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)]">Cancel</button>
              <button onClick={handleDeleteVariant} disabled={isDeletingVariant} className="px-3 py-1.5 rounded bg-[var(--color-restricted-red)] text-white font-bold">
                {isDeletingVariant ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SPEC MODAL ───────────────────────────────────────────────────── */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                {editingSpec ? "Edit Specification" : "Add Hardware Specification"}
              </h2>
              <button onClick={() => setIsSpecModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            {specError && <div className="p-2 rounded bg-[var(--color-restricted-red)]/10 text-[var(--color-restricted-red)] text-xs font-mono">{specError}</div>}

            <form onSubmit={handleSaveSpec} className="flex flex-col gap-3 text-xs font-mono">
              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Parameter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Bandwidth, Display"
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Specification Value *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 400 GB/s, 16.2-inch Liquid Retina XDR"
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-[var(--color-rule)]">
                <button type="button" onClick={() => setIsSpecModalOpen(false)} className="px-4 py-2 rounded bg-[var(--color-paper-sub)]">Cancel</button>
                <button type="submit" disabled={isSubmittingSpec} className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold">
                  {isSubmittingSpec ? "Saving..." : "Save Spec"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE SPEC MODAL ────────────────────────────────────────────── */}
      {deletingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-fraunces text-lg font-bold text-[var(--color-restricted-red)]">Delete Spec</h3>
            <p className="text-xs font-mono text-[var(--color-ink-muted)]">
              Delete specification <strong>{deletingSpec.spec_name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-rule)] font-mono text-xs">
              <button onClick={() => setDeletingSpec(null)} className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)]">Cancel</button>
              <button onClick={handleDeleteSpec} disabled={isDeletingSpec} className="px-3 py-1.5 rounded bg-[var(--color-restricted-red)] text-white font-bold">
                {isDeletingSpec ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GALLERY IMAGE UPLOAD MODAL ───────────────────────────────────── */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/50 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <h2 className="font-fraunces text-lg font-bold text-[var(--color-ink)]">
                Register Gallery Image Asset
              </h2>
              <button onClick={() => setIsImageModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            {imageError && <div className="p-2 rounded bg-[var(--color-restricted-red)]/10 text-[var(--color-restricted-red)] text-xs font-mono">{imageError}</div>}

            <form onSubmit={handleSaveGalleryImage} className="flex flex-col gap-3 text-xs font-mono">
              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Image URL *</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                  />
                  <label className="px-3 py-2 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadGalleryImage(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[var(--color-ink-muted)] uppercase">Attach to Variant (Optional)</label>
                <select
                  value={newImageVariantId}
                  onChange={(e) => setNewImageVariantId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                >
                  <option value="">General Product Image</option>
                  {product?.variants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {v.model || v.variant_id.substring(0, 8)} ({v.color || "Default"})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={newImageIsPrimary}
                  onChange={(e) => setNewImageIsPrimary(e.target.checked)}
                  className="rounded accent-[var(--color-atelier-brass)]"
                />
                <span>Set as primary cover image for catalog</span>
              </label>

              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-[var(--color-rule)]">
                <button type="button" onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded bg-[var(--color-paper-sub)]">Cancel</button>
                <button type="submit" disabled={isSubmittingImage || isUploadingGalleryImage} className="px-4 py-2 rounded bg-[var(--color-atelier-brass)] text-[var(--color-paper-terminal)] font-bold">
                  {isSubmittingImage ? "Saving..." : "Add Image"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE IMAGE MODAL ───────────────────────────────────────────── */}
      {deletingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[var(--color-paper-card)] border border-[var(--color-restricted-red)]/50 rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-fraunces text-lg font-bold text-[var(--color-restricted-red)]">Delete Gallery Image</h3>
            <p className="text-xs font-mono text-[var(--color-ink-muted)]">
              Permanently remove this image asset and its associated vector embedding?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-rule)] font-mono text-xs">
              <button onClick={() => setDeletingImage(null)} className="px-3 py-1.5 rounded bg-[var(--color-paper-sub)]">Cancel</button>
              <button onClick={handleDeleteImage} disabled={isDeletingImage} className="px-3 py-1.5 rounded bg-[var(--color-restricted-red)] text-white font-bold">
                {isDeletingImage ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
