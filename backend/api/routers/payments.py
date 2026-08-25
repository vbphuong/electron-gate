from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Order, Payment

router = APIRouter(prefix="/payments", tags=["payments"])
order_router = APIRouter(prefix="/orders/{order_id}/payment", tags=["payments"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class PaymentRead(BaseModel):
    payment_id: UUID
    order_id: UUID
    payment_method: str
    payment_status: str
    amount: Decimal
    paid_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    order_id: UUID
    payment_method: str
    payment_status: str = "pending"
    amount: Decimal
    paid_at: Optional[datetime] = None


class PaymentUpdate(BaseModel):
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    amount: Optional[Decimal] = None
    paid_at: Optional[datetime] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_payment_access(payment: Payment, current_user: dict, write: bool = False):
    role = current_user.get("role")
    uid = current_user.get("id")
    if role == "Admin":
        return
    if role == "Staff":
        return
    # User — own orders only
    if str(payment.order.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own payments",
        )
    if write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot modify payments",
        )


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


# ── Endpoints — /payments ────────────────────────────────────────────────────


@router.get("", response_model=list[PaymentRead])
def list_payments(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    order_id: Optional[UUID] = Query(None),
    payment_status: Optional[str] = Query(None),
):
    """Staff/Admin only. Filter by order_id or status."""
    _require_staff_or_admin(current_user)

    # Auto-provision payments for any existing orders missing a payment record
    orders_without_payment = (
        db.query(Order)
        .outerjoin(Payment, Order.order_id == Payment.order_id)
        .filter(Payment.payment_id == None)
        .all()
    )
    if orders_without_payment:
        for ord in orders_without_payment:
            p = Payment(
                order_id=ord.order_id,
                payment_method="credit_card",
                payment_status="pending",
                amount=ord.subtotal + ord.shipping_fee - ord.discount_amount,
            )
            db.add(p)
        db.commit()

    query = db.query(Payment)
    if order_id is not None:
        query = query.filter(Payment.order_id == order_id)
    if payment_status is not None:
        query = query.filter(Payment.payment_status == payment_status)

    return query.order_by(Payment.paid_at.desc()).all()


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Any authenticated. User can only view own payment."""
    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    _require_payment_access(payment, current_user, write=False)
    return PaymentRead.model_validate(payment)


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(
    body: PaymentCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin only. One payment per order."""
    _require_staff_or_admin(current_user)

    order = db.query(Order).filter(Order.order_id == body.order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if db.query(Payment).filter(Payment.order_id == body.order_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already exists for this order",
        )

    payment = Payment(**body.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentRead.model_validate(payment)


@router.put("/{payment_id}", response_model=PaymentRead)
def update_payment(
    payment_id: UUID,
    body: PaymentUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin only. Partial update."""
    _require_staff_or_admin(current_user)

    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return PaymentRead.model_validate(payment)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    db.delete(payment)
    db.commit()


# ── Endpoints — /orders/{order_id}/payment ───────────────────────────────────


@order_router.get("", response_model=PaymentRead)
def get_payment_by_order(
    order_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Shortcut: get payment by order_id. Any authenticated; User own order only."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Access check for User role
    role = current_user.get("role")
    if role == "User" and str(order.user_id) != current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own order",
        )

    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        payment = Payment(
            order_id=order_id,
            payment_method="credit_card",
            payment_status="pending",
            amount=order.subtotal + order.shipping_fee - order.discount_amount,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
    return PaymentRead.model_validate(payment)
