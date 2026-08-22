# 🛒 UserFlow — E-Commerce Web App

> Tài liệu này mô tả toàn bộ user journey từ góc nhìn frontend, dựa trên các backend endpoints đã implement. Mỗi flow chứa: màn hình cần xây dựng, API calls tương ứng, và ghi chú nghiệp vụ.

---

## 📋 Mục lục

1. [Auth Flow](#1-auth-flow)
2. [Product Browsing Flow](#2-product-browsing-flow)
3. [Cart Flow](#3-cart-flow)
4. [Checkout & Order Flow](#4-checkout--order-flow)
5. [Order Tracking Flow](#5-order-tracking-flow)
6. [User Account Flow](#6-user-account-flow)
7. [Admin — User & Role Management](#7-admin--user--role-management)
8. [Admin — Product Management](#8-admin--product-management)
9. [Admin/Staff — Order Management](#9-adminstaff--order-management)
10. [Admin/Staff — Payment & Shipment](#10-adminstaff--payment--shipment)
11. [Admin/Staff — Inventory Management](#11-adminstaff--inventory-management)
12. [Admin — Location Management](#12-admin--location-management)
13. [Admin — Delivery Provider Management](#13-admin--delivery-provider-management)
14. [Visual Search & Product Images Flow](#14-visual-search--product-images-flow)

---

## 1. Auth Flow

### 1.1 Đăng ký

**Màn hình:** `/register`

| Bước | Action | API |
|------|--------|-----|
| 1 | User nhập email + password | — |
| 2 | Submit | `POST /auth/register` |
| 3 | Thành công → redirect `/login` | — |

```json
// POST /auth/register
{ "email": "user@example.com", "password": "secret" }
```

---

### 1.2 Đăng nhập

**Màn hình:** `/login`

| Bước | Action | API |
|------|--------|-----|
| 1 | User nhập email + password | — |
| 2 | Submit | `POST /auth/token` |
| 3 | Lưu `access_token` vào localStorage / cookie | — |
| 4 | Redirect theo role: `User` → `/`, `Admin` → `/admin` | — |

```json
// POST /auth/token → Response
{ "access_token": "eyJ...", "token_type": "bearer" }
```

> **Lưu ý:** Mọi request sau đó đều gắn header `Authorization: Bearer <token>`.

---

### 1.3 Đăng xuất

| Bước | Action |
|------|--------|
| 1 | Xóa token khỏi localStorage |
| 2 | Redirect `/login` |

---

## 2. Product Browsing Flow

### 2.1 Trang danh sách sản phẩm

**Màn hình:** `/products`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load danh sách sản phẩm | `GET /products` |
| 2 | Load categories để filter | `GET /categories` |
| 3 | Filter theo category | `GET /products?category_id={id}` |
| 4 | Tìm kiếm theo tên | `GET /products?search={keyword}` |
| 5 | Click vào sản phẩm | → `/products/{product_id}` |

**Response fields dùng cho card:** `product_id`, `name`, `image_url`, `categories[]`, `variant_count`

---

### 2.2 Trang chi tiết sản phẩm

**Màn hình:** `/products/{product_id}`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load thông tin sản phẩm | `GET /products/{product_id}` |
| 2 | Load thư viện ảnh sản phẩm | `GET /products/{product_id}/images` |
| 3 | User chọn variant (model/color/storage) | — (từ `variants[]` trong response) |
| 4 | Hiện giá + nút "Thêm vào giỏ" | — |
| 5 | Click "Thêm vào giỏ" | `POST /carts/{cart_id}/items` |

> **Lưu ý:** Chỉ hiển thị variant có `status = "active"`. Disable nút nếu `inactive`.

---

## 3. Cart Flow

### 3.1 Xem giỏ hàng

**Màn hình:** `/cart`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load cart (auto-tạo nếu chưa có) | `GET /carts/me` |
| 2 | Hiển thị items | — (từ `items[]`) |
| 3 | Tick/bỏ tick item | `PUT /carts/{cart_id}/items/{variant_id}` `{"is_selected": true/false}` |
| 4 | Thay đổi số lượng | `PUT /carts/{cart_id}/items/{variant_id}` `{"quantity": N}` |
| 5 | Xóa 1 item | `DELETE /carts/{cart_id}/items/{variant_id}` |
| 6 | Tính tổng tiền items `is_selected=true` | — (tính ở frontend) |
| 7 | Click "Đặt hàng" | → Checkout Flow |

---

### 3.2 Badge số lượng cart (header)

| Action | API |
|--------|-----|
| Fetch sau login | `GET /carts/me` |
| Hiển thị `items.length` | — |

---

## 4. Checkout & Order Flow

### 4.1 Trang Checkout

**Màn hình:** `/checkout`

| Bước | Action | API |
|------|--------|-----|
| 1 | Hiện items `is_selected=true` | — (từ cart state) |
| 2 | Load địa chỉ giao hàng | `GET /addresses/me` |
| 3 | Thêm địa chỉ mới (nếu cần) | `POST /addresses` |
| 4 | Load quốc gia | `GET /countries` |
| 5 | Load thành phố | `GET /cities?country_id={id}` |
| 6 | Xác nhận đặt hàng | `POST /orders/checkout` `{"shipping_address_id": "..."}` |
| 7 | Thành công | → `/orders/{order_id}/confirm` |

> **Nghiệp vụ tự động (backend):**
> - Lấy items `is_selected=true` từ cart active
> - Tính `subtotal`
> - Snapshot địa chỉ → `OrderHistory`
> - Xóa items đã checkout khỏi cart

---

### 4.2 Trang xác nhận đơn hàng

**Màn hình:** `/orders/{order_id}/confirm`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load chi tiết đơn | `GET /orders/{order_id}` |
| 2 | Hiển thị order number, items, subtotal, địa chỉ | — |
| 3 | Xem thông tin thanh toán (nếu có) | `GET /orders/{order_id}/payment` |

---

## 5. Order Tracking Flow

### 5.1 Danh sách đơn hàng

**Màn hình:** `/account/orders`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load đơn hàng của mình | `GET /orders` |
| 2 | Hiển thị: order_number, status, subtotal, ngày tạo | — |
| 3 | Click đơn | → `/account/orders/{order_id}` |

---

### 5.2 Chi tiết đơn hàng + Tracking

**Màn hình:** `/account/orders/{order_id}`

| Bước | Action | API |
|------|--------|-----|
| 1 | Chi tiết đơn | `GET /orders/{order_id}` |
| 2 | Items | `GET /orders/{order_id}/items` |
| 3 | Lịch sử tracking | `GET /orders/{order_id}/history` |
| 4 | Thông tin vận chuyển | `GET /orders/{order_id}/shipment` |
| 5 | Thông tin thanh toán | `GET /orders/{order_id}/payment` |

**Timeline từ histories[]:**
```
pending → confirmed → processing → shipped → delivered
```

---

## 6. User Account Flow

### 6.1 Quản lý địa chỉ

**Màn hình:** `/account/addresses`

| Bước | Action | API |
|------|--------|-----|
| 1 | Load địa chỉ | `GET /addresses/me` |
| 2 | Thêm địa chỉ | `POST /addresses` |
| 3 | Sửa địa chỉ | `PUT /addresses/{address_id}` |
| 4 | Đặt làm mặc định | `PUT /addresses/{address_id}` `{"is_default": true}` |
| 5 | Xóa địa chỉ | `DELETE /addresses/{address_id}` |

> Địa chỉ đã gắn với đơn hàng không thể xóa (backend trả 400).

---

## 7. Admin — User & Role Management

**Màn hình:** `/admin/users`, `/admin/roles`

### Users

| Action | API |
|--------|-----|
| List | `GET /people/users` |
| Create | `POST /people/users` |
| Update (đổi role/email) | `PUT /people/users/{user_id}` |
| Delete | `DELETE /people/users/{user_id}` |

### Roles

| Action | API |
|--------|-----|
| List | `GET /people/roles` |
| Create | `POST /people/roles` |
| Update | `PUT /people/roles/{role_id}` |
| Delete | `DELETE /people/roles/{role_id}` |

---

## 8. Admin — Product Management

### 8.1 Category

**Màn hình:** `/admin/categories`

| Action | API |
|--------|-----|
| List | `GET /categories` |
| Create | `POST /categories` |
| Update | `PUT /categories/{category_id}` |
| Delete | `DELETE /categories/{category_id}` |

---

### 8.2 Product

**Màn hình:** `/admin/products`

| Action | API |
|--------|-----|
| List + filter | `GET /products?category_id=&search=` |
| Create | `POST /products` |
| Update | `PUT /products/{product_id}` |
| Delete | `DELETE /products/{product_id}` |
| Upload ảnh | Upload Supabase Storage → URL → `image_url` field |

---

### 8.3 ProductVariant

**Màn hình:** `/admin/products/{product_id}/variants`

| Action | API |
|--------|-----|
| List | `GET /products/{product_id}/variants` |
| Create | `POST /products/{product_id}/variants` |
| Update | `PUT /products/{product_id}/variants/{variant_id}` |
| Delete | `DELETE /products/{product_id}/variants/{variant_id}` |

---

### 8.4 Specs

| Action | API |
|--------|-----|
| Product specs | `GET/POST/PUT/DELETE /products/{product_id}/specs` |
| Variant specs | `GET/POST/PUT/DELETE /products/{product_id}/variants/{variant_id}/specs` |

---

## 9. Admin/Staff — Order Management

**Màn hình:** `/admin/orders`, `/staff/orders`

| Action | API | Role |
|--------|-----|------|
| List all orders | `GET /orders` | Staff + Admin |
| Filter theo user | `GET /orders?user_id={id}` | Staff + Admin |
| Filter theo status | `GET /orders?status=pending` | Staff + Admin |
| Xem chi tiết đơn | `GET /orders/{order_id}` | Staff + Admin |
| Cập nhật status | `PUT /orders/{order_id}` `{"order_status": "confirmed"}` | Staff + Admin |
| Cập nhật item | `PUT /orders/{order_id}/items/{item_id}` | Staff + Admin |
| Thêm history tracking | `POST /orders/{order_id}/history` | Staff + Admin |
| Tạo đơn thủ công | `POST /orders` | Admin only |
| Xóa đơn | `DELETE /orders/{order_id}` | Admin only |

**Order status flow:**
```
pending → confirmed → processing → shipped → delivered → completed
                                           ↘ cancelled
```

---

## 10. Admin/Staff — Payment & Shipment

### Payment — `/admin/payments`

| Action | API | Role |
|--------|-----|------|
| List | `GET /payments?order_id=&payment_status=` | Staff + Admin |
| Xem theo order | `GET /orders/{order_id}/payment` | Staff + Admin |
| Tạo | `POST /payments` | Staff + Admin |
| Xác nhận thanh toán | `PUT /payments/{id}` `{"payment_status": "paid", "paid_at": "..."}` | Staff + Admin |
| Xóa | `DELETE /payments/{id}` | Admin only |

---

### Shipment — `/admin/shipments`

| Action | API | Role |
|--------|-----|------|
| List | `GET /shipments?order_id=&status=&provider_id=` | Staff + Admin |
| Xem theo order | `GET /orders/{order_id}/shipment` | Staff + Admin |
| Tạo | `POST /shipments` | Staff + Admin |
| Cập nhật tracking | `PUT /shipments/{id}` `{"tracking_number": "VN123", "status": "in_transit"}` | Staff + Admin |
| Đánh dấu đã giao | `PUT /shipments/{id}` `{"status": "delivered", "delivered_at": "..."}` | Staff + Admin |
| Xóa | `DELETE /shipments/{id}` | Admin only |

**Shipment status flow:**
```
pending → picked_up → in_transit → delivered
```

---

## 11. Admin/Staff — Inventory Management

### Inventory Location — `/admin/inventory/locations`

| Action | API | Role |
|--------|-----|------|
| List | `GET /inventory/locations?type=warehouse` | Staff + Admin |
| Create | `POST /inventory/locations` | Admin only |
| Update | `PUT /inventory/locations/{id}` | Admin only |
| Delete | `DELETE /inventory/locations/{id}` | Admin only |

---

### Inventory Stock — `/admin/inventory/stock`

| Action | API | Role |
|--------|-----|------|
| Xem tồn kho | `GET /inventory/stock?location_id=&variant_id=` | Staff + Admin |
| Cảnh báo hàng thấp | `GET /inventory/stock?low_stock=5` | Staff + Admin |
| Khởi tạo stock | `POST /inventory/stock` | Admin only |
| Cập nhật số lượng | `PUT /inventory/stock/{variant_id}/{location_id}` | Staff + Admin |
| Xóa | `DELETE /inventory/stock/{variant_id}/{location_id}` | Admin only |

---

### Inventory Movement — `/admin/inventory/movements`

| Action | API | Role |
|--------|-----|------|
| Lịch sử nhập/xuất | `GET /inventory/movements?movement_type=in` | Staff + Admin |
| Nhập kho | `POST /inventory/movements` `{"movement_type": "in", "quantity": 50}` | Staff + Admin |
| Xuất kho | `POST /inventory/movements` `{"movement_type": "out", ...}` | Staff + Admin |
| Xóa record | `DELETE /inventory/movements/{id}` | Admin only |

**movement_type:** `in` | `out` | `transfer` | `adjustment` | `return`

> ⚠️ Không có PUT — movement là audit trail bất biến.

---

### Stock Reservation — `/admin/inventory/reservations`

| Action | API | Role |
|--------|-----|------|
| List | `GET /inventory/reservations?status=active` | Staff + Admin |
| Update status | `PUT /inventory/reservations/{id}` `{"status": "released"}` | Staff (status only), Admin (full) |
| Create | `POST /inventory/reservations` | Admin only |
| Delete | `DELETE /inventory/reservations/{id}` | Admin only |

---

## 12. Admin — Location Management

**Màn hình:** `/admin/locations`

### Country

| Action | API |
|--------|-----|
| List + search | `GET /countries?search=Viet` |
| Create | `POST /countries` |
| Update | `PUT /countries/{country_id}` |
| Delete | `DELETE /countries/{country_id}` |

### City

| Action | API |
|--------|-----|
| List (filter theo country) | `GET /cities?country_id={id}` |
| List theo country (shortcut) | `GET /countries/{country_id}/cities` |
| Create | `POST /cities` |
| Update | `PUT /cities/{city_id}` |
| Delete | `DELETE /cities/{city_id}` |

---

## 13. Admin — Delivery Provider Management

**Màn hình:** `/admin/delivery-providers`

| Action | API |
|--------|-----|
| List tất cả | `GET /delivery-providers` |
| List chỉ active | `GET /delivery-providers?is_active=true` |
| Create | `POST /delivery-providers` |
| Update | `PUT /delivery-providers/{provider_id}` |
| Vô hiệu hóa | `PUT /delivery-providers/{id}` `{"is_active": false}` |
| Delete | `DELETE /delivery-providers/{provider_id}` |

---

## 14. Visual Search & Product Images Flow 📷

### 14.1 Tìm kiếm sản phẩm bằng hình ảnh (Visual Search)

**Màn hình:** `/products` hoặc Modal Camera / Upload ảnh ở Search Bar

| Bước | Action | API |
|------|--------|-----|
| 1 | User chụp ảnh hoặc upload file ảnh từ máy | — |
| 2 | Trích xuất vector 512 chiều (model CLIP) | — |
| 3 | Gửi vector tìm kiếm sản phẩm tương đồng qua pgvector | `POST /products/search-by-image` |
| 4 | Hiển thị danh sách sản phẩm khớp nhất cùng `similarity_score` | — |

**Payload mẫu:**
```json
// POST /products/search-by-image
{
  "embedding": [0.0123, -0.0456, 0.0891],
  "top_k": 10,
  "min_similarity": 0.6,
  "category_id": null
}
```

---

### 14.2 Quản lý ảnh & Vector Embedding sản phẩm (Admin/Staff)

**Màn hình:** `/admin/products/{product_id}/images`

| Action | API | Role |
|--------|-----|------|
| Xem danh sách ảnh sản phẩm / variant | `GET /products/{product_id}/images` | Tất cả user |
| Chi tiết 1 ảnh | `GET /products/{product_id}/images/{image_id}` | Tất cả user |
| Thêm ảnh mới + vector embedding | `POST /products/{product_id}/images` | Staff + Admin |
| Cập nhật ảnh / đặt ảnh đại diện / embedding | `PUT /products/{product_id}/images/{image_id}` | Staff + Admin |
| Xóa ảnh | `DELETE /products/{product_id}/images/{image_id}` | Staff + Admin |

> **Lưu ý nghiệp vụ:**
> - `is_primary = true`: Hệ thống tự động gỡ `is_primary` của các ảnh khác cùng sản phẩm.
> - `embedding`: Lưu vector 512 chiều (trích xuất bằng model CLIP) để phục vụ Visual Search.

---

## 📌 Phân quyền tổng hợp

| Role | Quyền hạn |
|------|-----------|
| **User** | Xem sản phẩm, tìm kiếm bằng ảnh, quản lý giỏ hàng, đặt hàng, xem đơn mình, quản lý địa chỉ mình |
| **Staff** | Xem/hỗ trợ cart & order bất kỳ user, cập nhật status đơn + shipment + payment, quản lý inventory stock & movement, quản lý ảnh sản phẩm |
| **Admin** | Toàn quyền: thêm sản phẩm, quản lý ảnh/embedding, quản lý user, quản lý location/provider, xóa bất kỳ record |

---

## 🗺️ Sơ đồ màn hình gợi ý

```
/                          → Trang chủ (danh sách sản phẩm + tìm kiếm bằng ảnh)
/products/{id}             → Chi tiết sản phẩm & thư viện ảnh
/cart                      → Giỏ hàng
/checkout                  → Thanh toán
/orders/{id}/confirm       → Xác nhận đơn
/login                     → Đăng nhập
/register                  → Đăng ký
/account                   → Tài khoản
/account/orders            → Đơn hàng của tôi
/account/orders/{id}       → Chi tiết đơn hàng + tracking
/account/addresses         → Quản lý địa chỉ

/admin                     → Dashboard
/admin/users               → Quản lý người dùng
/admin/products            → Quản lý sản phẩm
/admin/products/{id}       → Chi tiết / edit sản phẩm + variants + specs + thư viện ảnh
/admin/orders              → Quản lý đơn hàng
/admin/payments            → Quản lý thanh toán
/admin/shipments           → Quản lý vận chuyển
/admin/delivery-providers  → Nhà vận chuyển
/admin/inventory           → Tổng quan tồn kho
/admin/inventory/locations → Kho hàng
/admin/inventory/stock     → Tồn kho theo variant
/admin/inventory/movements → Lịch sử nhập/xuất
/admin/locations           → Quản lý quốc gia / thành phố

/staff/orders              → Danh sách đơn cần xử lý
/staff/shipments           → Quản lý vận chuyển
/staff/inventory           → Tồn kho
```
