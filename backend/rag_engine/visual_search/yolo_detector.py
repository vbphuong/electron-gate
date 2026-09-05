"""
YOLOv8m Object Detector — Singleton lazy-load pattern.

Detects the highest-confidence object in an image and returns the cropped region.
If no object is detected, raises ValueError (caller should return HTTP 422 to user).

Usage:
    from rag_engine.visual_search.yolo_detector import detect_and_crop
    from PIL import Image
    img = Image.open("scene.jpg")
    crop = detect_and_crop(img)   # PIL.Image of the detected object
"""

from __future__ import annotations

import logging
from threading import Lock

from PIL import Image

logger = logging.getLogger(__name__)

_YOLO_MODEL_NAME = "yolov8m.pt"  # Auto-downloaded by ultralytics on first use
_CONFIDENCE_THRESHOLD = 0.25      # Minimum confidence to accept a detection

# ── Singleton state ──────────────────────────────────────────────────────────
_yolo_model = None
_lock = Lock()


def _load_model():
    """Lazy-load YOLOv8m model (auto-downloads weights if not cached)."""
    global _yolo_model

    if _yolo_model is not None:
        return

    with _lock:
        if _yolo_model is not None:
            return

        logger.info(f"Loading YOLO model '{_YOLO_MODEL_NAME}' — downloading if needed...")
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO(_YOLO_MODEL_NAME)
            logger.info("YOLO model loaded successfully.")
        except Exception as exc:
            logger.error(f"Failed to load YOLO model: {exc}", exc_info=True)
            raise


def detect_and_crop(image: Image.Image) -> Image.Image:
    """
    Run YOLOv8m detection on a PIL image and return the crop of the
    highest-confidence detected object.

    Args:
        image: PIL.Image in any mode (converted to RGB internally).

    Returns:
        PIL.Image: Cropped region of the best-detected object.

    Raises:
        ValueError: If no object is detected above the confidence threshold.
        RuntimeError: If the model fails to load or run inference.
    """
    _load_model()

    if image.mode != "RGB":
        image = image.convert("RGB")

    try:
        # Run inference (verbose=False suppresses YOLO console output)
        results = _yolo_model(image, verbose=False, conf=_CONFIDENCE_THRESHOLD)
    except Exception as exc:
        logger.error(f"YOLO inference error: {exc}", exc_info=True)
        raise RuntimeError(f"YOLO inference failed: {exc}") from exc

    if not results or len(results) == 0:
        raise ValueError("No object detected in the image.")

    result = results[0]

    # No boxes detected
    if result.boxes is None or len(result.boxes) == 0:
        raise ValueError("No object detected in the image.")

    # Find the bounding box with the highest confidence score
    boxes = result.boxes
    confidences = boxes.conf.tolist()

    if not confidences or max(confidences) < _CONFIDENCE_THRESHOLD:
        raise ValueError("No object detected with sufficient confidence.")

    best_idx = confidences.index(max(confidences))
    best_box = boxes.xyxy[best_idx].tolist()  # [x1, y1, x2, y2] in pixel coords

    x1, y1, x2, y2 = [int(c) for c in best_box]

    # Clamp to image bounds (safety)
    img_w, img_h = image.size
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(img_w, x2)
    y2 = min(img_h, y2)

    if x2 <= x1 or y2 <= y1:
        raise ValueError("Detected bounding box has zero area.")

    crop = image.crop((x1, y1, x2, y2))

    logger.debug(
        f"YOLO detected object at [{x1},{y1},{x2},{y2}] "
        f"conf={max(confidences):.3f}, crop_size={crop.size}"
    )

    return crop
