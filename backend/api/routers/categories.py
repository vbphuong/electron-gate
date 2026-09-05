from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import asc

from api.deps import db_dependency, get_current_user, get_optional_user, require_admin_or_staff
from api.models import Category


# ── Schemas ──────────────────────────────────────────────────────────────────

class CategoryRead(BaseModel):
    category_id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


# ── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    db: db_dependency,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    categories = db.query(Category).order_by(asc(Category.name)).all()
    return categories


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(
    category_id: UUID,
    db: db_dependency,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    existing = db.query(Category).filter(Category.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )

    category = Category(name=payload.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if payload.name is not None:
        existing = (
            db.query(Category)
            .filter(Category.name == payload.name, Category.category_id != category_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )
        category.name = payload.name

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if category.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category has associated products",
        )

    db.delete(category)
    db.commit()
