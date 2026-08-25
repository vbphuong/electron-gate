const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// ── Generic JSON Request Helper ───────────────────────────────────────────────

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  fallbackErrMsg: string = "Request failed"
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `${fallbackErrMsg}: ${res.status}`);
  }
  return res.json();
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
  const res = await fetch(`${BACKEND_URL}/ingestion/documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to delete document: ${res.status}`);
  }
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
  const res = await fetch(`${BACKEND_URL}/carts/${cartId}/items/${variantId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to remove cart item: ${res.status}`);
  }
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
  const res = await fetch(
    `${BACKEND_URL}/products/${productId}/variants/${variantId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to delete variant: ${res.status}`);
  }
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
  const res = await fetch(`${BACKEND_URL}/addresses/${addressId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to delete address: ${res.status}`);
  }
}

export async function apiGetCountries(token: string): Promise<CountryRead[]> {
  return fetchJson<CountryRead[]>(
    "/countries",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch countries"
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
  const res = await fetch(`${BACKEND_URL}/orders/${orderId}/shipment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to fetch shipment: ${res.status}`);
  }
  return res.json();
}

export async function apiGetOrderPayment(
  orderId: string,
  token: string
): Promise<PaymentRead | null> {
  const res = await fetch(`${BACKEND_URL}/orders/${orderId}/payment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to fetch payment: ${res.status}`);
  }
  return res.json();
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
