from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import InventoryLocation, InventoryMovement, InventoryStock, StockReservation

router = APIRouter(prefix="/inventory/locations", tags=["inventory"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class LocationRead(BaseModel):
    location_id: UUID
    name: str
    type: str
    address: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class LocationCreate(BaseModel):
    name: str
    type: str
    address: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[LocationRead])
def list_locations(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    location_type: Optional[str] = Query(None, alias="type"),
):
    """Staff/Admin only. Optionally filter by type (e.g. warehouse, store)."""
    _require_staff_or_admin(current_user)
    query = db.query(InventoryLocation)
    if location_type:
        query = query.filter(InventoryLocation.type == location_type)
    return query.order_by(InventoryLocation.name.asc()).all()


@router.get("/{location_id}", response_model=LocationRead)
def get_location(
    location_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin only."""
    _require_staff_or_admin(current_user)
    loc = db.query(InventoryLocation).filter(
        InventoryLocation.location_id == location_id
    ).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return loc


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    body: LocationCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    loc = InventoryLocation(**body.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: UUID,
    body: LocationUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Partial update."""
    loc = db.query(InventoryLocation).filter(
        InventoryLocation.location_id == location_id
    ).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(loc, field, value)

    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Blocks if stocks or movements exist."""
    loc = db.query(InventoryLocation).filter(
        InventoryLocation.location_id == location_id
    ).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if db.query(InventoryStock).filter(InventoryStock.location_id == location_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location has existing stock records",
        )
    if db.query(InventoryMovement).filter(InventoryMovement.location_id == location_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location has existing movement records",
        )

    db.delete(loc)
    db.commit()
