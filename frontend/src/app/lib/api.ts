const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// ── Generic JSON Request Helper ───────────────────────────────────────────────

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  fallbackErrMsg: string = "Request failed",
  options?: { allow404AsNull?: boolean }
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    if (options?.allow404AsNull && res.status === 404) {
      return null as unknown as T;
    }
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `${fallbackErrMsg}: ${res.status}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }
  return res.json().catch(() => undefined as unknown as T);
}

// ── Authentication & Identity ────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  return fetchJson<LoginResponse>(
    "/auth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    },
    "Login failed"
  );
}

export async function apiGetMe(token: string): Promise<UserInfo> {
  return fetchJson<UserInfo>(
    "/auth/me",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch user info"
  );
}

// ── Document Ingestion & RAG ─────────────────────────────────────────────────

export interface DocumentUploadResponse {
  document_id: string;
  uploaded_by?: string | null;
  file_name: string;
  file_type?: string | null;
  file_path: string;
  total_page: number;
  total_chunk: number;
  private: boolean;
}

export async function apiUploadDocument(
  file: File,
  isPrivate: boolean = false,
  token: string,
  onProgress?: (progress: number) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${BACKEND_URL}/ingestion/upload`);
  if (isPrivate) {
    url.searchParams.append("is_private", "true");
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url.toString());
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.min(Math.round((event.loaded / event.total) * 85), 85);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(res);
        } catch {
          resolve({
            document_id: "simulated-" + Date.now(),
            file_name: file.name,
            file_path: "storage/" + file.name,
            total_page: 1,
            total_chunk: 1,
            private: isPrivate,
          });
        }
      } else {
        let errorMsg = `Upload failed with status ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.detail) {
            errorMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
          }
        } catch {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload. Check backend connection."));
    };

    xhr.send(formData);
  });
}

export async function apiGetDocuments(
  token: string
): Promise<DocumentUploadResponse[]> {
  return fetchJson<DocumentUploadResponse[]>(
    "/ingestion/documents",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch documents"
  );
}

export async function apiGetDocumentById(
  documentId: string,
  token: string
): Promise<DocumentUploadResponse> {
  return fetchJson<DocumentUploadResponse>(
    `/ingestion/documents/${documentId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    `Failed to fetch document ${documentId}`
  );
}

export async function apiDeleteDocument(
  documentId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/ingestion/documents/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete document"
  );
}

export interface SourceChunk {
  content: string;
  score?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface RAGQueryRequest {
  query: string;
  document_id?: string | null;
  document_ids?: string[] | null;
  use_multi_query?: boolean;
  top_k?: number;
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  sources: SourceChunk[];
}

export interface RAGSearchRequest {
  query: string;
  document_id?: string | null;
  document_ids?: string[] | null;
  top_k?: number;
}

export interface RAGSearchResponse {
  query: string;
  total_results: number;
  results: SourceChunk[];
}

export async function apiRAGQuery(
  request: RAGQueryRequest,
  token: string
): Promise<RAGQueryResponse> {
  return fetchJson<RAGQueryResponse>(
    "/rag/query",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    },
    "RAG query failed"
  );
}

export async function apiRAGSearch(
  request: RAGSearchRequest,
  token: string
): Promise<RAGSearchResponse> {
  return fetchJson<RAGSearchResponse>(
    "/rag/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    },
    "RAG search failed"
  );
}

// ── E-Commerce & Product Browsing ─────────────────────────────────────────────

export interface CategoryBrief {
  category_id: string;
  name: string;
}

export interface Category {
  category_id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
}

export interface ProductListItem {
  product_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  categories: CategoryBrief[];
  variant_count: number;
}

export interface VariantBrief {
  variant_id: string;
  model?: string | null;
  color?: string | null;
  storage?: string | null;
  price: number | string;
  status: string;
  image_url?: string | null;
}

export interface SpecBrief {
  spec_product_id: string;
  spec_name: string;
  spec_value: string;
}

export interface ProductRead {
  product_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  categories: CategoryBrief[];
  variants: VariantBrief[];
  specs: SpecBrief[];
}

export interface VisualSearchResultItem {
  product_id: string;
  product_name: string;
  product_description?: string | null;
  matched_image_id: string;
  matched_image_url: string;
  variant_id?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
  variant_price?: number | null;
  similarity_score: number;
}

export interface ProductImageRead {
  image_id: string;
  product_id: string;
  variant_id?: string | null;
  image_url: string;
  is_primary: boolean;
  has_embedding?: boolean;
  created_at?: string | null;
}

export interface CartItemBrief {
  variant_id: string;
  quantity: number;
  unit_price: number | string;
  is_selected: boolean;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
  variant_storage?: string | null;
  variant_image_url?: string | null;
}

export interface CartRead {
  cart_id: string;
  user_id: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  items: CartItemBrief[];
}

export async function apiGetProducts(
  token?: string | null,
  categoryId?: string | null,
  search?: string | null
): Promise<ProductListItem[]> {
  const url = new URL(`${BACKEND_URL}/products`);
  if (categoryId) url.searchParams.append("category_id", categoryId);
  if (search) url.searchParams.append("search", search);

  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<ProductListItem[]>(url.toString(), { headers }, "Failed to fetch products");
}

export async function apiGetCategories(token?: string | null): Promise<Category[]> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<Category[]>("/categories", { headers }, "Failed to fetch categories");
}

export interface CategoryCreatePayload {
  name: string;
}

export interface CategoryUpdatePayload {
  name?: string;
}

export async function apiCreateCategory(
  payload: CategoryCreatePayload,
  token: string
): Promise<Category> {
  return fetchJson<Category>(
    "/categories",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create category"
  );
}

export async function apiUpdateCategory(
  categoryId: string,
  payload: CategoryUpdatePayload,
  token: string
): Promise<Category> {
  return fetchJson<Category>(
    `/categories/${categoryId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update category"
  );
}

export async function apiDeleteCategory(
  categoryId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/categories/${categoryId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete category"
  );
}


export async function apiGetProductById(
  productId: string,
  token?: string | null
): Promise<ProductRead> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<ProductRead>(`/products/${productId}`, { headers }, "Failed to fetch product");
}

export async function apiSearchProductsByImage(
  embedding: number[],
  token?: string | null,
  options?: { top_k?: number; min_similarity?: number; category_id?: string }
): Promise<VisualSearchResultItem[]> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<VisualSearchResultItem[]>(
    "/products/search-by-image",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        embedding,
        top_k: options?.top_k ?? 10,
        min_similarity: options?.min_similarity ?? 0.5,
        category_id: options?.category_id ?? null,
      }),
    },
    "Visual search failed"
  );
}

/**
 * Send a raw image file to the backend for server-side YOLO detection +
 * SigLIP encoding + pgvector search.
 *
 * This replaces the old client-side fake-vector approach.
 */
export async function apiVisualSearchByFile(
  file: File,
  token?: string | null,
  options?: { top_k?: number; min_similarity?: number; category_id?: string }
): Promise<VisualSearchResultItem[]> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("top_k", String(options?.top_k ?? 8));
  formData.append("min_similarity", String(options?.min_similarity ?? 0.0));
  if (options?.category_id) {
    formData.append("category_id", options.category_id);
  }

  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // NOTE: Do NOT set Content-Type — browser sets it automatically with boundary for multipart/form-data

  return fetchJson<VisualSearchResultItem[]>(
    "/visual-search/encode-and-search",
    {
      method: "POST",
      headers,
      body: formData,
    },
    "Visual search failed"
  );
}

export async function apiGetMyCart(token: string): Promise<CartRead> {
  return fetchJson<CartRead>(
    "/carts/me",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch cart"
  );
}

export interface ProductCreatePayload {
  name: string;
  description?: string | null;
  image_url?: string | null;
  category_ids?: string[];
}

export async function apiCreateProduct(
  payload: ProductCreatePayload,
  token: string
): Promise<ProductRead> {
  return fetchJson<ProductRead>(
    "/products",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create product"
  );
}

export interface ImageUploadResponse {
  image_url: string;
  file_name: string;
}

export async function apiUploadProductImage(
  file: File,
  token: string
): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return fetchJson<ImageUploadResponse>(
    "/products/upload-image",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
    "Failed to upload image"
  );
}

export async function apiGetProductImages(
  productId: string,
  token?: string | null
): Promise<ProductImageRead[]> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<ProductImageRead[]>(
    `/products/${productId}/images`,
    { headers },
    "Failed to fetch product images"
  );
}

export async function apiAddToCart(
  cartId: string,
  variantId: string,
  quantity: number = 1,
  token: string
): Promise<CartItemBrief> {
  return fetchJson<CartItemBrief>(
    `/carts/${cartId}/items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ variant_id: variantId, quantity }),
    },
    "Failed to add item to cart"
  );
}

export interface CartItemUpdatePayload {
  quantity?: number;
  is_selected?: boolean;
}

export async function apiUpdateCartItem(
  cartId: string,
  variantId: string,
  payload: CartItemUpdatePayload,
  token: string
): Promise<CartItemBrief> {
  return fetchJson<CartItemBrief>(
    `/carts/${cartId}/items/${variantId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update cart item"
  );
}

export async function apiDeleteCartItem(
  cartId: string,
  variantId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/carts/${cartId}/items/${variantId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to remove cart item"
  );
}

export interface VariantCreatePayload {
  model?: string | null;
  color?: string | null;
  storage?: string | null;
  price: number;
  status?: string;
  image_url?: string | null;
}

export async function apiCreateVariant(
  productId: string,
  payload: VariantCreatePayload,
  token: string
): Promise<VariantBrief> {
  return fetchJson<VariantBrief>(
    `/products/${productId}/variants`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create variant"
  );
}

export interface VariantUpdatePayload {
  model?: string | null;
  color?: string | null;
  storage?: string | null;
  price?: number | null;
  status?: string | null;
  image_url?: string | null;
}

export async function apiUpdateVariant(
  productId: string,
  variantId: string,
  payload: VariantUpdatePayload,
  token: string
): Promise<VariantBrief> {
  return fetchJson<VariantBrief>(
    `/products/${productId}/variants/${variantId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update variant"
  );
}

export async function apiDeleteVariant(
  productId: string,
  variantId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/products/${productId}/variants/${variantId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete variant"
  );
}

export interface ProductUpdatePayload {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  category_ids?: string[];
}

export async function apiUpdateProduct(
  productId: string,
  payload: ProductUpdatePayload,
  token: string
): Promise<ProductRead> {
  return fetchJson<ProductRead>(
    `/products/${productId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update product"
  );
}

export async function apiDeleteProduct(
  productId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/products/${productId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete product"
  );
}

export async function apiGetProductVariants(
  productId: string,
  token?: string | null
): Promise<VariantBrief[]> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<VariantBrief[]>(
    `/products/${productId}/variants`,
    { headers },
    "Failed to fetch variants"
  );
}

export interface ProductSpecRead {
  spec_product_id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
}

export interface ProductSpecCreatePayload {
  spec_name: string;
  spec_value: string;
}

export interface ProductSpecUpdatePayload {
  spec_name?: string;
  spec_value?: string;
}

export async function apiGetProductSpecs(
  productId: string,
  token?: string | null
): Promise<ProductSpecRead[]> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetchJson<ProductSpecRead[]>(
    `/products/${productId}/specs`,
    { headers },
    "Failed to fetch product specs"
  );
}

export async function apiCreateProductSpec(
  productId: string,
  payload: ProductSpecCreatePayload,
  token: string
): Promise<ProductSpecRead> {
  return fetchJson<ProductSpecRead>(
    `/products/${productId}/specs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create spec"
  );
}

export async function apiUpdateProductSpec(
  productId: string,
  specId: string,
  payload: ProductSpecUpdatePayload,
  token: string
): Promise<ProductSpecRead> {
  return fetchJson<ProductSpecRead>(
    `/products/${productId}/specs/${specId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update spec"
  );
}

export async function apiDeleteProductSpec(
  productId: string,
  specId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/products/${productId}/specs/${specId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete spec"
  );
}

export interface ProductImageCreatePayload {
  variant_id?: string | null;
  image_url: string;
  is_primary?: boolean;
  embedding?: number[] | null;
}

export interface ProductImageUpdatePayload {
  variant_id?: string | null;
  image_url?: string | null;
  is_primary?: boolean | null;
  embedding?: number[] | null;
}

export async function apiCreateProductImage(
  productId: string,
  payload: ProductImageCreatePayload,
  token: string
): Promise<ProductImageRead> {
  return fetchJson<ProductImageRead>(
    `/products/${productId}/images`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create product image"
  );
}

export async function apiUpdateProductImage(
  productId: string,
  imageId: string,
  payload: ProductImageUpdatePayload,
  token: string
): Promise<ProductImageRead> {
  return fetchJson<ProductImageRead>(
    `/products/${productId}/images/${imageId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update product image"
  );
}

export async function apiDeleteProductImage(
  productId: string,
  imageId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete product image"
  );
}


// ── Checkout & Address Types ──────────────────────────────────────────────────

export interface AddressRead {
  address_id: string;
  user_id: string;
  address_line: string;
  city_id: string;
  is_default: boolean;
  city_name?: string | null;
  postal_code?: string | null;
  country_name?: string | null;
}

export interface AddressCreatePayload {
  address_line: string;
  city_id: string;
  is_default?: boolean;
}

export interface CountryRead {
  country_id: string;
  country_name: string;
}

export interface CityRead {
  city_id: string;
  city_name: string;
  postal_code?: string | null;
  country_id: string;
  country_name?: string | null;
}

export interface CountryCreate {
  country_name: string;
}

export interface CountryUpdate {
  country_name?: string;
}

export interface CityCreate {
  city_name: string;
  postal_code?: string | null;
  country_id: string;
}

export interface CityUpdate {
  city_name?: string;
  postal_code?: string | null;
  country_id?: string;
}

export interface OrderItemBrief {
  order_item_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
  variant_storage?: string | null;
  variant_image_url?: string | null;
}

export interface OrderHistoryBrief {
  or_his_id: string;
  address_line: string;
  recipient_name: string;
  country_name: string;
  city_name: string;
  phone: string;
}

export interface OrderRead {
  order_id: string;
  user_id: string;
  shipping_address_id: string;
  order_number: string;
  order_status: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  created_at?: string | null;
  items: OrderItemBrief[];
  histories: OrderHistoryBrief[];
}

export interface PaymentRead {
  payment_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  paid_at?: string | null;
  created_at?: string | null;
}

// ── Checkout & Address APIs ───────────────────────────────────────────────────

export async function apiGetMyAddresses(token: string): Promise<AddressRead[]> {
  return fetchJson<AddressRead[]>(
    "/addresses/me",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch addresses"
  );
}

export async function apiCreateAddress(
  payload: AddressCreatePayload,
  token: string
): Promise<AddressRead> {
  return fetchJson<AddressRead>(
    "/addresses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create address"
  );
}

export interface AddressUpdatePayload {
  address_line?: string;
  city_id?: string;
  is_default?: boolean;
}

export async function apiUpdateAddress(
  addressId: string,
  payload: AddressUpdatePayload,
  token: string
): Promise<AddressRead> {
  return fetchJson<AddressRead>(
    `/addresses/${addressId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update address"
  );
}

export async function apiDeleteAddress(
  addressId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/addresses/${addressId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete address"
  );
}

export async function apiGetCountries(
  token: string,
  search?: string
): Promise<CountryRead[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetchJson<CountryRead[]>(
    `/countries${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch countries"
  );
}

export async function apiGetCountry(
  countryId: string,
  token: string
): Promise<CountryRead> {
  return fetchJson<CountryRead>(
    `/countries/${countryId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch country"
  );
}

export async function apiCreateCountry(
  data: CountryCreate,
  token: string
): Promise<CountryRead> {
  return fetchJson<CountryRead>(
    "/countries",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to create country"
  );
}

export async function apiUpdateCountry(
  countryId: string,
  data: CountryUpdate,
  token: string
): Promise<CountryRead> {
  return fetchJson<CountryRead>(
    `/countries/${countryId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to update country"
  );
}

export async function apiDeleteCountry(
  countryId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/countries/${countryId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete country"
  );
}

export async function apiGetCities(
  countryId: string,
  token: string
): Promise<CityRead[]> {
  return fetchJson<CityRead[]>(
    `/countries/${countryId}/cities`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch cities"
  );
}

export async function apiListCities(
  token: string,
  params?: { countryId?: string; search?: string }
): Promise<CityRead[]> {
  const queryParams = new URLSearchParams();
  if (params?.countryId) queryParams.set("country_id", params.countryId);
  if (params?.search) queryParams.set("search", params.search);
  const qStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return fetchJson<CityRead[]>(
    `/cities${qStr}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch cities"
  );
}

export async function apiGetCity(
  cityId: string,
  token: string
): Promise<CityRead> {
  return fetchJson<CityRead>(
    `/cities/${cityId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch city"
  );
}

export async function apiCreateCity(
  data: CityCreate,
  token: string
): Promise<CityRead> {
  return fetchJson<CityRead>(
    "/cities",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to create city"
  );
}

export async function apiUpdateCity(
  cityId: string,
  data: CityUpdate,
  token: string
): Promise<CityRead> {
  return fetchJson<CityRead>(
    `/cities/${cityId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to update city"
  );
}

export async function apiDeleteCity(
  cityId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/cities/${cityId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete city"
  );
}

export async function apiCheckout(
  shippingAddressId: string,
  token: string,
  paymentMethod?: string
): Promise<OrderRead> {
  return fetchJson<OrderRead>(
    "/orders/checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipping_address_id: shippingAddressId,
        payment_method: paymentMethod || "credit_card",
      }),
    },
    "Checkout failed"
  );
}

export async function apiGetOrderById(
  orderId: string,
  token: string
): Promise<OrderRead> {
  return fetchJson<OrderRead>(
    `/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch order"
  );
}

export interface OrderListItem {
  order_id: string;
  user_id: string;
  order_number: string;
  order_status: string;
  subtotal: number | string;
  shipping_fee: number | string;
  discount_amount: number | string;
  created_at?: string | null;
  item_count: number;
}

export interface OrderItemRead {
  order_item_id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number | string;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
  variant_storage?: string | null;
  variant_image_url?: string | null;
}

export interface OrderHistoryRead {
  or_his_id: string;
  order_id: string;
  address_line: string;
  recipient_name: string;
  country_name: string;
  city_name: string;
  phone: string;
}

export interface ShipmentRead {
  shipment_id: string;
  order_id: string;
  delivery_provider_id: string;
  delivery_provider_name?: string | null;
  tracking_number?: string | null;
  status: string;
  delivered_at?: string | null;
}

export async function apiGetOrders(
  token: string,
  options?: { userId?: string; status?: string }
): Promise<OrderListItem[]> {
  const url = new URL(`${BACKEND_URL}/orders`);
  if (options?.userId) url.searchParams.append("user_id", options.userId);
  if (options?.status) url.searchParams.append("status", options.status);

  return fetchJson<OrderListItem[]>(
    url.toString(),
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch orders"
  );
}

export async function apiGetOrderItems(
  orderId: string,
  token: string
): Promise<OrderItemRead[]> {
  return fetchJson<OrderItemRead[]>(
    `/orders/${orderId}/items`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch order items"
  );
}

export async function apiGetOrderHistory(
  orderId: string,
  token: string
): Promise<OrderHistoryRead[]> {
  return fetchJson<OrderHistoryRead[]>(
    `/orders/${orderId}/history`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch order tracking history"
  );
}

export async function apiGetOrderShipment(
  orderId: string,
  token: string
): Promise<ShipmentRead | null> {
  return fetchJson<ShipmentRead | null>(
    `/orders/${orderId}/shipment`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch shipment",
    { allow404AsNull: true }
  );
}

export async function apiGetOrderPayment(
  orderId: string,
  token: string
): Promise<PaymentRead | null> {
  return fetchJson<PaymentRead | null>(
    `/orders/${orderId}/payment`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch payment",
    { allow404AsNull: true }
  );
}

// ── Admin & Staff Operations APIs ──────────────────────────────────────────

export interface OrderUpdatePayload {
  order_status?: string;
  shipping_fee?: number;
  discount_amount?: number;
}

export interface OrderHistoryCreatePayload {
  address_line: string;
  recipient_name: string;
  city_name: string;
  country_name: string;
  phone: string;
}

export interface PaymentCreatePayload {
  order_id: string;
  payment_method: string;
  payment_status?: string;
  amount: number;
  paid_at?: string;
}

export interface PaymentUpdatePayload {
  payment_method?: string;
  payment_status?: string;
  amount?: number;
  paid_at?: string;
}

export interface ShipmentCreatePayload {
  order_id: string;
  delivery_provider_id: string;
  tracking_number?: string;
  status?: string;
}

export interface ShipmentUpdatePayload {
  delivery_provider_id?: string;
  tracking_number?: string;
  status?: string;
  delivered_at?: string;
}

export interface DeliveryProviderRead {
  provider_id: string;
  name: string;
  phone?: string | null;
  is_active: boolean;
}

export interface DeliveryProviderCreate {
  name: string;
  phone?: string | null;
  is_active?: boolean;
}

export interface DeliveryProviderUpdate {
  name?: string;
  phone?: string | null;
  is_active?: boolean;
}

export async function apiUpdateOrder(
  orderId: string,
  payload: OrderUpdatePayload,
  token: string
): Promise<OrderRead> {
  return fetchJson<OrderRead>(
    `/orders/${orderId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update order"
  );
}

export async function apiAddOrderHistory(
  orderId: string,
  payload: OrderHistoryCreatePayload,
  token: string
): Promise<OrderHistoryRead> {
  return fetchJson<OrderHistoryRead>(
    `/orders/${orderId}/history`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to append order history"
  );
}

export async function apiListPayments(
  token: string,
  options?: { order_id?: string; payment_status?: string }
): Promise<PaymentRead[]> {
  const query = new URLSearchParams();
  if (options?.order_id) query.append("order_id", options.order_id);
  if (options?.payment_status) query.append("payment_status", options.payment_status);

  const path = `/payments${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<PaymentRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to list payments"
  );
}

export async function apiCreatePayment(
  payload: PaymentCreatePayload,
  token: string
): Promise<PaymentRead> {
  return fetchJson<PaymentRead>(
    "/payments",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create payment"
  );
}

export async function apiUpdatePayment(
  paymentId: string,
  payload: PaymentUpdatePayload,
  token: string
): Promise<PaymentRead> {
  return fetchJson<PaymentRead>(
    `/payments/${paymentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update payment"
  );
}

export async function apiListShipments(
  token: string,
  options?: { order_id?: string; status?: string; provider_id?: string }
): Promise<ShipmentRead[]> {
  const query = new URLSearchParams();
  if (options?.order_id) query.append("order_id", options.order_id);
  if (options?.status) query.append("status", options.status);
  if (options?.provider_id) query.append("provider_id", options.provider_id);

  const path = `/shipments${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<ShipmentRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to list shipments"
  );
}

export async function apiCreateShipment(
  payload: ShipmentCreatePayload,
  token: string
): Promise<ShipmentRead> {
  return fetchJson<ShipmentRead>(
    "/shipments",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create shipment"
  );
}

export async function apiUpdateShipment(
  shipmentId: string,
  payload: ShipmentUpdatePayload,
  token: string
): Promise<ShipmentRead> {
  return fetchJson<ShipmentRead>(
    `/shipments/${shipmentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update shipment"
  );
}

export async function apiGetDeliveryProviders(
  token: string,
  isActive?: boolean
): Promise<DeliveryProviderRead[]> {
  const query = new URLSearchParams();
  if (isActive !== undefined) query.append("is_active", String(isActive));

  const path = `/delivery-providers${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<DeliveryProviderRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch delivery providers"
  );
}

export async function apiGetDeliveryProvider(
  providerId: string,
  token: string
): Promise<DeliveryProviderRead> {
  return fetchJson<DeliveryProviderRead>(
    `/delivery-providers/${providerId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch delivery provider"
  );
}

export async function apiCreateDeliveryProvider(
  data: DeliveryProviderCreate,
  token: string
): Promise<DeliveryProviderRead> {
  return fetchJson<DeliveryProviderRead>(
    "/delivery-providers",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to create delivery provider"
  );
}

export async function apiUpdateDeliveryProvider(
  providerId: string,
  data: DeliveryProviderUpdate,
  token: string
): Promise<DeliveryProviderRead> {
  return fetchJson<DeliveryProviderRead>(
    `/delivery-providers/${providerId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
    "Failed to update delivery provider"
  );
}

export async function apiDeleteDeliveryProvider(
  providerId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/delivery-providers/${providerId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete delivery provider"
  );
}

// ── People & Role Management APIs ──────────────────────────────────────────

export interface RoleRead {
  role_id: string;
  role_name: string;
}

export interface RoleCreatePayload {
  role_name: string;
}

export interface UserRead {
  user_id: string;
  email: string;
  role_id: string;
  role_name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  role_id?: string;
  role_name?: string;
}

export interface UserUpdatePayload {
  email?: string;
  password?: string;
  role_id?: string;
  role_name?: string;
}

export async function apiListRoles(token: string): Promise<RoleRead[]> {
  return fetchJson<RoleRead[]>(
    "/people/roles",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch roles"
  );
}

export async function apiCreateRole(
  payload: RoleCreatePayload,
  token: string
): Promise<RoleRead> {
  return fetchJson<RoleRead>(
    "/people/roles",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create role"
  );
}

export async function apiUpdateRole(
  roleId: string,
  payload: RoleCreatePayload,
  token: string
): Promise<RoleRead> {
  return fetchJson<RoleRead>(
    `/people/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update role"
  );
}

export async function apiDeleteRole(
  roleId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/people/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete role"
  );
}

export async function apiListUsers(token: string): Promise<UserRead[]> {
  return fetchJson<UserRead[]>(
    "/people/users",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch users"
  );
}

export async function apiCreateUser(
  payload: UserCreatePayload,
  token: string
): Promise<UserRead> {
  return fetchJson<UserRead>(
    "/people/users",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create user"
  );
}

export async function apiUpdateUser(
  userId: string,
  payload: UserUpdatePayload,
  token: string
): Promise<UserRead> {
  return fetchJson<UserRead>(
    `/people/users/${userId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update user"
  );
}

export async function apiDeleteUser(
  userId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/people/users/${userId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete user"
  );
}

// ── Inventory Management APIs (Section 11) ──────────────────────────────────

export interface InventoryLocationRead {
  location_id: string;
  name: string;
  type: string;
  address?: string | null;
}

export interface InventoryLocationCreatePayload {
  name: string;
  type: string;
  address?: string | null;
}

export interface InventoryLocationUpdatePayload {
  name?: string;
  type?: string;
  address?: string | null;
}

export async function apiListInventoryLocations(
  token: string,
  locationType?: string
): Promise<InventoryLocationRead[]> {
  const query = new URLSearchParams();
  if (locationType && locationType !== "all") query.append("type", locationType);
  const path = `/inventory/locations${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<InventoryLocationRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch inventory locations"
  );
}

export async function apiGetInventoryLocation(
  locationId: string,
  token: string
): Promise<InventoryLocationRead> {
  return fetchJson<InventoryLocationRead>(
    `/inventory/locations/${locationId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch location details"
  );
}

export async function apiCreateInventoryLocation(
  payload: InventoryLocationCreatePayload,
  token: string
): Promise<InventoryLocationRead> {
  return fetchJson<InventoryLocationRead>(
    "/inventory/locations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create inventory location"
  );
}

export async function apiUpdateInventoryLocation(
  locationId: string,
  payload: InventoryLocationUpdatePayload,
  token: string
): Promise<InventoryLocationRead> {
  return fetchJson<InventoryLocationRead>(
    `/inventory/locations/${locationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update inventory location"
  );
}

export async function apiDeleteInventoryLocation(
  locationId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/inventory/locations/${locationId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete inventory location"
  );
}

export interface InventoryStockRead {
  variant_id: string;
  location_id: string;
  qty_available: number;
  qty_reserved: number;
  location_name?: string | null;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
  variant_storage?: string | null;
}

export interface InventoryStockCreatePayload {
  variant_id: string;
  location_id: string;
  qty_available?: number;
  qty_reserved?: number;
}

export interface InventoryStockUpdatePayload {
  qty_available?: number;
  qty_reserved?: number;
}

export async function apiListInventoryStock(
  token: string,
  options?: { locationId?: string; variantId?: string; lowStock?: number }
): Promise<InventoryStockRead[]> {
  const query = new URLSearchParams();
  if (options?.locationId) query.append("location_id", options.locationId);
  if (options?.variantId) query.append("variant_id", options.variantId);
  if (options?.lowStock !== undefined && options.lowStock !== null) {
    query.append("low_stock", String(options.lowStock));
  }
  const path = `/inventory/stock${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<InventoryStockRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch inventory stock records"
  );
}

export async function apiGetInventoryStock(
  variantId: string,
  locationId: string,
  token: string
): Promise<InventoryStockRead> {
  return fetchJson<InventoryStockRead>(
    `/inventory/stock/${variantId}/${locationId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch stock item"
  );
}

export async function apiCreateInventoryStock(
  payload: InventoryStockCreatePayload,
  token: string
): Promise<InventoryStockRead> {
  return fetchJson<InventoryStockRead>(
    "/inventory/stock",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to initialize inventory stock"
  );
}


export async function apiUpdateInventoryStock(
  variantId: string,
  locationId: string,
  payload: InventoryStockUpdatePayload,
  token: string
): Promise<InventoryStockRead> {
  return fetchJson<InventoryStockRead>(
    `/inventory/stock/${variantId}/${locationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update inventory stock"
  );
}

export async function apiDeleteInventoryStock(
  variantId: string,
  locationId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/inventory/stock/${variantId}/${locationId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete inventory stock"
  );
}

export interface InventoryMovementRead {
  movement_id: string;
  variant_id: string;
  location_id: string;
  movement_type: "in" | "out" | "transfer" | "adjustment" | "return" | string;
  quantity: number;
  location_name?: string | null;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
}

export interface InventoryMovementCreatePayload {
  variant_id: string;
  location_id: string;
  movement_type: "in" | "out" | "transfer" | "adjustment" | "return" | string;
  quantity: number;
}

export async function apiListInventoryMovements(
  token: string,
  options?: { locationId?: string; variantId?: string; movementType?: string }
): Promise<InventoryMovementRead[]> {
  const query = new URLSearchParams();
  if (options?.locationId) query.append("location_id", options.locationId);
  if (options?.variantId) query.append("variant_id", options.variantId);
  if (options?.movementType && options.movementType !== "all") {
    query.append("movement_type", options.movementType);
  }
  const path = `/inventory/movements${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<InventoryMovementRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch inventory movements"
  );
}

export async function apiGetInventoryMovement(
  movementId: string,
  token: string
): Promise<InventoryMovementRead> {
  return fetchJson<InventoryMovementRead>(
    `/inventory/movements/${movementId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch movement details"
  );
}

export async function apiCreateInventoryMovement(
  payload: InventoryMovementCreatePayload,
  token: string
): Promise<InventoryMovementRead> {
  return fetchJson<InventoryMovementRead>(
    "/inventory/movements",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to record inventory movement"
  );
}

export async function apiDeleteInventoryMovement(
  movementId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/inventory/movements/${movementId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete inventory movement"
  );
}

export interface StockReservationRead {
  reservation_id: string;
  variant_id: string;
  location_id: string;
  cart_id: string;
  quantity: number;
  expires_at: string;
  status: "active" | "released" | "expired" | string;
  location_name?: string | null;
  product_name?: string | null;
  variant_model?: string | null;
  variant_color?: string | null;
}

export interface StockReservationCreatePayload {
  variant_id: string;
  location_id: string;
  cart_id: string;
  quantity: number;
  expires_at: string;
  status?: string;
}

export interface StockReservationUpdatePayload {
  quantity?: number;
  expires_at?: string;
  status?: string;
}

export async function apiListStockReservations(
  token: string,
  options?: { locationId?: string; variantId?: string; cartId?: string; status?: string }
): Promise<StockReservationRead[]> {
  const query = new URLSearchParams();
  if (options?.locationId) query.append("location_id", options.locationId);
  if (options?.variantId) query.append("variant_id", options.variantId);
  if (options?.cartId) query.append("cart_id", options.cartId);
  if (options?.status && options.status !== "all") query.append("status", options.status);
  const path = `/inventory/reservations${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchJson<StockReservationRead[]>(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch stock reservations"
  );
}

export async function apiGetStockReservation(
  reservationId: string,
  token: string
): Promise<StockReservationRead> {
  return fetchJson<StockReservationRead>(
    `/inventory/reservations/${reservationId}`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch stock reservation"
  );
}

export async function apiCreateStockReservation(
  payload: StockReservationCreatePayload,
  token: string
): Promise<StockReservationRead> {
  return fetchJson<StockReservationRead>(
    "/inventory/reservations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create stock reservation"
  );
}

export async function apiUpdateStockReservation(
  reservationId: string,
  payload: StockReservationUpdatePayload,
  token: string
): Promise<StockReservationRead> {
  return fetchJson<StockReservationRead>(
    `/inventory/reservations/${reservationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to update stock reservation"
  );
}

export async function apiDeleteStockReservation(
  reservationId: string,
  token: string
): Promise<void> {
  return fetchJson<void>(
    `/inventory/reservations/${reservationId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to delete stock reservation"
  );
}


