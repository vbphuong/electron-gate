"""
Tool Registry for the AI Agent.

Registers all available tools, defines their OpenAI function-calling schemas,
and enforces role-based access (which tools are visible to which role).
"""

from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# OpenAI Tool Schemas (JSON Schema format for function_calling)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: dict[str, dict] = {
    "search_products": {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": (
                "Search the product catalog by keyword, category, or price range. "
                "Use this when the user asks about what products are available, "
                "wants to find a product, or asks about prices in general."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Free-text search term, e.g. 'iPhone 15' or 'gaming laptop'",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category name filter, e.g. 'Smartphones', 'Laptops'",
                    },
                    "min_price": {
                        "type": "number",
                        "description": "Optional minimum price in USD",
                    },
                    "max_price": {
                        "type": "number",
                        "description": "Optional maximum price in USD",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of products to return (default 8)",
                        "default": 8,
                    },
                },
                "required": [],
            },
        },
    },

    "get_product_detail": {
        "type": "function",
        "function": {
            "name": "get_product_detail",
            "description": (
                "Get full details for a specific product: all variants (model, color, storage, price), "
                "technical specs, and description. Use when the user asks about a specific product's "
                "specs, exact price, or available configurations."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Product name or partial name, e.g. 'Samsung Galaxy S24'",
                    },
                    "product_id": {
                        "type": "string",
                        "description": "Exact product UUID (use if known)",
                    },
                },
                "required": [],
            },
        },
    },

    "recommend_products": {
        "type": "function",
        "function": {
            "name": "recommend_products",
            "description": (
                "Recommend products that match a use-case and budget. "
                "Use when the user says 'I need something for...', 'recommend me', "
                "'what should I buy for...', or describes their requirements. "
                "Only returns products that are currently in stock."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "use_case": {
                        "type": "string",
                        "description": "Intended use, e.g. 'gaming', 'photo editing', 'everyday use'",
                    },
                    "budget": {
                        "type": "number",
                        "description": "Maximum price the user is willing to pay in USD",
                    },
                    "preferences": {
                        "type": "string",
                        "description": "Additional preferences, e.g. 'lightweight', 'blue color', 'long battery life'",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of recommendations to return (default 5)",
                        "default": 5,
                    },
                },
                "required": ["use_case"],
            },
        },
    },

    "get_categories": {
        "type": "function",
        "function": {
            "name": "get_categories",
            "description": (
                "List all available product categories in the store. "
                "Use when you need to know what categories exist before filtering by category, "
                "or when the user asks 'what kinds of products do you sell?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },

    "check_stock": {
        "type": "function",
        "function": {
            "name": "check_stock",
            "description": (
                "Check stock availability for a product or specific variant. "
                "Use when the user asks 'is this in stock?', 'how many are left?', "
                "or 'do you have this available?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Product name or partial name",
                    },
                    "variant_id": {
                        "type": "string",
                        "description": "Exact variant UUID (use if known for precision)",
                    },
                },
                "required": [],
            },
        },
    },

    "get_low_stock_products": {
        "type": "function",
        "function": {
            "name": "get_low_stock_products",
            "description": (
                "List product variants that are low on stock (below a threshold). "
                "Staff and Admin only. Use for inventory management queries."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "integer",
                        "description": "Stock quantity at or below which a variant is considered low (default 5)",
                        "default": 5,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of variants to return (default 20)",
                        "default": 20,
                    },
                },
                "required": [],
            },
        },
    },

    "get_my_orders": {
        "type": "function",
        "function": {
            "name": "get_my_orders",
            "description": (
                "Retrieve the order history for the current user. "
                "Use when the user asks 'show me my orders', 'what did I order recently?', "
                "or 'do I have any pending orders?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status_filter": {
                        "type": "string",
                        "description": "Optional status to filter by, e.g. 'pending', 'delivered', 'shipped'",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of orders to return (default 10)",
                        "default": 10,
                    },
                },
                "required": [],
            },
        },
    },

    "get_order_detail": {
        "type": "function",
        "function": {
            "name": "get_order_detail",
            "description": (
                "Get full details of a specific order: items, quantities, prices, "
                "payment status, and shipment tracking. "
                "Use when the user mentions a specific order number."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "order_number": {
                        "type": "string",
                        "description": "The order number, e.g. 'ORD-20240501-0001'",
                    },
                },
                "required": ["order_number"],
            },
        },
    },

    "search_knowledge_base": {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": (
                "Search uploaded knowledge-base documents (manuals, policies, guides, PDFs) "
                "for an answer. Use when the question is about store policies, return/refund rules, "
                "product manuals, warranty information, or any topic likely covered in documents "
                "rather than live product/order data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question or topic to search for in documents",
                    },
                    "document_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of specific document UUIDs to restrict the search",
                    },
                },
                "required": ["query"],
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Role-based access control map
# ---------------------------------------------------------------------------

TOOL_ROLES: dict[str, list[str]] = {
    "search_products":       ["User", "Staff", "Admin"],
    "get_product_detail":    ["User", "Staff", "Admin"],
    "recommend_products":    ["User", "Staff", "Admin"],
    "get_categories":        ["User", "Staff", "Admin"],
    "check_stock":           ["User", "Staff", "Admin"],   # role-aware output inside the tool
    "get_low_stock_products": ["Staff", "Admin"],
    "get_my_orders":         ["User", "Staff", "Admin"],
    "get_order_detail":      ["User", "Staff", "Admin"],   # ownership check inside the tool
    "search_knowledge_base": ["User", "Staff", "Admin"],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_tool_schemas_for_role(role: str) -> list[dict[str, Any]]:
    """
    Return the list of OpenAI tool schemas accessible to the given role.

    Args:
        role: The user's role string ("User", "Staff", or "Admin").

    Returns:
        List of tool schema dicts ready to be passed to ChatOpenAI.bind_tools().
    """
    allowed = [name for name, roles in TOOL_ROLES.items() if role in roles]
    return [TOOL_SCHEMAS[name] for name in allowed if name in TOOL_SCHEMAS]


def is_tool_allowed(tool_name: str, role: str) -> bool:
    """Check whether a specific tool is allowed for the given role."""
    return role in TOOL_ROLES.get(tool_name, [])
