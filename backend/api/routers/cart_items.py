from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user
from api.models import Cart, CartItem, ProductVariant

router = APIRouter(prefix="/carts/{cart_id}/items", tags=["cart-items"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class CartItemRead(BaseModel):
    cart_id: UUID
    variant_id: UUID
    quantity: int
    unit_price: Decimal
    is_selected: bool

    # Variant info for display
    product_name: Optional[str] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None
    variant_storage: Optional[str] = None
    variant_image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CartItemCreate(BaseModel):
    variant_id: UUID
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = None
    is_selected: Optional[bool] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def item_to_read(item: CartItem) -> CartItemRead:
    variant = item.variant
    product = variant.product if variant else None
    return CartItemRead(
        cart_id=item.cart_id,
        variant_id=item.variant_id,
        quantity=item.quantity,
        unit_price=item.unit_price,
        is_selected=item.is_selected,
        product_name=product.name if product else None,
        variant_model=variant.model if variant else None,
        variant_color=variant.color if variant else None,
        variant_storage=variant.storage if variant else None,
        variant_image_url=variant.image_url if variant else None,
    )


def _get_cart_or_404(db, cart_id: UUID) -> Cart:
    cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found"
        )
    return cart


def _require_item_access(cart: Cart, current_user: dict, write: bool = False):
    """
    Role-based access for cart items.
    - User: own cart only (full CRUD)
    - Staff: view only
    - Admin: view / edit / delete (no add)
    """
    role = current_user.get("role")
    uid = current_user.get("id")

    if role == "Admin":
        return

    if role == "Staff":
        if write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff can only view cart items",
            )
        return

    # User role — own cart only
    if str(cart.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own cart items",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[CartItemRead])
def list_cart_items(
    cart_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """List items in a cart. User own cart, Staff/Admin any cart."""
    cart = _get_cart_or_404(db, cart_id)
    _require_item_access(cart, current_user, write=False)
    return [item_to_read(i) for i in cart.items]


@router.post("", response_model=CartItemRead, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    cart_id: UUID,
    body: CartItemCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """
    Add item to cart. User can add to own cart only.
    unit_price is auto-set from the variant's current price.
    If item already exists, quantity is incremented.
    """
    cart = _get_cart_or_404(db, cart_id)

    # Only the cart owner (User) can add items
    if str(cart.user_id) != current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add items to your own cart",
        )

    # Validate variant exists and is active
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.variant_id == body.variant_id)
        .first()
    )
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found",
        )
    if variant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product variant is not available",
        )

    # Check if item already in cart → increment quantity
    existing = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id, CartItem.variant_id == body.variant_id)
        .first()
    )
    if existing:
        existing.quantity += body.quantity
        existing.unit_price = variant.price  # refresh price
        db.commit()
        db.refresh(existing)
        return item_to_read(existing)

    # Create new cart item with price from variant
    item = CartItem(
        cart_id=cart_id,
        variant_id=body.variant_id,
        quantity=body.quantity,
        unit_price=variant.price,
        is_selected=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_read(item)


@router.put("/{variant_id}", response_model=CartItemRead)
def update_cart_item(
    cart_id: UUID,
    variant_id: UUID,
    body: CartItemUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Edit a cart item (quantity, is_selected). User own cart, Admin any cart."""
    cart = _get_cart_or_404(db, cart_id)
    _require_item_access(cart, current_user, write=True)

    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id, CartItem.variant_id == variant_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found"
        )

    if body.quantity is not None:
        if body.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0",
            )
        item.quantity = body.quantity
    if body.is_selected is not None:
        item.is_selected = body.is_selected

    db.commit()
    db.refresh(item)
    return item_to_read(item)


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    cart_id: UUID,
    variant_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Remove item from cart. User own cart, Admin any cart."""
    cart = _get_cart_or_404(db, cart_id)
    _require_item_access(cart, current_user, write=True)

    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id, CartItem.variant_id == variant_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found"
        )

    db.delete(item)
    db.commit()
