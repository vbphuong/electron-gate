from decimal import Decimal
from typing import Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin_or_staff
from api.models import Product, ProductVariant, ProductImage
from rag_engine.visual_search.celery_tasks import embed_product_image_task

logger = logging.getLogger(__name__)


def _dispatch_embed(image_id: str, image_url: str) -> None:
    """Fire-and-forget: send embed task to Celery. Logs a warning if Redis is unavailable."""
    try:
        embed_product_image_task.delay(image_id, image_url)
    except Exception as exc:
        logger.warning(
            f"Could not dispatch embed task for variant image {image_id} "
            f"(Redis may be offline): {exc}"
        )


router = APIRouter(
    prefix="/products/{product_id}/variants",
    tags=["product-variants"],
)


# ── Schemas ───────────────────────────────────────────────────────────


class VariantSpecBrief(BaseModel):
    spec_variant_id: UUID
    spec_name: str
    spec_value: str
    model_config = ConfigDict(from_attributes=True)


class VariantRead(BaseModel):
    variant_id: UUID
    product_id: UUID
    model: Optional[str] = None
    color: Optional[str] = None
    storage: Optional[str] = None
    price: Decimal
    status: str
    image_url: Optional[str] = None
    specs: list[VariantSpecBrief] = []
    model_config = ConfigDict(from_attributes=True)


class VariantCreate(BaseModel):
    model: Optional[str] = None
    color: Optional[str] = None
    storage: Optional[str] = None
    price: Decimal
    status: str = "active"
    image_url: Optional[str] = None


class VariantUpdate(BaseModel):
    model: Optional[str] = None
    color: Optional[str] = None
    storage: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[str] = None
    image_url: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────


def _get_product_or_404(db, product_id: UUID) -> Product:
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product


# ── Endpoints ─────────────────────────────────────────────────────────


@router.get("", response_model=list[VariantRead])
def list_variants(
    product_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    _get_product_or_404(db, product_id)
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .all()
    )
    return [VariantRead.model_validate(v) for v in variants]


@router.get("/{variant_id}", response_model=VariantRead)
def get_variant(
    product_id: UUID,
    variant_id: UUID,
    db: db_dependency,
    current_user: dict = Depends(get_current_user),
):
    _get_product_or_404(db, product_id)
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.variant_id == variant_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found",
        )
    return VariantRead.model_validate(variant)


@router.post("", response_model=VariantRead, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: UUID,
    payload: VariantCreate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    _get_product_or_404(db, product_id)
    data = payload.model_dump()
    variant = ProductVariant(product_id=product_id, **data)
    db.add(variant)
    db.flush()

    new_img_to_embed = None
    if variant.image_url:
        img = ProductImage(
            product_id=product_id,
            variant_id=variant.variant_id,
            image_url=variant.image_url,
            is_primary=False,
        )
        db.add(img)
        db.flush()
        new_img_to_embed = img

    db.commit()
    db.refresh(variant)

    if new_img_to_embed is not None:
        _dispatch_embed(str(new_img_to_embed.image_id), new_img_to_embed.image_url)

    return VariantRead.model_validate(variant)


@router.put("/{variant_id}", response_model=VariantRead)
def update_variant(
    product_id: UUID,
    variant_id: UUID,
    payload: VariantUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    _get_product_or_404(db, product_id)
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.variant_id == variant_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found",
        )

    new_img_to_embed = None

    if payload.model is not None:
        variant.model = payload.model
    if payload.color is not None:
        variant.color = payload.color
    if payload.storage is not None:
        variant.storage = payload.storage
    if payload.price is not None:
        variant.price = payload.price
    if payload.status is not None:
        variant.status = payload.status
    if payload.image_url is not None:
        variant.image_url = payload.image_url
        if payload.image_url:
            existing_img = (
                db.query(ProductImage)
                .filter(
                    ProductImage.product_id == product_id,
                    ProductImage.image_url == payload.image_url,
                )
                .first()
            )
            if existing_img:
                existing_img.variant_id = variant.variant_id
                if existing_img.embedding is None:
                    new_img_to_embed = existing_img
            else:
                new_img = ProductImage(
                    product_id=product_id,
                    variant_id=variant.variant_id,
                    image_url=payload.image_url,
                    is_primary=False,
                )
                db.add(new_img)
                db.flush()
                new_img_to_embed = new_img

    db.commit()
    db.refresh(variant)

    if new_img_to_embed is not None:
        _dispatch_embed(str(new_img_to_embed.image_id), new_img_to_embed.image_url)

    return VariantRead.model_validate(variant)


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    product_id: UUID,
    variant_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    _get_product_or_404(db, product_id)
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.variant_id == variant_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found",
        )
    db.delete(variant)
    db.commit()
