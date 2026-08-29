from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin
from api.models import City, Country

router = APIRouter(tags=["locations"])

countries_router = APIRouter(prefix="/countries")
cities_router = APIRouter(prefix="/cities")


# ── Schemas ──────────────────────────────────────────────────────────────────


class CountryRead(BaseModel):
    country_id: UUID
    country_name: str
    model_config = ConfigDict(from_attributes=True)


class CountryCreate(BaseModel):
    country_name: str


class CountryUpdate(BaseModel):
    country_name: Optional[str] = None


class CityRead(BaseModel):
    city_id: UUID
    city_name: str
    postal_code: Optional[str] = None
    country_id: UUID
    country_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class CityCreate(BaseModel):
    city_name: str
    postal_code: Optional[str] = None
    country_id: UUID


class CityUpdate(BaseModel):
    city_name: Optional[str] = None
    postal_code: Optional[str] = None
    country_id: Optional[UUID] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _city_to_read(city: City) -> CityRead:
    return CityRead(
        city_id=city.city_id,
        city_name=city.city_name,
        postal_code=city.postal_code,
        country_id=city.country_id,
        country_name=city.country.country_name if city.country else None,
    )


# ── Country endpoints ─────────────────────────────────────────────────────────


@countries_router.get("", response_model=list[CountryRead])
def list_countries(
    db: db_dependency,
    _: dict = Depends(get_current_user),
    search: Optional[str] = Query(None),
):
    """Any authenticated user. Optional name search."""
    query = db.query(Country)
    if search:
        query = query.filter(Country.country_name.ilike(f"%{search}%"))
    return query.order_by(Country.country_name.asc()).all()


@countries_router.get("/{country_id}", response_model=CountryRead)
def get_country(
    country_id: UUID,
    db: db_dependency,
    _: dict = Depends(get_current_user),
):
    """Any authenticated user."""
    country = db.query(Country).filter(Country.country_id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    return country


@countries_router.get("/{country_id}/cities", response_model=list[CityRead])
def list_cities_by_country(
    country_id: UUID,
    db: db_dependency,
    _: dict = Depends(get_current_user),
):
    """List all cities for a country. Any authenticated user."""
    if not db.query(Country).filter(Country.country_id == country_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    cities = db.query(City).filter(City.country_id == country_id).order_by(City.city_name.asc()).all()
    return [_city_to_read(c) for c in cities]


@countries_router.post("", response_model=CountryRead, status_code=status.HTTP_201_CREATED)
def create_country(
    body: CountryCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Duplicate name → 400."""
    if db.query(Country).filter(Country.country_name == body.country_name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Country already exists",
        )
    country = Country(country_name=body.country_name)
    db.add(country)
    db.commit()
    db.refresh(country)
    return country


@countries_router.put("/{country_id}", response_model=CountryRead)
def update_country(
    country_id: UUID,
    body: CountryUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    country = db.query(Country).filter(Country.country_id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    if body.country_name is not None:
        dup = db.query(Country).filter(
            Country.country_name == body.country_name,
            Country.country_id != country_id,
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Country name already exists",
            )
        country.country_name = body.country_name
    db.commit()
    db.refresh(country)
    return country


@countries_router.delete("/{country_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_country(
    country_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Blocks if country has cities."""
    country = db.query(Country).filter(Country.country_id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    if db.query(City).filter(City.country_id == country_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Country has existing cities",
        )
    db.delete(country)
    db.commit()


# ── City endpoints ────────────────────────────────────────────────────────────


@cities_router.get("", response_model=list[CityRead])
def list_cities(
    db: db_dependency,
    _: dict = Depends(get_current_user),
    country_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
):
    """Any authenticated user. Filter by country or search by name."""
    query = db.query(City)
    if country_id:
        query = query.filter(City.country_id == country_id)
    if search:
        query = query.filter(City.city_name.ilike(f"%{search}%"))
    return [_city_to_read(c) for c in query.order_by(City.city_name.asc()).all()]


@cities_router.get("/{city_id}", response_model=CityRead)
def get_city(
    city_id: UUID,
    db: db_dependency,
    _: dict = Depends(get_current_user),
):
    """Any authenticated user."""
    city = db.query(City).filter(City.city_id == city_id).first()
    if not city:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return _city_to_read(city)


@cities_router.post("", response_model=CityRead, status_code=status.HTTP_201_CREATED)
def create_city(
    body: CityCreate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only."""
    if not db.query(Country).filter(Country.country_id == body.country_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    city = City(**body.model_dump())
    db.add(city)
    db.commit()
    db.refresh(city)
    return _city_to_read(city)


@cities_router.put("/{city_id}", response_model=CityRead)
def update_city(
    city_id: UUID,
    body: CityUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Partial update."""
    city = db.query(City).filter(City.city_id == city_id).first()
    if not city:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    if body.country_id is not None:
        if not db.query(Country).filter(Country.country_id == body.country_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(city, field, value)
    db.commit()
    db.refresh(city)
    return _city_to_read(city)


@cities_router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_city(
    city_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin),
):
    """Admin only. Blocks if city has addresses."""
    from api.models import Address
    city = db.query(City).filter(City.city_id == city_id).first()
    if not city:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    if db.query(Address).filter(Address.city_id == city_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="City has existing addresses",
        )
    db.delete(city)
    db.commit()


# Attach sub-routers to main router
router.include_router(countries_router)
router.include_router(cities_router)
