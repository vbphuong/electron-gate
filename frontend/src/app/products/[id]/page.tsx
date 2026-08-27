"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiGetProductById,
  apiGetProductImages,
  apiGetMyCart,
  apiAddToCart,
  apiCreateVariant,
  apiUpdateVariant,
  apiDeleteVariant,
  apiUploadProductImage,
  type ProductRead,
  type ProductImageRead,
  type VariantBrief,
  type CartRead,
} from "@/app/lib/api";
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  Cpu,
  Shield,
  Layers,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Boxes,
  Minus,
  Plus,
  LogOut,
  X,
  Upload,
  ShieldCheck,
  Edit2,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Data states
  const [product, setProduct] = useState<ProductRead | null>(null);
  const [galleryImages, setGalleryImages] = useState<ProductImageRead[]>([]);
  const [cart, setCart] = useState<CartRead | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Variant & Purchase states
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Loading & Action states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [addToCartSuccess, setAddToCartSuccess] = useState<boolean>(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Admin Manage Variants Modal states
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [modalViewMode, setModalViewMode] = useState<"list" | "form">("list");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Variant Form inputs
  const [variantModel, setVariantModel] = useState<string>("");
  const [variantColor, setVariantColor] = useState<string>("");
  const [variantStorage, setVariantStorage] = useState<string>("");
  const [variantPrice, setVariantPrice] = useState<string>("");
  const [variantStatus, setVariantStatus] = useState<string>("active");
  const [variantImageUrl, setVariantImageUrl] = useState<string>("");
  const [isSavingVariant, setIsSavingVariant] = useState<boolean>(false);
  const [variantFormError, setVariantFormError] = useState<string | null>(null);
  const [isUploadingVariantImg, setIsUploadingVariantImg] = useState<boolean>(false);
  const [uploadVariantImgError, setUploadVariantImgError] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);

  const isAdmin = user?.role === "Admin";

  // Helper to determine display image for a specific variant or fallback to product cover
  const getVariantDisplayImage = useCallback(
    (
      variant: VariantBrief | undefined,
      currentProduct: ProductRead | null,
      images: ProductImageRead[]
    ): string | null => {
      if (variant?.image_url) return variant.image_url;
      if (variant?.variant_id) {
        const variantGalleryImg = images.find(
          (img) => img.variant_id === variant.variant_id
        );
        if (variantGalleryImg?.image_url) return variantGalleryImg.image_url;
      }
      const primaryImg = images.find((img) => img.is_primary)?.image_url;
      return primaryImg || currentProduct?.image_url || images[0]?.image_url || null;
    },
    []
  );

  // Load Product and Gallery Images
  const loadProductData = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [productData, imagesData] = await Promise.all([
        apiGetProductById(productId, token),
        apiGetProductImages(productId, token).catch(() => [] as ProductImageRead[]),
      ]);

      setProduct(productData);
      setGalleryImages(imagesData);

      // Auto-select first active variant if available and sync its image
      const activeVariant =
        productData.variants?.find((v) => v.status === "active") ||
        productData.variants?.[0];

      if (activeVariant) {
        setSelectedVariantId(activeVariant.variant_id);
        const targetImg = getVariantDisplayImage(activeVariant, productData, imagesData);
        setSelectedImage(targetImg);
      } else {
        const primaryImg = imagesData.find((img) => img.is_primary)?.image_url;
        setSelectedImage(primaryImg || productData.image_url || imagesData[0]?.image_url || null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load product specifications."
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId, token, getVariantDisplayImage]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Fetch cart
  const refreshCart = useCallback(async () => {
    if (!token) {
      setCart(null);
      return;
    }
    try {
      const userCart = await apiGetMyCart(token);
      setCart(userCart);
    } catch {
      setCart(null);
    }
  }, [token]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Selected variant computation
  const selectedVariant: VariantBrief | undefined = useMemo(() => {
    if (!product?.variants) return undefined;
    return product.variants.find((v) => v.variant_id === selectedVariantId);
  }, [product, selectedVariantId]);

  // Handle variant selection change — synchronously switches active image
  const handleSelectVariant = (variant: VariantBrief) => {
    setSelectedVariantId(variant.variant_id);
    const targetImg = getVariantDisplayImage(variant, product, galleryImages);
    if (targetImg) {
      setSelectedImage(targetImg);
    }
  };

  // Open Create Form Mode in Modal
  const openCreateForm = () => {
    setEditingVariantId(null);
    setVariantModel("");
    setVariantColor("");
    setVariantStorage("");
    setVariantPrice("");
    setVariantStatus("active");
    setVariantImageUrl("");
    setVariantFormError(null);
    setUploadVariantImgError(null);
    setModalViewMode("form");
  };

  // Open Edit Form Mode in Modal
  const openEditForm = (v: VariantBrief) => {
    setEditingVariantId(v.variant_id);
    setVariantModel(v.model || "");
    setVariantColor(v.color || "");
    setVariantStorage(v.storage || "");
    setVariantPrice(String(v.price));
    setVariantStatus(v.status || "active");
    setVariantImageUrl(v.image_url || "");
    setVariantFormError(null);
    setUploadVariantImgError(null);
    setModalViewMode("form");
  };

  // Handle direct image file upload for variant
  const handleVariantFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingVariantImg(true);
    setUploadVariantImgError(null);

    try {
      const res = await apiUploadProductImage(file, token);
      setVariantImageUrl(res.image_url);
    } catch (err) {
      setUploadVariantImgError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploadingVariantImg(false);
    }
  };

  // Handle Admin Variant Create/Update Submit
  const handleSaveVariantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setVariantFormError("Admin authorization required.");
      return;
    }

    const numPrice = parseFloat(variantPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setVariantFormError("Please specify a valid numeric price.");
      return;
    }

    setIsSavingVariant(true);
    setVariantFormError(null);

    try {
      if (editingVariantId) {
        // UPDATE (PUT)
        const updated = await apiUpdateVariant(
          productId,
          editingVariantId,
          {
            model: variantModel.trim() || null,
            color: variantColor.trim() || null,
            storage: variantStorage.trim() || null,
            price: numPrice,
            status: variantStatus,
            image_url: variantImageUrl.trim() || null,
          },
          token
        );
        setSuccessBanner(`Variant "${updated.model || "SKU"}" updated successfully.`);
      } else {
        // CREATE (POST)
        const created = await apiCreateVariant(
          productId,
          {
            model: variantModel.trim() || null,
            color: variantColor.trim() || null,
            storage: variantStorage.trim() || null,
            price: numPrice,
            status: variantStatus,
            image_url: variantImageUrl.trim() || null,
          },
          token
        );
        setSelectedVariantId(created.variant_id);
        setSuccessBanner(`Variant "${created.model || "SKU"}" created successfully.`);
      }

      setTimeout(() => setSuccessBanner(null), 4000);
      await loadProductData();
      setModalViewMode("list");
    } catch (err) {
      setVariantFormError(
        err instanceof Error ? err.message : "Failed to save variant."
      );
    } finally {
      setIsSavingVariant(false);
    }
  };

  // Handle Admin Delete Variant
  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete variant "${variantName}"?`)) {
      return;
    }

    setDeletingVariantId(variantId);
    try {
      await apiDeleteVariant(productId, variantId, token);
      setSuccessBanner(`Variant "${variantName}" deleted successfully.`);
      setTimeout(() => setSuccessBanner(null), 4000);

      await loadProductData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete variant");
    } finally {
      setDeletingVariantId(null);
    }
  };

  // Add to Cart handler
  const handleAddToCart = async () => {
    if (!token) {
      router.push("/login");
      return;
    }

    if (!selectedVariant) {
      setCartError("Please select a valid hardware variant.");
      return;
    }

    if (selectedVariant.status !== "active") {
      setCartError("This variant is currently inactive or out of stock.");
      return;
    }

    setIsAddingToCart(true);
    setCartError(null);
    setAddToCartSuccess(false);

    try {
      let targetCart = cart;
      if (!targetCart) {
        targetCart = await apiGetMyCart(token);
        setCart(targetCart);
      }

      if (!targetCart?.cart_id) {
        throw new Error("Unable to retrieve an active cart. Please try again.");
      }

      await apiAddToCart(
        targetCart.cart_id,
        selectedVariant.variant_id,
        quantity,
        token
      );

      setAddToCartSuccess(true);
      await refreshCart();
      setTimeout(() => setAddToCartSuccess(false), 4000);
    } catch (err) {
      setCartError(
        err instanceof Error ? err.message : "Failed to add item to cart"
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Combine product main image and gallery images for thumbnail strip
  const allImages = useMemo(() => {
    const urls: string[] = [];
    if (product?.image_url && !urls.includes(product.image_url)) {
      urls.push(product.image_url);
    }
    for (const g of galleryImages) {
      if (g.image_url && !urls.includes(g.image_url)) {
        urls.push(g.image_url);
      }
    }
    for (const v of product?.variants || []) {
      if (v.image_url && !urls.includes(v.image_url)) {
        urls.push(v.image_url);
      }
    }
    return urls;
  }, [product, galleryImages]);

  const totalCartCount = cart?.items?.length || 0;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background drafting grid */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />

      {/* Top Header */}
      

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
        {/* Breadcrumb Navigation & Admin Controls */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 hover:text-[var(--color-atelier-brass)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Hardware Registry</span>
            </Link>
            <span>/</span>
            {product?.categories?.[0] && (
              <>
                <span className="text-[var(--color-ink-muted)]">
                  {product.categories[0].name}
                </span>
                <span>/</span>
              </>
            )}
            <span className="text-[var(--color-ink)] font-semibold truncate max-w-[180px] sm:max-w-md">
              {product?.name || "Loading..."}
            </span>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setModalViewMode("list");
                setIsManageModalOpen(true);
              }}
              className="atelier-btn atelier-btn-ghost !py-1 !px-3 text-xs font-mono flex items-center gap-1.5 border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage Variants ({product?.variants?.length || 0})</span>
            </button>
          )}
        </div>

        {/* Success Alert Banner */}
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

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12 animate-pulse">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-full h-96 bg-[var(--color-paper-sub)] rounded-lg" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-20 bg-[var(--color-paper-sub)] rounded" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-6">
              <div className="h-6 bg-[var(--color-paper-sub)] rounded w-1/3" />
              <div className="h-10 bg-[var(--color-paper-sub)] rounded w-3/4" />
              <div className="h-24 bg-[var(--color-paper-sub)] rounded" />
              <div className="h-12 bg-[var(--color-paper-sub)] rounded" />
            </div>
          </div>
        ) : error || !product ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center atelier-plate border border-[var(--color-restricted-red)]/40 rounded bg-[var(--color-paper-sub)]">
            <AlertCircle className="w-12 h-12 text-[var(--color-restricted-red)] mb-3" />
            <h2 className="font-fraunces font-bold text-xl text-[var(--color-ink)] mb-2">
              Specification Unavailable
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono max-w-sm mb-6">
              {error || "Product specification not found in architecture registry."}
            </p>
            <Link
              href="/products"
              className="atelier-btn atelier-btn-primary !py-2 !px-4 text-xs font-mono"
            >
              ← Return to Catalog
            </Link>
          </div>
        ) : (
          /* Product Details Display */
          <div className="space-y-12">
            {/* Top Grid: Gallery + Purchasing Plate */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Left Column: Image Gallery & Previews */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Main Active Image Stage */}
                <div className="atelier-plate relative w-full h-[380px] sm:h-[480px] rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-terminal)] overflow-hidden flex items-center justify-center group shadow-sm">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={product.name}
                      className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[var(--color-ink-dim)]">
                      <Cpu className="w-16 h-16 mb-2 opacity-30 text-[var(--color-atelier-brass)]" />
                      <span className="font-mono text-xs uppercase tracking-widest opacity-60">
                        PRIMARY ARCHITECTURE PLATE
                      </span>
                    </div>
                  )}

                  {/* Top Floating Tag */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-paper)]/85 backdrop-blur-sm border border-[var(--color-rule)] font-mono text-[10px] text-[var(--color-ink)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
                    <span>ENCLAVE CERTIFIED</span>
                  </div>
                </div>

                {/* Thumbnails Strip */}
                {allImages.length > 1 && (
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {allImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedImage(imgUrl);
                          const matchingVariant = product.variants?.find(
                            (v) => v.image_url === imgUrl
                          );
                          if (matchingVariant && matchingVariant.status === "active") {
                            setSelectedVariantId(matchingVariant.variant_id);
                          }
                        }}
                        className={`w-20 h-20 rounded-lg border overflow-hidden shrink-0 transition-all bg-[var(--color-paper-terminal)] p-1 ${
                          selectedImage === imgUrl
                            ? "border-[var(--color-atelier-brass)] shadow-md ring-1 ring-[var(--color-atelier-brass)]"
                            : "border-[var(--color-rule)] hover:border-[var(--color-rule-active)] opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Angle ${idx + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Specification & Purchase Plate */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {product.categories?.map((cat) => (
                        <span
                          key={cat.category_id}
                          className="px-2 py-0.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)] uppercase text-[10px] font-semibold tracking-wider"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>

                    <span className="text-[10px] text-[var(--color-terminal-cyan)] font-mono">
                      ID: {product.product_id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)] mb-3">
                      {product.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] font-sans leading-relaxed">
                      {product.description ||
                        "Advanced secure compute architecture with integrated cryptographic acceleration and hardware isolation."}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--color-ink-dim)] uppercase block mb-0.5">
                        Unit Price
                      </span>
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--color-atelier-brass)]">
                        {selectedVariant
                          ? `$${Number(selectedVariant.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "No Active Variants"}
                      </div>
                    </div>

                    {selectedVariant && (
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            selectedVariant.status === "active"
                              ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                              : "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                          }`}
                        >
                          ● {selectedVariant.status === "active" ? "In Stock" : "Inactive / OOS"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Variant Selection (Model / Color / Storage) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-xs text-[var(--color-ink)] font-semibold uppercase tracking-wider">
                        Hardware Configurations ({product.variants?.length || 0})
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalViewMode("list");
                            setIsManageModalOpen(true);
                          }}
                          className="font-mono text-[11px] text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Manage Menu</span>
                        </button>
                      )}
                    </div>

                    {product.variants && product.variants.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {product.variants.map((v) => {
                          const isSelected = v.variant_id === selectedVariantId;
                          const isActive = v.status === "active";

                          return (
                            <div
                              key={v.variant_id}
                              className={`relative group/vcard p-3 rounded-lg border text-left transition-all font-mono text-xs flex flex-col justify-between ${
                                isSelected
                                  ? "bg-[var(--color-paper-card)] border-[var(--color-atelier-brass)] shadow-sm ring-1 ring-[var(--color-atelier-brass)]"
                                  : isActive
                                  ? "bg-[var(--color-paper-sub)] border-[var(--color-rule)] hover:border-[var(--color-rule-active)] opacity-90 hover:opacity-100"
                                  : "bg-[var(--color-paper-sub)]/50 border-[var(--color-rule)] opacity-40"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectVariant(v)}
                                disabled={!isActive}
                                className="w-full text-left flex items-start gap-2.5"
                              >
                                {v.image_url ? (
                                  <div className="w-11 h-11 rounded border border-[var(--color-rule)] overflow-hidden shrink-0 bg-[var(--color-paper-terminal)] p-0.5">
                                    <img
                                      src={v.image_url}
                                      alt={v.model || "variant"}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-11 h-11 rounded border border-[var(--color-rule)] flex items-center justify-center shrink-0 bg-[var(--color-paper-terminal)] text-[var(--color-ink-dim)]">
                                    <Cpu className="w-4 h-4 opacity-40" />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5 pr-6">
                                    <span className="font-bold text-[var(--color-ink)] truncate">
                                      {v.model || "Standard Edition"}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-[var(--color-atelier-brass)] shrink-0 ml-1" />
                                    )}
                                  </div>

                                  <div className="text-[10px] text-[var(--color-ink-dim)] space-x-2 truncate">
                                    {v.color && <span>{v.color}</span>}
                                    {v.storage && <span>· {v.storage}</span>}
                                  </div>

                                  <div className="mt-1 text-xs font-bold text-[var(--color-terminal-cyan)]">
                                    ${Number(v.price).toFixed(2)}
                                  </div>
                                </div>
                              </button>

                              {/* Admin quick edit button overlay */}
                              {isAdmin && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover/vcard:opacity-100 transition-opacity flex items-center gap-1 bg-[var(--color-paper-card)] p-0.5 rounded border border-[var(--color-rule)] shadow-sm">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEditForm(v);
                                      setIsManageModalOpen(true);
                                    }}
                                    className="p-1 hover:text-[var(--color-atelier-brass)] text-[var(--color-ink-dim)]"
                                    title="Edit Variant"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteVariant(
                                        v.variant_id,
                                        `${v.model || ""} ${v.color || ""} ${v.storage || ""}`.trim() || "SKU"
                                      )
                                    }
                                    className="p-1 hover:text-[var(--color-restricted-red)] text-[var(--color-ink-dim)]"
                                    title="Delete Variant"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] font-mono text-xs text-[var(--color-ink-dim)] text-center">
                        No hardware variants configured for this product yet.
                        {isAdmin && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                openCreateForm();
                                setIsManageModalOpen(true);
                              }}
                              className="atelier-btn atelier-btn-primary !py-1 !px-3 text-xs font-mono inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Create First Variant</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Add to Cart Controls */}
                  <div className="space-y-4 pt-2">
                    {cartError && (
                      <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{cartError}</span>
                      </div>
                    )}

                    {addToCartSuccess && (
                      <div className="p-3 bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] text-xs font-mono rounded flex items-center justify-between animate-fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Added to Cart successfully!</span>
                        </div>
                        <Link
                          href="/cart"
                          className="underline hover:text-[var(--color-ink)] font-bold ml-3"
                        >
                          View Cart →
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[var(--color-rule)] rounded bg-[var(--color-paper-sub)] h-11">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1 || selectedVariant?.status !== "active"}
                          className="px-3 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 font-mono text-xs font-bold text-[var(--color-ink)] min-w-[28px] text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          disabled={selectedVariant?.status !== "active"}
                          className="px-3 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={
                          isAddingToCart ||
                          !selectedVariant ||
                          selectedVariant.status !== "active"
                        }
                        className="flex-1 h-11 atelier-btn atelier-btn-primary text-xs font-mono flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAddingToCart ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Adding to Cart...</span>
                          </>
                        ) : selectedVariant?.status !== "active" ? (
                          <span>Variant Unavailable</span>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Assurance Plate */}
                <div className="mt-8 pt-6 border-t border-[var(--color-rule)] grid grid-cols-2 gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--color-terminal-green)] shrink-0" />
                    <span>Hardware Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--color-atelier-brass)] shrink-0" />
                    <span>Instant Provisioning</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Specifications & Hardware Architecture */}
            <section className="border-t border-[var(--color-rule)] pt-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)]">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-fraunces font-bold text-xl text-[var(--color-ink)]">
                  Hardware Specifications &amp; Architecture
                </h3>
              </div>

              {product.specs && product.specs.length > 0 ? (
                <div className="atelier-plate rounded-lg border border-[var(--color-rule)] overflow-hidden bg-[var(--color-paper-card)]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sub)] text-[var(--color-ink-dim)]">
                        <th className="p-3.5 font-medium uppercase text-[10px] w-1/3">
                          Specification Metric
                        </th>
                        <th className="p-3.5 font-medium uppercase text-[10px] w-2/3">
                          Architecture Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                      {product.specs.map((spec) => (
                        <tr
                          key={spec.spec_product_id}
                          className="hover:bg-[var(--color-paper-hover)] transition-colors"
                        >
                          <td className="p-3.5 font-semibold text-[var(--color-ink)]">
                            {spec.spec_name}
                          </td>
                          <td className="p-3.5 text-[var(--color-ink-muted)]">
                            {spec.spec_value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="atelier-plate p-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] font-mono text-xs text-[var(--color-ink-dim)] text-center">
                  Standard enterprise specification applies. Detailed data sheets available via API.
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Admin Manage Variants Modal (Add, Edit, Delete) */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate relative w-full max-w-2xl bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] rounded-lg shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)]">
                    {modalViewMode === "list"
                      ? "Manage Hardware Variants"
                      : editingVariantId
                      ? "Edit Hardware Variant"
                      : "Create New Hardware Variant"}
                  </h3>
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                    ADMIN PRIVILEGES // /products/{productId.slice(0, 8)}.../variants
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-sub)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB / VIEW 1: Variants List Table */}
            {modalViewMode === "list" && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[var(--color-ink-dim)]">
                    Current Variants ({product?.variants?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs font-mono flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Variant</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-terminal)]">
                  {product?.variants && product.variants.length > 0 ? (
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sub)] text-[var(--color-ink-dim)] text-[10px] uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Model / Finish</th>
                          <th className="p-3">Storage</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                        {product.variants.map((v) => (
                          <tr key={v.variant_id} className="hover:bg-[var(--color-paper-hover)] transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-[var(--color-ink)]">{v.model || "Standard"}</div>
                              {v.color && <div className="text-[10px] text-[var(--color-ink-dim)]">{v.color}</div>}
                            </td>
                            <td className="p-3 text-[var(--color-ink-muted)]">{v.storage || "—"}</td>
                            <td className="p-3 font-bold text-[var(--color-terminal-cyan)]">
                              ${Number(v.price).toFixed(2)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  v.status === "active"
                                    ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                                    : "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                                }`}
                              >
                                {v.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(v)}
                                  className="p-1.5 rounded hover:bg-[var(--color-paper-sub)] text-[var(--color-ink-dim)] hover:text-[var(--color-atelier-brass)] transition-colors"
                                  title="Edit Variant"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteVariant(
                                      v.variant_id,
                                      `${v.model || ""} ${v.color || ""} ${v.storage || ""}`.trim() || "SKU"
                                    )
                                  }
                                  disabled={deletingVariantId === v.variant_id}
                                  className="p-1.5 rounded hover:bg-[var(--color-paper-sub)] text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] transition-colors disabled:opacity-30"
                                  title="Delete Variant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
                      <Boxes className="w-8 h-8 opacity-30 mx-auto" />
                      <p>No variants registered for this product.</p>
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="atelier-btn atelier-btn-primary !py-1 !px-3 text-xs font-mono mt-2"
                      >
                        Add First Variant
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--color-rule)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(false)}
                    className="atelier-btn atelier-btn-ghost !py-1.5 !px-4 text-xs font-mono"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* TAB / VIEW 2: Create / Edit Form */}
            {modalViewMode === "form" && (
              <form onSubmit={handleSaveVariantSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                {/* Form Error */}
                {variantFormError && (
                  <div className="p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{variantFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Model */}
                  <div>
                    <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                      Model Edition
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. iPhone 16 Pro Max, M3 Max"
                      value={variantModel}
                      onChange={(e) => setVariantModel(e.target.value)}
                      className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Color / Finish */}
                  <div>
                    <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                      Color / Finish
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Natural Titanium, Desert Titanium"
                      value={variantColor}
                      onChange={(e) => setVariantColor(e.target.value)}
                      className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Storage / Capacity */}
                  <div>
                    <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                      Storage / Memory Spec
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 128GB, 256GB, 1TB, 36GB RAM"
                      value={variantStorage}
                      onChange={(e) => setVariantStorage(e.target.value)}
                      className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                      <span>Base Unit Price ($ USD)</span> <span className="text-[var(--color-atelier-brass)]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 1099.00"
                      value={variantPrice}
                      onChange={(e) => setVariantPrice(e.target.value)}
                      className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-mono text-[var(--color-ink)] mb-1">
                    Availability Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="variantStatus"
                        value="active"
                        checked={variantStatus === "active"}
                        onChange={() => setVariantStatus("active")}
                        className="accent-[var(--color-terminal-green)]"
                      />
                      <span className="text-[var(--color-terminal-green)] font-semibold">
                        Active / In Stock
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="variantStatus"
                        value="inactive"
                        checked={variantStatus === "inactive"}
                        onChange={() => setVariantStatus("inactive")}
                        className="accent-[var(--color-restricted-red)]"
                      />
                      <span className="text-[var(--color-ink-dim)]">
                        Inactive / Out of Stock
                      </span>
                    </label>
                  </div>
                </div>

                {/* Variant Image */}
                <div>
                  <label className="block text-xs font-mono text-[var(--color-ink)] mb-1.5 flex items-center justify-between">
                    <span>Variant Finish Photo</span>
                    <span className="text-[10px] text-[var(--color-ink-dim)]">Direct Upload or CDN URL</span>
                  </label>

                  {uploadVariantImgError && (
                    <div className="mb-2 p-2 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-[11px] font-mono rounded">
                      {uploadVariantImgError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="manage-variant-file"
                      className="border border-dashed border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] rounded p-2.5 flex items-center justify-between cursor-pointer transition-colors bg-[var(--color-paper-terminal)] group"
                    >
                      <div className="flex items-center gap-2">
                        {isUploadingVariantImg ? (
                          <RefreshCw className="w-4 h-4 text-[var(--color-atelier-brass)] animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 text-[var(--color-atelier-brass)] group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-mono text-xs text-[var(--color-ink)]">
                          {isUploadingVariantImg ? "Uploading image..." : "Upload Finish Photo"}
                        </span>
                      </div>
                      {variantImageUrl && (
                        <span className="text-[10px] font-mono text-[var(--color-terminal-green)] px-2 py-0.5 rounded bg-[var(--color-terminal-green)]/10 border border-[var(--color-terminal-green)]/30">
                          Attached
                        </span>
                      )}
                      <input
                        id="manage-variant-file"
                        type="file"
                        accept="image/*"
                        onChange={handleVariantFileUpload}
                        disabled={isUploadingVariantImg}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Or paste image URL (e.g. https://...)"
                        value={variantImageUrl}
                        onChange={(e) => setVariantImageUrl(e.target.value)}
                        className="flex-1 bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded px-3 py-2 text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] transition-colors"
                      />
                      {variantImageUrl && (
                        <div className="w-8 h-8 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0">
                          <img
                            src={variantImageUrl}
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

                {/* Form Actions */}
                <div className="pt-4 border-t border-[var(--color-rule)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalViewMode("list")}
                    disabled={isSavingVariant}
                    className="atelier-btn atelier-btn-ghost !py-2 !px-4 text-xs font-mono"
                  >
                    Back to List
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingVariant}
                    className="atelier-btn atelier-btn-primary !py-2 !px-5 text-xs font-mono flex items-center gap-2"
                  >
                    {isSavingVariant ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Variant...</span>
                      </>
                    ) : editingVariantId ? (
                      <span>Save Changes →</span>
                    ) : (
                      <span>Create Variant →</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE SPECIFICATION SHEET · NODE ENCLAVE</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}
