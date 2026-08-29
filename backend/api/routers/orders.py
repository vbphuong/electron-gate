import uuid as uuid_mod
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import (
    Address,
    Cart,
    CartItem,
    City,
    Country,
    Order,
    OrderHistory,
    OrderItem,
    Payment,
    User,
)

router = APIRouter(prefix="/orders", tags=["orders"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class OrderItemBrief(BaseModel):
    order_item_id: UUID
    variant_id: UUID
    quantity: int
    unit_price: Decimal
    model_config = ConfigDict(from_attributes=True)


class OrderHistoryBrief(BaseModel):
    or_his_id: UUID
    address_line: str
    recipient_name: str
    country_name: str
    city_name: str
    phone: str
    model_config = ConfigDict(from_attributes=True)


class OrderRead(BaseModel):
    order_id: UUID
    user_id: UUID
    shipping_address_id: UUID
    order_number: str
    order_status: str
    subtotal: Decimal
    shipping_fee: Decimal
    discount_amount: Decimal
    created_at: Optional[datetime] = None
    items: list[OrderItemBrief] = []
    histories: list[OrderHistoryBrief] = []
    model_config = ConfigDict(from_attributes=True)


class OrderListItem(BaseModel):
    order_id: UUID
    user_id: UUID
    order_number: str
    order_status: str
    subtotal: Decimal
    shipping_fee: Decimal
    discount_amount: Decimal
    created_at: Optional[datetime] = None
    item_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class OrderUpdate(BaseModel):
    order_status: Optional[str] = None
    shipping_fee: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None


class CheckoutRequest(BaseModel):
    shipping_address_id: UUID
    payment_method: Optional[str] = "credit_card"


class AdminOrderCreate(BaseModel):
    user_id: UUID
    shipping_address_id: UUID
    order_status: str = "pending"
    shipping_fee: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    items: list[dict]  # [{"variant_id": "...", "quantity": 1, "unit_price": "10.00"}]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _generate_order_number() -> str:
    """Generate a unique order number like ORD-20260821-XXXX."""
    now = datetime.utcnow()
    short_id = uuid_mod.uuid4().hex[:6].upper()
    return f"ORD-{now.strftime('%Y%m%d')}-{short_id}"


def order_to_list_item(order: Order) -> OrderListItem:
    return OrderListItem(
        order_id=order.order_id,
        user_id=order.user_id,
        order_number=order.order_number,
        order_status=order.order_status,
        subtotal=order.subtotal,
        shipping_fee=order.shipping_fee,
        discount_amount=order.discount_amount,
        created_at=order.created_at,
        item_count=len(order.items),
    )


def _require_order_access(order: Order, current_user: dict, write: bool = False):
    role = current_user.get("role")
    uid = current_user.get("id")

    if role == "Admin":
        return

    if role == "Staff":
        if not write:
            return
        # Staff can only edit order_status
        return

    # User — own orders, view only
    if str(order.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own orders",
        )
    if write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot modify orders",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def checkout(
    body: CheckoutRequest,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """
    User checkout: converts selected cart items into an order.
    - Takes is_selected=True items from the active cart
    - Creates Order + OrderItems
    - Snapshots shipping address into OrderHistory
    - Removes checked-out items from cart
    """
    user_id = current_user["id"]

    # Get active cart
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.status == "active")
        .first()
    )
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No active cart found"
        )

    # Get selected items
    selected_items = [i for i in cart.items if i.is_selected]
    if not selected_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No items selected for checkout",
        )

    # Validate shipping address belongs to user
    address = (
        db.query(Address)
        .filter(
            Address.address_id == body.shipping_address_id,
            Address.user_id == user_id,
        )
        .first()
    )
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping address not found",
        )

    # Calculate subtotal
    subtotal = sum(i.unit_price * i.quantity for i in selected_items)

    # Create order
    order = Order(
        user_id=user_id,
        shipping_address_id=body.shipping_address_id,
        order_number=_generate_order_number(),
        order_status="pending",
        subtotal=subtotal,
    )
    db.add(order)
    db.flush()  # get order_id

    # Create order items
    for cart_item in selected_items:
        order_item = OrderItem(
            order_id=order.order_id,
            variant_id=cart_item.variant_id,
            quantity=cart_item.quantity,
            unit_price=cart_item.unit_price,
        )
        db.add(order_item)

    # Snapshot address into order history
    city = db.query(City).filter(City.city_id == address.city_id).first()
    country = db.query(Country).filter(Country.country_id == city.country_id).first() if city else None
    user = db.query(User).filter(User.user_id == user_id).first()

    history = OrderHistory(
        order_id=order.order_id,
        address_line=address.address_line,
        recipient_name=user.full_name or user.email,
        country_name=country.country_name if country else "",
        city_name=city.city_name if city else "",
        phone=user.phone_num or "",
    )
    db.add(history)

    # Create initial pending payment record for the order
    payment = Payment(
        order_id=order.order_id,
        payment_method=body.payment_method or "credit_card",
        payment_status="pending",
        amount=order.subtotal + order.shipping_fee - order.discount_amount,
    )
    db.add(payment)

    # Remove selected items from cart
    for cart_item in selected_items:
        db.delete(cart_item)

    db.commit()
    db.refresh(order)
    return OrderRead.model_validate(order)


@router.get("", response_model=list[OrderListItem])
def list_orders(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    user_id: Optional[UUID] = Query(None),
    order_status: Optional[str] = Query(None, alias="status"),
):
    """
    List orders.
    - User: own orders only
    - Staff/Admin: all orders, filterable by user_id and status
    """
    role = current_user.get("role")
    query = db.query(Order)

    if role not in ("Admin", "Staff"):
        query = query.filter(Order.user_id == current_user["id"])
    else:
        if user_id is not None:
            query = query.filter(Order.user_id == user_id)
        if order_status is not None:
            query = query.filter(Order.order_status == order_status)

    orders = query.order_by(Order.created_at.desc()).all()
    return [order_to_list_item(o) for o in orders]


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Get order detail. User own, Staff/Admin any."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    _require_order_access(order, current_user, write=False)
    return OrderRead.model_validate(order)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    body: AdminOrderCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin manually creates an order."""
    order = Order(
        user_id=body.user_id,
        shipping_address_id=body.shipping_address_id,
        order_number=_generate_order_number(),
        order_status=body.order_status,
        shipping_fee=body.shipping_fee,
        discount_amount=body.discount_amount,
        subtotal=Decimal("0.00"),
    )
    db.add(order)
    db.flush()

    subtotal = Decimal("0.00")
    for item_data in body.items:
        oi = OrderItem(
            order_id=order.order_id,
            variant_id=item_data["variant_id"],
            quantity=item_data.get("quantity", 1),
            unit_price=Decimal(str(item_data.get("unit_price", "0.00"))),
        )
        db.add(oi)
        subtotal += oi.unit_price * oi.quantity

    order.subtotal = subtotal

    payment = Payment(
        order_id=order.order_id,
        payment_method="direct_gateway",
        payment_status="pending",
        amount=order.subtotal + order.shipping_fee - order.discount_amount,
    )
    db.add(payment)

    db.commit()
    db.refresh(order)
    return OrderRead.model_validate(order)


@router.put("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: UUID,
    body: OrderUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """
    Edit order.
    - Staff: can only update order_status
    - Admin: can update order_status, shipping_fee, discount_amount
    """
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    _require_order_access(order, current_user, write=True)

    role = current_user.get("role")

    if body.order_status is not None:
        order.order_status = body.order_status

    # Only Admin can change these
    if role == "Admin":
        if body.shipping_fee is not None:
            order.shipping_fee = body.shipping_fee
        if body.discount_amount is not None:
            order.discount_amount = body.discount_amount

    db.commit()
    db.refresh(order)
    return OrderRead.model_validate(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Delete an order. Admin only."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    db.delete(order)
    db.commit()
