"""
Visual Search Router — Server-side YOLO + SigLIP pipeline.

Endpoint: POST /visual-search/encode-and-search
  - Accepts a raw image file upload (multipart/form-data).
  - Runs YOLO object detection → crops the dominant object.
  - Encodes the crop with SigLIP → 768-d vector.
  - Queries pgvector (cosine distance) on product_images to return top-k matches.

Any authenticated user can call this endpoint.
"""

from __future__ import annotations

import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user
from api.models import Category, Product, ProductImage, ProductVariant

router = APIRouter(prefix="/visual-search", tags=["visual-search"])


# ── Response Schema ───────────────────────────────────────────────────────────


class VisualSearchResultItem(BaseModel):
    product_id: UUID
    product_name: str
    product_description: Optional[str] = None
    matched_image_id: UUID
    matched_image_url: str
    variant_id: Optional[UUID] = None
    variant_model: Optional[str] = None
    variant_color: Optional[str] = None
    variant_price: Optional[float] = None
    similarity_score: float

    model_config = ConfigDict(from_attributes=True)


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/encode-and-search", response_model=list[VisualSearchResultItem])
async def encode_and_search(
    db: db_dependency,
    _: dict = Depends(get_current_user),
    file: UploadFile = File(..., description="Image file to search with"),
    top_k: int = Form(default=8, ge=1, le=50),
    min_similarity: float = Form(default=0.0, ge=0.0, le=1.0),
    category_id: Optional[str] = Form(default=None),
):
    """
    Upload an image → detect object with YOLO → encode with SigLIP → pgvector search.

    Returns a ranked list of the most visually similar products in the catalog.
    """
    # ── 1. Validate file type ────────────────────────────────────────────────
    allowed_content_types = {
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
    }
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

    import pathlib
    ext = pathlib.Path(file.filename or "").suffix.lower()
    if file.content_type not in allowed_content_types and ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload JPG, PNG, WEBP, GIF, or AVIF.",
        )

    # ── 2. Read image bytes ──────────────────────────────────────────────────
    try:
        image_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file: {exc}",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── 3. Open PIL image ────────────────────────────────────────────────────
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(image_bytes))
        image.load()  # Force decode to catch corrupt images early
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot decode image file. It may be corrupt: {exc}",
        )

    # ── 4. YOLO object detection → crop ──────────────────────────────────────
    try:
        from rag_engine.visual_search.yolo_detector import detect_and_crop
        cropped = detect_and_crop(image)
    except ValueError as exc:
        # No object detected — tell the user
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Không nhận diện được sản phẩm trong ảnh. Hãy thử ảnh rõ hơn hoặc chụp gần hơn.",
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Object detection failed: {exc}",
        )

    # ── 5. SigLIP encode → 768-d vector ─────────────────────────────────────
    try:
        from rag_engine.visual_search.siglip_encoder import encode_image
        query_vector = encode_image(cropped)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image encoding failed: {exc}",
        )

    # ── 6. pgvector cosine distance search ───────────────────────────────────
    distance_expr = ProductImage.embedding.cosine_distance(query_vector)
    similarity_expr = 1 - distance_expr

    cat_uuid: Optional[UUID] = None
    if category_id:
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category_id format (must be UUID).",
            )

    query = (
        db.query(
            ProductImage,
            Product,
            ProductVariant,
            similarity_expr.label("similarity"),
        )
        .join(Product, ProductImage.product_id == Product.product_id)
        .outerjoin(ProductVariant, ProductImage.variant_id == ProductVariant.variant_id)
        .filter(ProductImage.embedding.isnot(None))
    )

    if cat_uuid is not None:
        query = query.join(Product.categories).filter(Category.category_id == cat_uuid)

    # Fetch top_k * 2 to allow deduplication by product_id
    results = query.order_by(distance_expr.asc()).limit(top_k * 2).all()

    # ── 7. Deduplicate by (product_id, variant_id) and apply min_similarity filter ──
    seen_variants: set[tuple[UUID, Optional[UUID]]] = set()
    output: list[VisualSearchResultItem] = []

    for img, prod, var, sim in results:
        sim_val = float(sim) if sim is not None else 0.0

        if sim_val < min_similarity:
            continue

        var_id = var.variant_id if var else None
        pair_key = (prod.product_id, var_id)
        if pair_key in seen_variants:
            continue

        seen_variants.add(pair_key)
        output.append(
            VisualSearchResultItem(
                product_id=prod.product_id,
                product_name=prod.name,
                product_description=prod.description,
                matched_image_id=img.image_id,
                matched_image_url=img.image_url,
                variant_id=var_id,
                variant_model=var.model if var else None,
                variant_color=var.color if var else None,
                variant_price=float(var.price) if var and var.price else None,
                similarity_score=round(sim_val, 4),
            )
        )

        if len(output) >= top_k:
            break

    return output
