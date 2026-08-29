from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Cart, InventoryLocation, ProductVariant, StockReservation

router = APIRouter(prefix="/inventory/reservations", tags=["inventory"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class ReservationRead(BaseModel):
    reservation_id: UUID
    variant_id: UUID
    location_id: UUID
    cart_id: UUID
    quantity: int
    expires_at: datetime
    status: str

    # Denormalized
    location_name: Optional[str] = None
    product_name: Optional[str] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReservationCreate(BaseModel):
    variant_id: UUID
    location_id: UUID
    cart_id: UUID
    quantity: int
    expires_at: datetime
    status: str = "active"


class ReservationUpdate(BaseModel):
    quantity: Optional[int] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None  # active | released | expired


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


def _reservation_to_read(r: StockReservation) -> ReservationRead:
    variant = r.variant
    product = variant.product if variant else None
    location = r.location
    return ReservationRead(
        reservation_id=r.reservation_id,
        variant_id=r.variant_id,
        location_id=r.location_id,
        cart_id=r.cart_id,
        quantity=r.quantity,
        expires_at=r.expires_at,
        status=r.status,
        location_name=location.name if location else None,
        product_name=product.name if product else None,
        variant_model=variant.model if variant else None,
        variant_color=variant.color if variant else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ReservationRead])
def list_reservations(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    location_id: Optional[UUID] = Query(None),
    variant_id: Optional[UUID] = Query(None),
    cart_id: Optional[UUID] = Query(None),
    res_status: Optional[str] = Query(None, alias="status"),
):
    """Staff/Admin. Filter by location, variant, cart, or status."""
    _require_staff_or_admin(current_user)

    query = db.query(StockReservation)
    if location_id:
        query = query.filter(StockReservation.location_id == location_id)
    if variant_id:
        query = query.filter(StockReservation.variant_id == variant_id)
    if cart_id:
        query = query.filter(StockReservation.cart_id == cart_id)
    if res_status:
        query = query.filter(StockReservation.status == res_status)

    return [_reservation_to_read(r) for r in query.all()]


@router.get("/{reservation_id}", response_model=ReservationRead)
def get_reservation(
    reservation_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin."""
    _require_staff_or_admin(current_user)

    r = db.query(StockReservation).filter(
        StockReservation.reservation_id == reservation_id
    ).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found"
        )
    return _reservation_to_read(r)


@router.post("", response_model=ReservationRead, status_code=status.HTTP_201_CREATED)
def create_reservation(
    body: ReservationCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Manually create a stock reservation."""
    if not db.query(ProductVariant).filter(ProductVariant.variant_id == body.variant_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    if not db.query(InventoryLocation).filter(InventoryLocation.location_id == body.location_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    if not db.query(Cart).filter(Cart.cart_id == body.cart_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    r = StockReservation(**body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _reservation_to_read(r)


@router.put("/{reservation_id}", response_model=ReservationRead)
def update_reservation(
    reservation_id: UUID,
    body: ReservationUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff can update status (release/expire). Admin can update all fields."""
    _require_staff_or_admin(current_user)

    r = db.query(StockReservation).filter(
        StockReservation.reservation_id == reservation_id
    ).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found"
        )

    role = current_user.get("role")
    if role == "Staff":
        # Staff can only update status
        if body.status is not None:
            r.status = body.status
    else:
        # Admin can update all
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(r, field, value)

    db.commit()
    db.refresh(r)
    return _reservation_to_read(r)


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    r = db.query(StockReservation).filter(
        StockReservation.reservation_id == reservation_id
    ).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found"
        )
    db.delete(r)
    db.commit()
