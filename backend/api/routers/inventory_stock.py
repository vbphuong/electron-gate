from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import InventoryLocation, InventoryStock, ProductVariant

router = APIRouter(prefix="/inventory/stock", tags=["inventory"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class StockRead(BaseModel):
    variant_id: UUID
    location_id: UUID
    qty_available: int
    qty_reserved: int

    # Denormalized for display
    location_name: Optional[str] = None
    product_name: Optional[str] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None
    variant_storage: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StockCreate(BaseModel):
    variant_id: UUID
    location_id: UUID
    qty_available: int = 0
    qty_reserved: int = 0


class StockUpdate(BaseModel):
    qty_available: Optional[int] = None
    qty_reserved: Optional[int] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_staff_or_admin(current_user: dict):
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )


def _stock_to_read(stock: InventoryStock) -> StockRead:
    variant = stock.variant
    product = variant.product if variant else None
    location = stock.location
    return StockRead(
        variant_id=stock.variant_id,
        location_id=stock.location_id,
        qty_available=stock.qty_available,
        qty_reserved=stock.qty_reserved,
        location_name=location.name if location else None,
        product_name=product.name if product else None,
        variant_model=variant.model if variant else None,
        variant_color=variant.color if variant else None,
        variant_storage=variant.storage if variant else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[StockRead])
def list_stock(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    location_id: Optional[UUID] = Query(None),
    variant_id: Optional[UUID] = Query(None),
    low_stock: Optional[int] = Query(None, description="Filter where qty_available <= threshold"),
):
    """Staff/Admin. Filter by location, variant, or low stock threshold."""
    _require_staff_or_admin(current_user)

    query = db.query(InventoryStock)
    if location_id:
        query = query.filter(InventoryStock.location_id == location_id)
    if variant_id:
        query = query.filter(InventoryStock.variant_id == variant_id)
    if low_stock is not None:
        query = query.filter(InventoryStock.qty_available <= low_stock)

    return [_stock_to_read(s) for s in query.all()]


@router.get("/{variant_id}/{location_id}", response_model=StockRead)
def get_stock(
    variant_id: UUID,
    location_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff/Admin. Get stock for a specific variant+location combo."""
    _require_staff_or_admin(current_user)

    stock = db.query(InventoryStock).filter(
        InventoryStock.variant_id == variant_id,
        InventoryStock.location_id == location_id,
    ).first()
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock record not found")
    return _stock_to_read(stock)


@router.post("", response_model=StockRead, status_code=status.HTTP_201_CREATED)
def create_stock(
    body: StockCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Initialize stock for a variant at a location."""
    # Validate variant and location exist
    if not db.query(ProductVariant).filter(ProductVariant.variant_id == body.variant_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    if not db.query(InventoryLocation).filter(InventoryLocation.location_id == body.location_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    # Check duplicate
    if db.query(InventoryStock).filter(
        InventoryStock.variant_id == body.variant_id,
        InventoryStock.location_id == body.location_id,
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock record already exists for this variant+location",
        )

    stock = InventoryStock(**body.model_dump())
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return _stock_to_read(stock)


@router.put("/{variant_id}/{location_id}", response_model=StockRead)
def update_stock(
    variant_id: UUID,
    location_id: UUID,
    body: StockUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Staff can edit qty. Admin full update."""
    _require_staff_or_admin(current_user)

    stock = db.query(InventoryStock).filter(
        InventoryStock.variant_id == variant_id,
        InventoryStock.location_id == location_id,
    ).first()
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock record not found")

    if body.qty_available is not None:
        stock.qty_available = body.qty_available
    if body.qty_reserved is not None:
        stock.qty_reserved = body.qty_reserved

    db.commit()
    db.refresh(stock)
    return _stock_to_read(stock)


@router.delete("/{variant_id}/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock(
    variant_id: UUID,
    location_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    stock = db.query(InventoryStock).filter(
        InventoryStock.variant_id == variant_id,
        InventoryStock.location_id == location_id,
    ).first()
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock record not found")
    db.delete(stock)
    db.commit()
