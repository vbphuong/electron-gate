"""
Order tools for the AI Agent.

Allows users to query their own order history and order details.
Staff and Admin can query any order by order number.

All functions are read-only.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from api.models import Order, OrderItem, Payment, Shipment


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _order_to_dict(order: Order, include_items: bool = False) -> dict[str, Any]:
    result: dict[str, Any] = {
        "order_id": str(order.order_id),
        "order_number": order.order_number,
        "status": order.order_status,
        "subtotal": float(order.subtotal),
        "shipping_fee": float(order.shipping_fee),
        "discount_amount": float(order.discount_amount),
        "total": float(order.subtotal) + float(order.shipping_fee) - float(order.discount_amount),
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }

    if order.payment:
        result["payment"] = {
            "method": order.payment.payment_method,
            "status": order.payment.payment_status,
            "amount": float(order.payment.amount),
            "paid_at": order.payment.paid_at.isoformat() if order.payment.paid_at else None,
        }

    if order.shipment:
        result["shipment"] = {
            "tracking_number": order.shipment.tracking_number,
            "status": order.shipment.status,
            "delivered_at": order.shipment.delivered_at.isoformat() if order.shipment.delivered_at else None,
        }

    if include_items:
        result["items"] = [
            {
                "product_name": item.variant.product.name if item.variant and item.variant.product else "Unknown",
                "model": item.variant.model if item.variant else None,
                "color": item.variant.color if item.variant else None,
                "storage": item.variant.storage if item.variant else None,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "line_total": float(item.unit_price) * item.quantity,
            }
            for item in order.items
        ]

    return result


# ---------------------------------------------------------------------------
# Tool 1: get_my_orders
# ---------------------------------------------------------------------------

def get_my_orders(
    db: Session,
    user_id: str,
    user_role: str,
    status_filter: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the order history for the current user.

    Staff and Admin can omit ownership scope (returns all orders when user_role is Staff/Admin
    and a specific user_id is passed — but still scopes by that user_id for fairness).

    Args:
        db: SQLAlchemy session.
        user_id: UUID of the currently authenticated user.
        user_role: Role of the current user.
        status_filter: Optional order status to filter by (e.g., "pending", "delivered").
        limit: Maximum number of orders to return.

    Returns:
        dict with 'orders' list and 'total' count.
    """
    try:
        uid = UUID(str(user_id))
    except ValueError:
        return {"error": "Invalid user ID format"}

    q = db.query(Order).filter(Order.user_id == uid)

    if status_filter:
        q = q.filter(Order.order_status.ilike(f"%{status_filter}%"))

    orders = q.order_by(Order.created_at.desc()).limit(limit).all()

    return {
        "orders": [_order_to_dict(o) for o in orders],
        "total": len(orders),
    }


# ---------------------------------------------------------------------------
# Tool 2: get_order_detail
# ---------------------------------------------------------------------------

def get_order_detail(
    db: Session,
    user_id: str,
    user_role: str,
    order_number: str,
) -> dict[str, Any]:
    """
    Get full details for a single order including line items, payment, and shipment.

    Ownership is enforced: a regular User can only view their own orders.
    Staff and Admin can view any order.

    Args:
        db: SQLAlchemy session.
        user_id: UUID of the currently authenticated user.
        user_role: Role of the current user.
        order_number: The order number string (e.g., "ORD-20240501-0001").

    Returns:
        dict with order details. Error dict if not found or access denied.
    """
    order = db.query(Order).filter(Order.order_number == order_number).first()

    if not order:
        return {"error": f"Order not found: {order_number}"}

    # Enforce ownership for regular users
    is_privileged = user_role in ("Staff", "Admin")
    if not is_privileged:
        try:
            uid = UUID(str(user_id))
        except ValueError:
            return {"error": "Invalid user ID format"}
        if order.user_id != uid:
            return {"error": "Access denied: this order does not belong to your account."}

    return _order_to_dict(order, include_items=True)
