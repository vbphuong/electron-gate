from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Cart, CartItem, ProductVariant, User

router = APIRouter(prefix="/carts", tags=["carts"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class CartItemBrief(BaseModel):
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


class CartRead(BaseModel):
    cart_id: UUID
    user_id: UUID
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: list[CartItemBrief] = []

    model_config = ConfigDict(from_attributes=True)


class CartUpdate(BaseModel):
    status: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def cart_item_to_brief(item: CartItem) -> CartItemBrief:
    variant = item.variant
    product = variant.product if variant else None
    return CartItemBrief(
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


def cart_to_read(cart: Cart) -> CartRead:
    return CartRead(
        cart_id=cart.cart_id,
        user_id=cart.user_id,
        status=cart.status,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        items=[cart_item_to_brief(i) for i in cart.items],
    )


def _get_or_create_active_cart(db, user_id: UUID) -> Cart:
    """Get the user's active cart, or create one if none exists."""
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.status == "active")
        .first()
    )
    if not cart:
        cart = Cart(user_id=user_id, status="active")
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _require_cart_access(cart: Cart, current_user: dict, write: bool = False):
    """
    Check role-based access to a cart.
    - User: own cart only
    - Staff: view only (write=False), raise 403 on write
    - Admin: full access
    """
    role = current_user.get("role")
    uid = current_user.get("id")

    if role == "Admin":
        return

    if role == "Staff":
        if write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff can only view carts",
            )
        return

    # User role — own cart only
    if str(cart.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own cart",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/me", response_model=CartRead)
def get_my_cart(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Get the current user's active cart. Auto-creates one if it doesn't exist."""
    cart = _get_or_create_active_cart(db, current_user["id"])
    return cart_to_read(cart)


@router.get("", response_model=list[CartRead])
def list_carts(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    user_id: Optional[UUID] = Query(None),
    cart_status: Optional[str] = Query(None, alias="status"),
):
    """
    List carts. Admin/Staff only (for support).
    Optional filters: ?user_id=xxx&status=active
    """
    role = current_user.get("role")
    if role not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Staff access required",
        )

    query = db.query(Cart)
    if user_id is not None:
        query = query.filter(Cart.user_id == user_id)
    if cart_status is not None:
        query = query.filter(Cart.status == cart_status)

    carts = query.order_by(Cart.updated_at.desc()).all()
    return [cart_to_read(c) for c in carts]


@router.get("/{cart_id}", response_model=CartRead)
def get_cart(
    cart_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific cart. User can access own, Staff/Admin can access any."""
    cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found"
        )
    _require_cart_access(cart, current_user, write=False)
    return cart_to_read(cart)


@router.put("/{cart_id}", response_model=CartRead)
def update_cart(
    cart_id: UUID,
    body: CartUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Edit a cart. User can edit own, Admin can edit any. Staff cannot edit."""
    cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found"
        )
    _require_cart_access(cart, current_user, write=True)

    if body.status is not None:
        cart.status = body.status

    db.commit()
    db.refresh(cart)
    return cart_to_read(cart)


@router.delete("/{cart_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cart(
    cart_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Delete a cart. Admin only."""
    cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found"
        )
    db.delete(cart)
    db.commit()
