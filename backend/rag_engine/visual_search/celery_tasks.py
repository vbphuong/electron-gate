"""
Celery Tasks — Visual Search Embedding Pipeline.

Task: embed_product_image_task
  - Downloads a product image from its public URL.
  - Runs YOLO detection → crops the dominant object.
  - Encodes the crop with SigLIP → 768-d vector.
  - Persists the vector to product_images.embedding in PostgreSQL.

If YOLO detects nothing, logs a warning and leaves embedding as NULL.
All errors are caught and logged — the task does NOT raise to avoid
crashing the Celery worker.
"""

from __future__ import annotations

import io
import logging
import os
import sys

import requests
from celery.utils.log import get_task_logger

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from rag_engine.celery_app import celery_app
from api.deps import get_db
from api.models import ProductImage

logger = get_task_logger(__name__)

_DOWNLOAD_TIMEOUT = 30  # seconds


@celery_app.task(
    bind=True,
    name="rag_engine.visual_search.celery_tasks.embed_product_image_task",
    max_retries=2,
    default_retry_delay=30,
)
def embed_product_image_task(self, image_id: str, image_url: str):
    """
    Background task: compute SigLIP embedding for a product image and store it.

    Args:
        image_id: UUID string of the ProductImage record.
        image_url: Public URL of the image to download and embed.
    """
    logger.info(f"[embed_task] Starting for image_id={image_id}, url={image_url}")

    # ── 1. Download image ────────────────────────────────────────────────────
    try:
        response = requests.get(image_url, timeout=_DOWNLOAD_TIMEOUT)
        response.raise_for_status()
        image_bytes = response.content
    except Exception as exc:
        logger.warning(
            f"[embed_task] Failed to download image {image_url}: {exc}. "
            f"Skipping embedding for image_id={image_id}."
        )
        return {"status": "skipped", "reason": "download_failed", "image_id": image_id}

    # ── 2. Open PIL image ────────────────────────────────────────────────────
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        logger.warning(f"[embed_task] Cannot open image bytes for {image_id}: {exc}")
        return {"status": "skipped", "reason": "invalid_image", "image_id": image_id}

    # ── 3. YOLO detect → crop ────────────────────────────────────────────────
    try:
        from rag_engine.visual_search.yolo_detector import detect_and_crop
        cropped = detect_and_crop(image)
    except ValueError as exc:
        # No object detected — log and skip. Don't write NULL explicitly
        # (it's already NULL). This is expected for some product images.
        logger.warning(
            f"[embed_task] YOLO detected nothing for image_id={image_id}: {exc}. "
            f"Embedding will remain NULL."
        )
        return {"status": "skipped", "reason": "no_object_detected", "image_id": image_id}
    except Exception as exc:
        logger.error(f"[embed_task] YOLO error for image_id={image_id}: {exc}", exc_info=True)
        return {"status": "error", "reason": str(exc), "image_id": image_id}

    # ── 4. SigLIP encode ─────────────────────────────────────────────────────
    try:
        from rag_engine.visual_search.siglip_encoder import encode_image
        vector = encode_image(cropped)
    except Exception as exc:
        logger.error(f"[embed_task] SigLIP error for image_id={image_id}: {exc}", exc_info=True)
        return {"status": "error", "reason": str(exc), "image_id": image_id}

    # ── 5. Persist to DB ─────────────────────────────────────────────────────
    from uuid import UUID
    db = next(get_db())
    try:
        img_uuid = UUID(image_id)
        record = db.query(ProductImage).filter(ProductImage.image_id == img_uuid).first()
        if not record:
            logger.warning(f"[embed_task] ProductImage {image_id} no longer exists — skipping.")
            return {"status": "skipped", "reason": "record_deleted", "image_id": image_id}

        record.embedding = vector
        db.commit()
        logger.info(f"[embed_task] Embedding saved for image_id={image_id} (dim={len(vector)}).")
        return {"status": "completed", "image_id": image_id, "dim": len(vector)}

    except Exception as exc:
        db.rollback()
        logger.error(f"[embed_task] DB commit failed for image_id={image_id}: {exc}", exc_info=True)
        return {"status": "error", "reason": str(exc), "image_id": image_id}
    finally:
        db.close()


@celery_app.task(
    name="rag_engine.visual_search.celery_tasks.backfill_unembedded_images_task",
)
def backfill_unembedded_images_task():
    """
    Scans for all ProductImage rows where embedding IS NULL and dispatches embed tasks.
    """
    db = next(get_db())
    try:
        images = db.query(ProductImage).filter(ProductImage.embedding.is_(None)).all()
        logger.info(f"[backfill] Found {len(images)} unembedded product images to process.")
        for img in images:
            if img.image_url:
                embed_product_image_task.delay(str(img.image_id), img.image_url)
        return {"status": "dispatched", "count": len(images)}
    finally:
        db.close()


if __name__ == "__main__":
    # Direct execution helper: run locally without Celery to embed all NULL images
    import sys
    db = next(get_db())
    try:
        unembedded = db.query(ProductImage).filter(ProductImage.embedding.is_(None)).all()
        print(f"Found {len(unembedded)} images with embedding = NULL. Processing directly...")
        for img in unembedded:
            print(f"Embedding image_id={img.image_id}, url={img.image_url[:60]}...")
            res = embed_product_image_task(str(img.image_id), img.image_url)
            print(f"Result: {res}")
        print("Done backfilling embeddings!")
    finally:
        db.close()
