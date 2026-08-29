from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import InventoryLocation, InventoryMovement, ProductVariant

router = APIRouter(prefix="/inventory/movements", tags=["inventory"])


# ── Schemas ──────────────────────────────────────────────────────────────────

ALLOWED_MOVEMENT_TYPES = {"in", "out", "transfer", "adjustment", "return"}


class MovementRead(BaseModel):
    movement_id: UUID
    variant_id: UUID
    location_id: UUID
    movement_type: str
    quantity: int

    # Denormalized for display
    location_name: Optional[str] = None
    product_name: Optional[str] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MovementCreate(BaseModel):
    variant_id: UUID
    location_id: UUID
    movement_type: str  # in | out | transfer | adjustment | return
    quantity: int


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


def _movement_to_read(m: InventoryMovement) -> MovementRead:
    variant = m.variant
    product = variant.product if variant else None
    location = m.location
    return MovementRead(
        movement_id=m.movement_id,
        variant_id=m.variant_id,
        location_id=m.location_id,
        movement_type=m.movement_type,
        quantity=m.quantity,
        location_name=location.name if location else None,
        product_name=product.name if product else None,
        variant_model=variant.model if variant else None,
        variant_color=variant.color if variant else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[MovementRead])
def list_movements(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    location_id: Optional[UUID] = Query(None),
    variant_id: Optional[UUID] = Query(None),
    movement_type: Optional[str] = Query(None),
):
    """Staff/Admin. Filter by location, variant, or movement type."""
    _require_staff_or_admin(current_user)

    query = db.query(InventoryMovement)
    if location_id:
        query = query.filter(InventoryMovement.location_id == location_id)
    if variant_id:
        query = query.filter(InventoryMovement.variant_id == variant_id)
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)

    return [_movement_to_read(m) for m in query.all()]


@router.get("/{movement_id}", response_model=MovementRead)
def get_movement(
    movement_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin."""
    _require_staff_or_admin(current_user)

    m = db.query(InventoryMovement).filter(
        InventoryMovement.movement_id == movement_id
    ).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
    return _movement_to_read(m)


@router.post("", response_model=MovementRead, status_code=status.HTTP_201_CREATED)
def create_movement(
    body: MovementCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """
    Staff/Admin can record inventory movements (in/out/transfer/adjustment/return).
    Movements are immutable once created — use a new movement to correct.
    """
    _require_staff_or_admin(current_user)

    if body.movement_type not in ALLOWED_MOVEMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid movement_type. Allowed: {sorted(ALLOWED_MOVEMENT_TYPES)}",
        )
    if body.quantity == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity cannot be zero",
        )

    if not db.query(ProductVariant).filter(ProductVariant.variant_id == body.variant_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    if not db.query(InventoryLocation).filter(InventoryLocation.location_id == body.location_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    m = InventoryMovement(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return _movement_to_read(m)


@router.delete("/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movement(
    movement_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Movements should generally not be deleted — use with caution."""
    m = db.query(InventoryMovement).filter(
        InventoryMovement.movement_id == movement_id
    ).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
    db.delete(m)
    db.commit()
