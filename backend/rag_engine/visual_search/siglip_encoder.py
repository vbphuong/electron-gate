"""
SigLIP Image Encoder — Singleton lazy-load pattern.

Model: google/siglip-base-patch16-224
Output: 768-dimensional L2-normalized float vector.

Usage:
    from rag_engine.visual_search.siglip_encoder import encode_image
    from PIL import Image
    img = Image.open("product.jpg")
    vector = encode_image(img)   # list[float], len == 768
"""

from __future__ import annotations

import logging
from threading import Lock
from typing import TYPE_CHECKING

from PIL import Image

logger = logging.getLogger(__name__)

_MODEL_NAME = "google/siglip-base-patch16-224"

# ── Singleton state ──────────────────────────────────────────────────────────
_processor = None
_model = None
_lock = Lock()


def _load_model():
    """Lazy-load SigLIP processor and vision model (runs once per process)."""
    global _processor, _model

    if _processor is not None and _model is not None:
        return

    with _lock:
        # Double-checked locking
        if _processor is not None and _model is not None:
            return

        logger.info(f"Loading SigLIP model '{_MODEL_NAME}' — this may take a moment on first load...")
        try:
            from transformers import AutoProcessor, AutoModel
            import torch

            # use_fast=True avoids SentencePiece dependency and is faster
            _processor = AutoProcessor.from_pretrained(_MODEL_NAME, use_fast=True)
            _model = AutoModel.from_pretrained(_MODEL_NAME)
            _model.eval()  # Inference mode — disables dropout etc.

            logger.info(f"SigLIP model loaded successfully (device=CPU).")
        except Exception as exc:
            logger.error(f"Failed to load SigLIP model: {exc}", exc_info=True)
            raise


def encode_image(image: Image.Image) -> list[float]:
    """
    Encode a PIL image into a 768-dimensional L2-normalized vector using SigLIP.

    Args:
        image: PIL.Image in any mode (will be converted to RGB internally).

    Returns:
        list[float] of length 768, L2-normalized (suitable for cosine similarity via pgvector).

    Raises:
        RuntimeError: If the model fails to load or encode.
    """
    import torch

    _load_model()

    # Ensure RGB (handles RGBA, grayscale, palette images)
    if image.mode != "RGB":
        image = image.convert("RGB")

    try:
        inputs = _processor(images=image, return_tensors="pt")

        with torch.no_grad():
            # Extract vision features from the vision tower only
            image_features = _model.get_image_features(**inputs)

        # L2 normalize so cosine similarity == dot product (matches pgvector behaviour)
        image_features = torch.nn.functional.normalize(image_features, p=2, dim=-1)

        vector = image_features.squeeze(0).tolist()
        logger.debug(f"SigLIP encoded image → vector dim={len(vector)}")
        return vector

    except Exception as exc:
        logger.error(f"SigLIP encode_image failed: {exc}", exc_info=True)
        raise RuntimeError(f"SigLIP encoding error: {exc}") from exc
