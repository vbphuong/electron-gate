from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Order, OrderItem

router = APIRouter(prefix="/orders/{order_id}/items", tags=["order-items"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class OrderItemRead(BaseModel):
    order_item_id: UUID
    order_id: UUID
    variant_id: UUID
    quantity: int
    unit_price: Decimal

    # Variant info for display
    product_name: Optional[str] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None
    variant_storage: Optional[str] = None
    variant_image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_price: Optional[Decimal] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def item_to_read(item: OrderItem) -> OrderItemRead:
    variant = item.variant
    product = variant.product if variant else None
    return OrderItemRead(
        order_item_id=item.order_item_id,
        order_id=item.order_id,
        variant_id=item.variant_id,
        quantity=item.quantity,
        unit_price=item.unit_price,
        product_name=product.name if product else None,
        variant_model=variant.model if variant else None,
        variant_color=variant.color if variant else None,
        variant_storage=variant.storage if variant else None,
        variant_image_url=variant.image_url if variant else None,
    )


def _get_order_or_404(db, order_id: UUID) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


def _require_item_access(order: Order, current_user: dict, write: bool = False):
    """
    - User: view own order items only
    - Staff: view + edit for fulfillment
    - Admin: view / edit / delete
    """
    role = current_user.get("role")
    uid = current_user.get("id")

    if role == "Admin":
        return

    if role == "Staff":
        return  # Staff can view and edit

    # User — own orders, view only
    if str(order.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own order items",
        )
    if write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot modify order items",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[OrderItemRead])
def list_order_items(
    order_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """List items of an order. User own, Staff/Admin any."""
    order = _get_order_or_404(db, order_id)
    _require_item_access(order, current_user, write=False)

    items = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order_id)
        .all()
    )
    return [item_to_read(i) for i in items]


@router.get("/{item_id}", response_model=OrderItemRead)
def get_order_item(
    order_id: UUID,
    item_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific order item."""
    order = _get_order_or_404(db, order_id)
    _require_item_access(order, current_user, write=False)

    item = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order_id, OrderItem.order_item_id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found"
        )
    return item_to_read(item)


@router.put("/{item_id}", response_model=OrderItemRead)
def update_order_item(
    order_id: UUID,
    item_id: UUID,
    body: OrderItemUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Edit order item (quantity, unit_price). Staff/Admin only."""
    order = _get_order_or_404(db, order_id)
    _require_item_access(order, current_user, write=True)

    item = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order_id, OrderItem.order_item_id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found"
        )

    if body.quantity is not None:
        if body.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0",
            )
        item.quantity = body.quantity
    if body.unit_price is not None:
        item.unit_price = body.unit_price

    db.commit()
    db.refresh(item)
    return item_to_read(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_item(
    order_id: UUID,
    item_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Delete an order item. Admin only."""
    order = _get_order_or_404(db, order_id)

    item = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order_id, OrderItem.order_item_id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found"
        )

    db.delete(item)
    db.commit()
