from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import Address, City, Order, User

router = APIRouter(prefix="/addresses", tags=["addresses"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class AddressRead(BaseModel):
    address_id: UUID
    user_id: UUID
    address_line: str
    city_id: UUID
    is_default: bool

    # Denormalized for display
    city_name: Optional[str] = None
    postal_code: Optional[str] = None
    country_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AddressCreate(BaseModel):
    address_line: str
    city_id: UUID
    is_default: bool = False


class AddressUpdate(BaseModel):
    address_line: Optional[str] = None
    city_id: Optional[UUID] = None
    is_default: Optional[bool] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _address_to_read(addr: Address) -> AddressRead:
    city = addr.city
    country = city.country if city else None
    return AddressRead(
        address_id=addr.address_id,
        user_id=addr.user_id,
        address_line=addr.address_line,
        city_id=addr.city_id,
        is_default=addr.is_default,
        city_name=city.city_name if city else None,
        postal_code=city.postal_code if city else None,
        country_name=country.country_name if country else None,
    )


def _ensure_single_default(db, user_id: UUID, exclude_address_id: UUID = None):
    """When setting an address as default, unset all others for the user."""
    query = db.query(Address).filter(
        Address.user_id == user_id,
        Address.is_default == True,
    )
    if exclude_address_id:
        query = query.filter(Address.address_id != exclude_address_id)
    for addr in query.all():
        addr.is_default = False


def _require_address_access(addr: Address, current_user: dict, write: bool = False):
    role = current_user.get("role")
    uid = current_user.get("id")
    if role == "Admin":
        return
    if role == "Staff":
        if write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff can only view addresses",
            )
        return
    # User — own addresses only
    if str(addr.user_id) != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own addresses",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/me", response_model=list[AddressRead])
def list_my_addresses(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """Get all addresses of the current user. Sorted: default first."""
    addresses = (
        db.query(Address)
        .filter(Address.user_id == current_user["id"])
        .order_by(Address.is_default.desc())
        .all()
    )
    return [_address_to_read(a) for a in addresses]


@router.get("", response_model=list[AddressRead])
def list_addresses(
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
    user_id: Optional[UUID] = Query(None),
):
    """
    Staff/Admin only.
    Filter by user_id to view a specific user's addresses (for support).
    """
    role = current_user.get("role")
    if role not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )
    query = db.query(Address)
    if user_id:
        query = query.filter(Address.user_id == user_id)
    return [_address_to_read(a) for a in query.order_by(Address.is_default.desc()).all()]


@router.get("/{address_id}", response_model=AddressRead)
def get_address(
    address_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """User own, Staff view any, Admin view any."""
    addr = db.query(Address).filter(Address.address_id == address_id).first()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    _require_address_access(addr, current_user, write=False)
    return _address_to_read(addr)


@router.post("", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
def create_address(
    body: AddressCreate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """
    User creates own address. Admin can also create for any user (pass user_id via admin endpoint).
    If is_default=True, unsets all other defaults for the user.
    """
    user_id = current_user["id"]

    if not db.query(City).filter(City.city_id == body.city_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    if body.is_default:
        _ensure_single_default(db, user_id)

    addr = Address(user_id=user_id, **body.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return _address_to_read(addr)


@router.post("/admin", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
def admin_create_address(
    body: AddressCreate,
    target_user_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin creates an address for any user."""
    if not db.query(User).filter(User.user_id == target_user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not db.query(City).filter(City.city_id == body.city_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    if body.is_default:
        _ensure_single_default(db, target_user_id)
    addr = Address(user_id=target_user_id, **body.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return _address_to_read(addr)


@router.put("/{address_id}", response_model=AddressRead)
def update_address(
    address_id: UUID,
    body: AddressUpdate,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """User can edit own. Admin can edit any."""
    addr = db.query(Address).filter(Address.address_id == address_id).first()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    _require_address_access(addr, current_user, write=True)

    if body.city_id is not None:
        if not db.query(City).filter(City.city_id == body.city_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    # If setting as default, clear others
    if body.is_default is True:
        _ensure_single_default(db, addr.user_id, exclude_address_id=address_id)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(addr, field, value)

    db.commit()
    db.refresh(addr)
    return _address_to_read(addr)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    """User can delete own. Admin can delete any. Blocks if address is linked to an order."""
    addr = db.query(Address).filter(Address.address_id == address_id).first()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    _require_address_access(addr, current_user, write=True)

    if db.query(Order).filter(Order.shipping_address_id == address_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address is linked to an existing order and cannot be deleted",
        )

    db.delete(addr)
    db.commit()
