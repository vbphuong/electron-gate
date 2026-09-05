"""
Inventory tools for the AI Agent.

Provides stock-checking functions with role-aware output:
- Regular users see availability status only (In Stock / Low Stock / Out of Stock)
- Staff and Admin see exact quantities and warehouse locations
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from api.models import Product, ProductVariant, InventoryStock, InventoryLocation


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _availability_label(qty_available: int) -> str:
    if qty_available <= 0:
        return "Out of Stock"
    if qty_available <= 5:
        return "Low Stock"
    return "In Stock"


# ---------------------------------------------------------------------------
# Tool 1: check_stock
# ---------------------------------------------------------------------------

def check_stock(
    db: Session,
    user_role: str,
    product_name: str | None = None,
    variant_id: str | None = None,
) -> dict[str, Any]:
    """
    Check the stock level for a product or specific variant.

    Role-aware output:
    - User   → sees only availability label per variant (In Stock / Low Stock / Out of Stock)
    - Staff/Admin → sees qty_available, qty_reserved, and warehouse location details

    Args:
        db: SQLAlchemy session.
        user_role: The current user's role ("User", "Staff", or "Admin").
        product_name: Product name to search (case-insensitive). Checked first.
        variant_id: Exact variant UUID to look up (takes priority).

    Returns:
        dict with product name and per-variant stock info.
    """
    is_privileged = user_role in ("Staff", "Admin")

    if variant_id:
        variants = db.query(ProductVariant).filter(
            ProductVariant.variant_id == variant_id
        ).all()
        if not variants:
            return {"error": f"Variant not found: {variant_id}"}
        product_name_display = variants[0].product.name if variants else "Unknown"
    elif product_name:
        product = db.query(Product).filter(
            Product.name.ilike(f"%{product_name}%")
        ).first()
        if not product:
            return {"error": f"Product not found: {product_name}"}
        product_name_display = product.name
        variants = [v for v in product.variants if v.status == "active"]
    else:
        return {"error": "Provide product_name or variant_id"}

    stock_info: list[dict] = []
    for variant in variants:
        stocks: list[InventoryStock] = variant.inventory_stocks
        total_available = sum(s.qty_available for s in stocks)
        total_reserved = sum(s.qty_reserved for s in stocks)

        variant_entry: dict[str, Any] = {
            "variant_id": str(variant.variant_id),
            "model": variant.model,
            "color": variant.color,
            "storage": variant.storage,
            "availability": _availability_label(total_available),
        }

        if is_privileged:
            # Full detail for Staff/Admin
            variant_entry["qty_available"] = total_available
            variant_entry["qty_reserved"] = total_reserved
            variant_entry["locations"] = [
                {
                    "location_name": s.location.name if s.location else "Unknown",
                    "location_type": s.location.type if s.location else "Unknown",
                    "qty_available": s.qty_available,
                    "qty_reserved": s.qty_reserved,
                }
                for s in stocks
            ]

        stock_info.append(variant_entry)

    return {
        "product_name": product_name_display,
        "variants": stock_info,
    }


# ---------------------------------------------------------------------------
# Tool 2: get_low_stock_products  (Staff / Admin only)
# ---------------------------------------------------------------------------

def get_low_stock_products(
    db: Session,
    threshold: int = 5,
    limit: int = 20,
) -> dict[str, Any]:
    """
    List product variants where total available stock is at or below the threshold.

    Intended for Staff and Admin only — enforce at the tool_registry level.

    Args:
        db: SQLAlchemy session.
        threshold: Stock quantity at or below which a variant is considered low.
        limit: Max variants to return.

    Returns:
        dict with 'low_stock_variants' list.
    """
    stocks: list[InventoryStock] = db.query(InventoryStock).all()

    # Aggregate per variant
    variant_totals: dict[str, int] = {}
    for s in stocks:
        key = str(s.variant_id)
        variant_totals[key] = variant_totals.get(key, 0) + s.qty_available

    low_stock_ids = [vid for vid, qty in variant_totals.items() if qty <= threshold]

    if not low_stock_ids:
        return {"low_stock_variants": [], "total": 0}

    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.variant_id.in_(low_stock_ids))
        .limit(limit)
        .all()
    )

    results = []
    for v in variants:
        results.append(
            {
                "variant_id": str(v.variant_id),
                "product_name": v.product.name if v.product else "Unknown",
                "model": v.model,
                "color": v.color,
                "storage": v.storage,
                "qty_available": variant_totals.get(str(v.variant_id), 0),
                "price": float(v.price),
            }
        )

    # Sort by qty_available ascending (most critical first)
    results.sort(key=lambda x: x["qty_available"])

    return {"low_stock_variants": results, "total": len(results)}
