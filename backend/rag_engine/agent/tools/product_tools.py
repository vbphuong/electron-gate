"""
Product tools for the AI Agent.

Provides functions for searching products, fetching product details,
and recommending products based on user preferences.

All functions are read-only database queries.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from api.models import Product, ProductVariant, Category, ProductSpec, VariantSpec, InventoryStock


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _variant_to_dict(variant: ProductVariant) -> dict[str, Any]:
    """Serialize a ProductVariant row to a plain dict."""
    return {
        "variant_id": str(variant.variant_id),
        "model": variant.model,
        "color": variant.color,
        "storage": variant.storage,
        "price": float(variant.price) if variant.price is not None else None,
        "status": variant.status,
    }


def _product_summary(product: Product, include_variants: bool = True) -> dict[str, Any]:
    """Serialize a Product row (with optional variants) to a plain dict."""
    result: dict[str, Any] = {
        "product_id": str(product.product_id),
        "name": product.name,
        "description": product.description,
        "categories": [c.name for c in product.categories],
        "image_url": product.image_url,
    }
    if include_variants:
        result["variants"] = [_variant_to_dict(v) for v in product.variants if v.status == "active"]
    return result


# ---------------------------------------------------------------------------
# Tool 1: search_products
# ---------------------------------------------------------------------------

def search_products(
    db: Session,
    query: str = "",
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 8,
) -> dict[str, Any]:
    """
    Search the product catalog.

    Args:
        db: SQLAlchemy session.
        query: Free-text search term matched against product name and description.
        category: Optional category name filter (case-insensitive).
        min_price: Minimum variant price filter.
        max_price: Maximum variant price filter.
        limit: Maximum number of products to return.

    Returns:
        dict with 'products' list and 'total' count.
    """
    q = db.query(Product)

    # Category filter (join through many-to-many)
    if category:
        q = q.join(Product.categories).filter(
            Category.name.ilike(f"%{category}%")
        )

    # Text filter on product name / description
    if query:
        q = q.filter(
            Product.name.ilike(f"%{query}%")
            | Product.description.ilike(f"%{query}%")
        )

    products = q.limit(limit * 3).all()  # over-fetch before price filter

    # Price filter — apply after loading (price lives on variants)
    results: list[dict] = []
    for product in products:
        active_variants = [v for v in product.variants if v.status == "active"]

        if min_price is not None:
            active_variants = [v for v in active_variants if float(v.price) >= min_price]
        if max_price is not None:
            active_variants = [v for v in active_variants if float(v.price) <= max_price]

        if not active_variants:
            continue

        summary = _product_summary(product, include_variants=False)
        summary["variants"] = [_variant_to_dict(v) for v in active_variants]
        summary["price_range"] = {
            "min": min(float(v.price) for v in active_variants),
            "max": max(float(v.price) for v in active_variants),
        }
        results.append(summary)

        if len(results) >= limit:
            break

    return {"products": results, "total": len(results)}


# ---------------------------------------------------------------------------
# Tool 2: get_product_detail
# ---------------------------------------------------------------------------

def get_product_detail(
    db: Session,
    product_name: str | None = None,
    product_id: str | None = None,
) -> dict[str, Any]:
    """
    Get full details for a single product including specs and all variants.

    Args:
        db: SQLAlchemy session.
        product_name: Partial or full product name (case-insensitive).
        product_id: Exact product UUID (takes priority over name).

    Returns:
        dict with product info, specs, and variants. Empty dict if not found.
    """
    product: Product | None = None

    if product_id:
        product = db.query(Product).filter(
            Product.product_id == product_id
        ).first()
    elif product_name:
        product = db.query(Product).filter(
            Product.name.ilike(f"%{product_name}%")
        ).first()

    if not product:
        return {"error": f"Product not found: {product_name or product_id}"}

    # Product-level specs
    product_specs = [
        {"name": s.spec_name, "value": s.spec_value}
        for s in product.specs
    ]

    # Variants with their individual specs
    variants_data: list[dict] = []
    for variant in product.variants:
        v_dict = _variant_to_dict(variant)
        v_dict["specs"] = [
            {"name": s.spec_name, "value": s.spec_value}
            for s in variant.specs
        ]
        variants_data.append(v_dict)

    return {
        "product_id": str(product.product_id),
        "name": product.name,
        "description": product.description,
        "categories": [c.name for c in product.categories],
        "image_url": product.image_url,
        "product_specs": product_specs,
        "variants": variants_data,
    }


# ---------------------------------------------------------------------------
# Tool 3: recommend_products
# ---------------------------------------------------------------------------

def recommend_products(
    db: Session,
    use_case: str = "",
    budget: float | None = None,
    preferences: str = "",
    limit: int = 5,
) -> dict[str, Any]:
    """
    Recommend products matching a use-case and budget.

    Filters to active variants that are in stock (qty_available > 0) and
    within the budget. Returns products sorted by relevance (name match).

    Args:
        db: SQLAlchemy session.
        use_case: Description of intended use (e.g., "gaming", "photo editing").
        budget: Maximum price the user is willing to pay.
        preferences: Additional preferences (e.g., "lightweight", "blue color").
        limit: Max recommendations.

    Returns:
        dict with 'recommendations' list.
    """
    # Build search terms from use_case + preferences
    search_term = f"{use_case} {preferences}".strip()

    q = db.query(Product)
    if search_term:
        q = q.filter(
            Product.name.ilike(f"%{search_term}%")
            | Product.description.ilike(f"%{search_term}%")
        )

    products = q.limit(50).all()

    recommendations: list[dict] = []

    for product in products:
        active_variants = [v for v in product.variants if v.status == "active"]

        # Budget filter
        if budget is not None:
            active_variants = [v for v in active_variants if float(v.price) <= budget]

        # Stock filter — only recommend items that are in stock
        in_stock_variants: list[ProductVariant] = []
        for variant in active_variants:
            total_available = sum(
                s.qty_available for s in variant.inventory_stocks
            )
            if total_available > 0:
                in_stock_variants.append(variant)

        if not in_stock_variants:
            continue

        summary = _product_summary(product, include_variants=False)
        summary["recommended_variants"] = [_variant_to_dict(v) for v in in_stock_variants[:3]]
        summary["reason"] = f"Matches your interest in '{use_case}'" + (
            f" and preference for '{preferences}'" if preferences else ""
        )
        recommendations.append(summary)

        if len(recommendations) >= limit:
            break

    return {"recommendations": recommendations, "total": len(recommendations)}


# ---------------------------------------------------------------------------
# Tool 4: get_categories
# ---------------------------------------------------------------------------

def get_categories(db: Session) -> dict[str, Any]:
    """
    List all available product categories.

    Returns:
        dict with 'categories' list of category names.
    """
    categories = db.query(Category).all()
    return {
        "categories": [{"id": str(c.category_id), "name": c.name} for c in categories]
    }
