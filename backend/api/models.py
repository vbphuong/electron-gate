from decimal import Decimal
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Table,
    Text,
    TIMESTAMP,
    func,
    Computed,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import relationship

from api.database import Base


# =========================
# PRODUCT CATEGORY ASSOCIATION
# =========================

product_category = Table(
    "product_category",
    Base.metadata,
    Column(
        "product_id",
        UUID(as_uuid=True),
        ForeignKey("products.product_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "category_id",
        UUID(as_uuid=True),
        ForeignKey("categories.category_id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# =========================
# ROLE MODEL
# =========================

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

    users = relationship("User", back_populates="role")


# =========================
# USER MODEL
# =========================

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255))
    email = Column(String(255), unique=True, nullable=False)
    password = Column(Text)
    phone_num = Column(String(30))
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.role_id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    role = relationship("Role", back_populates="users")
    addresses = relationship(
        "Address",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    carts = relationship("Cart", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    uploaded_documents = relationship("Document", back_populates="uploader")
    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.document_id", ondelete="CASCADE"),
        nullable=True,
    )

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(String)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    document = relationship("Document", back_populates="conversations")
    user = relationship("User", back_populates="conversations")

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
    )

    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )

# =========================
# ADDRESS MODEL
# =========================

class Country(Base):
    __tablename__ = "countries"

    country_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    country_name = Column(String(100), unique=True, nullable=False)

    cities = relationship("City", back_populates="country")


class City(Base):
    __tablename__ = "cities"

    city_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_name = Column(String(100), nullable=False)
    postal_code = Column(String(30))
    country_id = Column(
        UUID(as_uuid=True),
        ForeignKey("countries.country_id", ondelete="RESTRICT"),
        nullable=False,
    )

    country = relationship("Country", back_populates="cities")
    addresses = relationship("Address", back_populates="city")


class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    address_line = Column(Text, nullable=False)
    city_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cities.city_id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_default = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="addresses")
    city = relationship("City", back_populates="addresses")
    orders = relationship(
        "Order",
        back_populates="shipping_address",
        foreign_keys="Order.shipping_address_id",
    )


# =========================
# PRODUCT MODEL
# =========================

class Product(Base):
    __tablename__ = "products"

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image_url = Column(Text)

    categories = relationship(
        "Category",
        secondary=product_category,
        back_populates="products",
    )
    variants = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    specs = relationship(
        "ProductSpec",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
    )


class Category(Base):
    __tablename__ = "categories"

    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)

    products = relationship(
        "Product",
        secondary=product_category,
        back_populates="categories",
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    variant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    model = Column(String(100))
    color = Column(String(100))
    storage = Column(String(100))
    price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    status = Column(String(50), nullable=False, default="active")
    image_url = Column(Text)

    product = relationship("Product", back_populates="variants")
    specs = relationship(
        "VariantSpec",
        back_populates="variant",
        cascade="all, delete-orphan",
    )
    images = relationship(
        "ProductImage",
        back_populates="variant",
    )
    cart_items = relationship("CartItem", back_populates="variant")
    order_items = relationship("OrderItem", back_populates="variant")
    inventory_stocks = relationship(
        "InventoryStock",
        back_populates="variant",
        cascade="all, delete-orphan",
    )
    inventory_movements = relationship("InventoryMovement", back_populates="variant")
    stock_reservations = relationship("StockReservation", back_populates="variant")


class ProductImage(Base):
    __tablename__ = "product_images"

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="SET NULL"),
        nullable=True,
    )
    image_url = Column(Text, nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    embedding = Column(Vector(512), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="images")
    variant = relationship("ProductVariant", back_populates="images")


class ProductSpec(Base):
    __tablename__ = "product_specs"

    spec_product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    spec_name = Column(String(100), nullable=False)
    spec_value = Column(Text, nullable=False)

    product = relationship("Product", back_populates="specs")


class VariantSpec(Base):
    __tablename__ = "variant_specs"

    spec_variant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="CASCADE"),
        nullable=False,
    )
    spec_name = Column(String(100), nullable=False)
    spec_value = Column(Text, nullable=False)

    variant = relationship("ProductVariant", back_populates="specs")


# =========================
# CART MODEL
# =========================

class Cart(Base):
    __tablename__ = "carts"

    cart_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="carts")
    items = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
    )
    stock_reservations = relationship("StockReservation", back_populates="cart")


class CartItem(Base):
    __tablename__ = "cart_items"

    cart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("carts.cart_id", ondelete="CASCADE"),
        primary_key=True,
    )
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="CASCADE"),
        primary_key=True,
    )
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    is_selected = Column(Boolean, nullable=False, default=True)

    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant", back_populates="cart_items")


# =========================
# ORDER MODEL
# =========================

class Order(Base):
    __tablename__ = "orders"

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    shipping_address_id = Column(
        UUID(as_uuid=True),
        ForeignKey("addresses.address_id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_number = Column(String(50), unique=True, nullable=False)
    order_status = Column(String(50), nullable=False, default="pending")
    subtotal = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    shipping_fee = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    discount_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="orders")
    shipping_address = relationship(
        "Address",
        back_populates="orders",
        foreign_keys=[shipping_address_id],
    )
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    histories = relationship(
        "OrderHistory",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    payment = relationship(
        "Payment",
        back_populates="order",
        cascade="all, delete-orphan",
        uselist=False,
    )
    shipment = relationship(
        "Shipment",
        back_populates="order",
        cascade="all, delete-orphan",
        uselist=False,
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant", back_populates="order_items")


class OrderHistory(Base):
    __tablename__ = "order_history"

    or_his_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    address_line = Column(Text, nullable=False)
    recipient_name = Column(String(255), nullable=False)
    country_name = Column(String(100), nullable=False)
    city_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)

    order = relationship("Order", back_populates="histories")


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.order_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(50), nullable=False, default="pending")
    amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    paid_at = Column(TIMESTAMP(timezone=True))

    order = relationship("Order", back_populates="payment")


class Shipment(Base):
    __tablename__ = "shipments"

    shipment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.order_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    delivery_provider_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_providers.provider_id", ondelete="RESTRICT"),
        nullable=False,
    )
    tracking_number = Column(String(100))
    status = Column(String(50), nullable=False, default="pending")
    delivered_at = Column(TIMESTAMP(timezone=True))

    order = relationship("Order", back_populates="shipment")
    delivery_provider = relationship("DeliveryProvider", back_populates="shipments")


class DeliveryProvider(Base):
    __tablename__ = "delivery_providers"

    provider_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    phone = Column(String(30))
    is_active = Column(Boolean, nullable=False, default=True)

    shipments = relationship("Shipment", back_populates="delivery_provider")


# =========================
# INVENTORY MODEL
# =========================

class InventoryLocation(Base):
    __tablename__ = "inventory_locations"

    location_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    address = Column(Text)

    stocks = relationship("InventoryStock", back_populates="location")
    movements = relationship("InventoryMovement", back_populates="location")
    stock_reservations = relationship("StockReservation", back_populates="location")


class InventoryStock(Base):
    __tablename__ = "inventory_stock"

    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="CASCADE"),
        primary_key=True,
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_locations.location_id", ondelete="CASCADE"),
        primary_key=True,
    )
    qty_available = Column(Integer, nullable=False, default=0)
    qty_reserved = Column(Integer, nullable=False, default=0)

    variant = relationship("ProductVariant", back_populates="inventory_stocks")
    location = relationship("InventoryLocation", back_populates="stocks")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    movement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_locations.location_id", ondelete="RESTRICT"),
        nullable=False,
    )
    movement_type = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)

    variant = relationship("ProductVariant", back_populates="inventory_movements")
    location = relationship("InventoryLocation", back_populates="movements")


class StockReservation(Base):
    __tablename__ = "stock_reservations"

    reservation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="CASCADE"),
        nullable=False,
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_locations.location_id", ondelete="CASCADE"),
        nullable=False,
    )
    cart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("carts.cart_id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity = Column(Integer, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, default="active")

    variant = relationship("ProductVariant", back_populates="stock_reservations")
    location = relationship("InventoryLocation", back_populates="stock_reservations")
    cart = relationship("Cart", back_populates="stock_reservations")


# =========================
# DOCUMENT MODEL
# =========================

class Document(Base):
    __tablename__ = "documents"

    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_path = Column(Text, nullable=False)
    total_page = Column(Integer, default=0)
    total_chunk = Column(Integer, default=0)
    private = Column(Boolean, nullable=False, default=False)

    uploader = relationship("User", back_populates="uploaded_documents")
    chunks = relationship(
        "Chunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    conversations = relationship(
        "Conversation",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class Chunk(Base):
    __tablename__ = "chunks"

    chunk_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.document_id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    chunk_index = Column(Integer, nullable=False)
    chunk_metadata = Column("metadata", JSONB, default=dict)
    fts = Column(TSVECTOR, Computed("to_tsvector('english', content)", persisted=True))

    document = relationship("Document", back_populates="chunks")
