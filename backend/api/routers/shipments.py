from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import DeliveryProvider, Order, Shipment

router = APIRouter(prefix="/shipments", tags=["shipments"])
order_router = APIRouter(prefix="/orders/{order_id}/shipment", tags=["shipments"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class ShipmentRead(BaseModel):
    shipment_id: UUID
    order_id: UUID
    delivery_provider_id: UUID
    delivery_provider_name: Optional[str] = None
    tracking_number: Optional[str] = None
    status: str
    delivered_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ShipmentCreate(BaseModel):
    order_id: UUID
    delivery_provider_id: UUID
    tracking_number: Optional[str] = None
    status: str = "pending"


class ShipmentUpdate(BaseModel):
    delivery_provider_id: Optional[UUID] = None
    tracking_number: Optional[str] = None
    status: Optional[str] = None
    delivered_at: Optional[datetime] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _shipment_to_read(shipment: Shipment) -> ShipmentRead:
    return ShipmentRead(
        shipment_id=shipment.shipment_id,
        order_id=shipment.order_id,
        delivery_provider_id=shipment.delivery_provider_id,
        delivery_provider_name=(
            shipment.delivery_provider.name if shipment.delivery_provider else None
        ),
        tracking_number=shipment.tracking_number,
        status=shipment.status,
        delivered_at=shipment.delivered_at,
    )


def _require_shipment_access(shipment: Shipment, current_user: dict, write: bool = False):
    role = current_user.get("role")
    uid = current_user.get("id")
    if role == "Admin":
        return
    if role == "Staff":
        return
    # User — own orders only
    if str(shipment.order.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own shipments",
        )
    if write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot modify shipments",
        )


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


def _get_active_provider(db, provider_id: UUID) -> DeliveryProvider:
    provider = (
        db.query(DeliveryProvider)
        .filter(DeliveryProvider.provider_id == provider_id)
        .first()
    )
    if not provider or not provider.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found or inactive",
        )
    return provider


# ── Endpoints — /shipments ───────────────────────────────────────────────────


@router.get("", response_model=list[ShipmentRead])
def list_shipments(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    order_id: Optional[UUID] = Query(None),
    shipment_status: Optional[str] = Query(None, alias="status"),
    provider_id: Optional[UUID] = Query(None),
):
    """Staff/Admin only. Filter by order_id, status, or provider_id."""
    _require_staff_or_admin(current_user)

    query = db.query(Shipment)
    if order_id is not None:
        query = query.filter(Shipment.order_id == order_id)
    if shipment_status is not None:
        query = query.filter(Shipment.status == shipment_status)
    if provider_id is not None:
        query = query.filter(Shipment.delivery_provider_id == provider_id)

    return [_shipment_to_read(s) for s in query.all()]


@router.get("/{shipment_id}", response_model=ShipmentRead)
def get_shipment(
    shipment_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Any authenticated. User can only view own shipment."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    _require_shipment_access(shipment, current_user, write=False)
    return _shipment_to_read(shipment)


@router.post("", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
def create_shipment(
    body: ShipmentCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin only. One shipment per order. Provider must be active."""
    _require_staff_or_admin(current_user)

    if not db.query(Order).filter(Order.order_id == body.order_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if db.query(Shipment).filter(Shipment.order_id == body.order_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shipment already exists for this order",
        )

    _get_active_provider(db, body.delivery_provider_id)

    shipment = Shipment(**body.model_dump())
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return _shipment_to_read(shipment)


@router.put("/{shipment_id}", response_model=ShipmentRead)
def update_shipment(
    shipment_id: UUID,
    body: ShipmentUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin only. Partial update. Validates provider if changed."""
    _require_staff_or_admin(current_user)

    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    updates = body.model_dump(exclude_none=True)
    if "delivery_provider_id" in updates:
        _get_active_provider(db, updates["delivery_provider_id"])

    for field, value in updates.items():
        setattr(shipment, field, value)

    db.commit()
    db.refresh(shipment)
    return _shipment_to_read(shipment)


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment(
    shipment_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    db.delete(shipment)
    db.commit()


# ── Endpoints — /orders/{order_id}/shipment ──────────────────────────────────


@order_router.get("", response_model=ShipmentRead)
def get_shipment_by_order(
    order_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Shortcut: get shipment by order_id. Any authenticated; User own order only."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    role = current_user.get("role")
    if role == "User" and str(order.user_id) != current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own order",
        )

    shipment = db.query(Shipment).filter(Shipment.order_id == order_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No shipment found for this order"
        )
    return _shipment_to_read(shipment)
