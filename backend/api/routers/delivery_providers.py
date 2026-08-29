from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import DeliveryProvider, Shipment

router = APIRouter(prefix="/delivery-providers", tags=["delivery-providers"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class DeliveryProviderRead(BaseModel):
    provider_id: UUID
    name: str
    phone: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class DeliveryProviderCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    is_active: bool = True


class DeliveryProviderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[DeliveryProviderRead])
def list_delivery_providers(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    is_active: Optional[bool] = Query(default=None),
):
    """User sees active only. Staff/Admin can filter by is_active."""
    role = current_user.get("role")
    query = db.query(DeliveryProvider)

    if role == "User":
        query = query.filter(DeliveryProvider.is_active == True)
    else:
        if is_active is not None:
            query = query.filter(DeliveryProvider.is_active == is_active)

    return query.order_by(DeliveryProvider.name.asc()).all()


@router.get("/{provider_id}", response_model=DeliveryProviderRead)
def get_delivery_provider(
    provider_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """User gets 404 for inactive providers."""
    provider = (
        db.query(DeliveryProvider)
        .filter(DeliveryProvider.provider_id == provider_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    if current_user.get("role") == "User" and not provider.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    return provider


@router.post("", response_model=DeliveryProviderRead, status_code=status.HTTP_201_CREATED)
def create_delivery_provider(
    payload: DeliveryProviderCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Duplicate name → 400."""
    if db.query(DeliveryProvider).filter(DeliveryProvider.name == payload.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A provider with this name already exists",
        )
    provider = DeliveryProvider(**payload.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@router.put("/{provider_id}", response_model=DeliveryProviderRead)
def update_delivery_provider(
    provider_id: UUID,
    payload: DeliveryProviderUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Partial update."""
    provider = (
        db.query(DeliveryProvider)
        .filter(DeliveryProvider.provider_id == provider_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    updates = payload.model_dump(exclude_none=True)
    if "name" in updates:
        dup = (
            db.query(DeliveryProvider)
            .filter(
                DeliveryProvider.name == updates["name"],
                DeliveryProvider.provider_id != provider_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A provider with this name already exists",
            )

    for field, value in updates.items():
        setattr(provider, field, value)

    db.commit()
    db.refresh(provider)
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_provider(
    provider_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Blocks if provider has existing shipments."""
    provider = (
        db.query(DeliveryProvider)
        .filter(DeliveryProvider.provider_id == provider_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    if db.query(Shipment).filter(Shipment.delivery_provider_id == provider_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider has existing shipments",
        )

    db.delete(provider)
    db.commit()
