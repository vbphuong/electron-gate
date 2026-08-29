from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Order, OrderHistory

router = APIRouter(prefix="/orders/{order_id}/history", tags=["order-history"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class OrderHistoryRead(BaseModel):
    or_his_id: UUID
    order_id: UUID
    address_line: str
    recipient_name: str
    country_name: str
    city_name: str
    phone: str
    model_config = ConfigDict(from_attributes=True)


class OrderHistoryCreate(BaseModel):
    address_line: str
    recipient_name: str
    country_name: str
    city_name: str
    phone: str


class OrderHistoryUpdate(BaseModel):
    address_line: Optional[str] = None
    recipient_name: Optional[str] = None
    country_name: Optional[str] = None
    city_name: Optional[str] = None
    phone: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _get_order_or_404(db, order_id: UUID) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


def _require_history_access(
    order: Order, current_user: dict, action: str = "view",
):
    """
    - User: view own order history only
    - Staff: view + add
    - Admin: view / add / edit / delete
    """
    role = current_user.get("role")
    uid = current_user.get("id")

    if role == "Admin":
        return

    if role == "Staff":
        if action in ("view", "add"):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff can only view and add order history",
        )

    # User — own orders, view only
    if str(order.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own order history",
        )
    if action != "view":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users can only view order history",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[OrderHistoryRead])
def list_order_history(
    order_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """List order history entries. User own, Staff/Admin any."""
    order = _get_order_or_404(db, order_id)
    _require_history_access(order, current_user, action="view")

    entries = (
        db.query(OrderHistory)
        .filter(OrderHistory.order_id == order_id)
        .all()
    )
    return [OrderHistoryRead.model_validate(e) for e in entries]


@router.post("", response_model=OrderHistoryRead, status_code=status.HTTP_201_CREATED)
def add_order_history(
    order_id: UUID,
    body: OrderHistoryCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Add order history entry. Staff/Admin only."""
    order = _get_order_or_404(db, order_id)
    _require_history_access(order, current_user, action="add")

    entry = OrderHistory(
        order_id=order_id,
        address_line=body.address_line,
        recipient_name=body.recipient_name,
        country_name=body.country_name,
        city_name=body.city_name,
        phone=body.phone,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return OrderHistoryRead.model_validate(entry)


@router.put("/{history_id}", response_model=OrderHistoryRead)
def update_order_history(
    order_id: UUID,
    history_id: UUID,
    body: OrderHistoryUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Edit order history entry. Admin only."""
    _get_order_or_404(db, order_id)

    entry = (
        db.query(OrderHistory)
        .filter(
            OrderHistory.order_id == order_id,
            OrderHistory.or_his_id == history_id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order history entry not found",
        )

    if body.address_line is not None:
        entry.address_line = body.address_line
    if body.recipient_name is not None:
        entry.recipient_name = body.recipient_name
    if body.country_name is not None:
        entry.country_name = body.country_name
    if body.city_name is not None:
        entry.city_name = body.city_name
    if body.phone is not None:
        entry.phone = body.phone

    db.commit()
    db.refresh(entry)
    return OrderHistoryRead.model_validate(entry)


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_history(
    order_id: UUID,
    history_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Delete order history entry. Admin only."""
    _get_order_or_404(db, order_id)

    entry = (
        db.query(OrderHistory)
        .filter(
            OrderHistory.order_id == order_id,
            OrderHistory.or_his_id == history_id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order history entry not found",
        )

    db.delete(entry)
    db.commit()
