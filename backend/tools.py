"""Backend tools module for Order Assistant.

Provides deterministic tools executed against the Pandas dataset:
1. search_orders
2. calculate_order_analytics
3. get_order_details

Also provides OpenAI tool JSON schemas for model registration.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import pandas as pd

try:
    from backend.data import get_orders_df
except ImportError:
    from data import get_orders_df

logger = logging.getLogger("order_assistant.tools")

MONTH_NAME_TO_INT = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


def parse_month_input(month_val: Any) -> Optional[int]:
    """Helper to convert month names or integers to an integer 1-12."""
    if month_val is None:
        return None
    if isinstance(month_val, int):
        if 1 <= month_val <= 12:
            return month_val
        return None
    if isinstance(month_val, str):
        clean = month_val.strip().lower()
        if clean.isdigit():
            val = int(clean)
            return val if 1 <= val <= 12 else None
        return MONTH_NAME_TO_INT.get(clean)
    return None


def get_order_details(order_id: str) -> Dict[str, Any]:
    """Retrieve full details of a specific order by exact ID.

    Args:
        order_id: The order identifier (e.g. 'ORD-1025'). Case-insensitive.
    """
    if not order_id or not isinstance(order_id, str):
        return {"found": False, "error": "Order ID must be a non-empty string."}

    clean_id = order_id.strip().upper()
    df = get_orders_df()
    match = df[df["order_id"].str.upper() == clean_id]

    if match.empty:
        return {
            "found": False,
            "order_id": clean_id,
            "message": f"Order with ID '{clean_id}' was not found in the dataset.",
        }

    row = match.iloc[0]
    return {
        "found": True,
        "order": {
            "order_id": str(row["order_id"]),
            "order_date": str(row["order_date"]),
            "customer_name": str(row["customer_name"]),
            "city": str(row["city"]),
            "product": str(row["product"]),
            "category": str(row["category"]),
            "quantity": int(row["quantity"]),
            "unit_price_inr": float(row["unit_price_inr"]),
            "total_inr": float(row["total_inr"]),
            "payment_method": str(row["payment_method"]),
            "status": str(row["status"]),
        },
    }


def search_orders(
    order_id: Optional[str] = None,
    customer_name: Optional[str] = None,
    city: Optional[str] = None,
    product: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 15,
    offset: int = 0,
) -> Dict[str, Any]:
    """Retrieve orders matching various optional criteria.

    Args:
        order_id: Specific order ID.
        customer_name: Full or partial customer name (case-insensitive).
        city: City name (e.g. 'Chennai', 'Kochi', 'Bengaluru').
        product: Product name or keyword (e.g. 'Mouse', 'Keyboard').
        category: Category (e.g. 'Electronics', 'Accessories', 'Stationery', 'Furniture').
        status: Order status ('delivered', 'cancelled', 'returned', 'processing', 'shipped', or 'pending').
        payment_method: Payment method (e.g. 'UPI', 'Debit Card', 'Credit Card', 'Cash on Delivery', 'Net Banking').
        start_date: Filter orders on or after YYYY-MM-DD.
        end_date: Filter orders on or before YYYY-MM-DD.
        limit: Maximum number of rows to return (default 15, max 30).
    """
    df = get_orders_df()
    filtered = df.copy()

    # Apply filters
    if order_id:
        filtered = filtered[filtered["order_id"].str.upper() == order_id.strip().upper()]

    if customer_name:
        filtered = filtered[
            filtered["customer_name"].str.contains(customer_name.strip(), case=False, na=False)
        ]

    if city:
        filtered = filtered[filtered["city"].str.contains(city.strip(), case=False, na=False)]

    if product:
        filtered = filtered[
            filtered["product"].str.contains(product.strip(), case=False, na=False)
        ]

    if category:
        filtered = filtered[
            filtered["category"].str.contains(category.strip(), case=False, na=False)
        ]

    if status:
        st = status.strip().lower()
        if st in ["pending", "in-progress", "open"]:
            # In this dataset, active non-final orders are 'processing' and 'shipped'
            filtered = filtered[filtered["status"].str.lower().isin(["processing", "shipped", "pending"])]
        else:
            filtered = filtered[filtered["status"].str.lower() == st]

    if payment_method:
        filtered = filtered[
            filtered["payment_method"].str.contains(payment_method.strip(), case=False, na=False)
        ]

    if start_date:
        try:
            start_dt = pd.to_datetime(start_date.strip())
            filtered = filtered[filtered["order_date_parsed"] >= start_dt]
        except Exception:
            return {"error": f"Invalid start_date format '{start_date}'. Expected YYYY-MM-DD."}

    if end_date:
        try:
            end_dt = pd.to_datetime(end_date.strip())
            filtered = filtered[filtered["order_date_parsed"] <= end_dt]
        except Exception:
            return {"error": f"Invalid end_date format '{end_date}'. Expected YYYY-MM-DD."}

    total_matches = len(filtered)
    safe_offset = max(0, int(offset))
    if safe_offset > 0:
        filtered = filtered.iloc[safe_offset:]
    safe_limit = max(1, min(int(limit), 30))
    truncated = (total_matches - safe_offset) > safe_limit
    subset = filtered.head(safe_limit)

    records: List[Dict[str, Any]] = []
    for _, row in subset.iterrows():
        records.append({
            "order_id": str(row["order_id"]),
            "order_date": str(row["order_date"]),
            "customer_name": str(row["customer_name"]),
            "city": str(row["city"]),
            "product": str(row["product"]),
            "category": str(row["category"]),
            "quantity": int(row["quantity"]),
            "unit_price_inr": float(row["unit_price_inr"]),
            "total_inr": float(row["total_inr"]),
            "payment_method": str(row["payment_method"]),
            "status": str(row["status"]),
        })

    return {
        "total_matches": total_matches,
        "returned_count": len(records),
        "truncated": truncated,
        "limit_applied": safe_limit,
        "orders": records,
    }


def calculate_order_analytics(
    operation: str,
    category: Optional[str] = None,
    month: Optional[Any] = None,
    year: Optional[int] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    customer_name: Optional[str] = None,
    top_n: int = 5,
) -> Dict[str, Any]:
    """Execute deterministic quantitative analytics and aggregations on the orders dataset.

    Args:
        operation: The calculation operation. Supported:
            - 'count_orders': Count orders matching filters
            - 'sum_revenue': Sum recorded totals and delivered revenue
            - 'average_order_value': Average order value (mean total_inr)
            - 'customer_spending_ranking': Rank customers by total spend
            - 'category_breakdown': Revenue and order count grouped by category
            - 'city_breakdown': Revenue and order count grouped by city
            - 'status_breakdown': Order count and monetary sum grouped by status
            - 'monthly_trend': Monthly aggregation of orders and revenue
        category: Filter by product category (e.g. 'Electronics')
        month: Filter by month name ('August', 'July', etc.) or integer (1-12)
        year: Filter by year (e.g. 2026)
        city: Filter by city name (e.g. 'Chennai')
        status: Filter by status ('delivered', 'cancelled', 'returned', 'processing', 'shipped', 'all')
        customer_name: Filter by customer name
        top_n: For ranking operations, number of top entries to return (default 5)
    """
    valid_ops = {
        "count_orders",
        "sum_revenue",
        "average_order_value",
        "customer_spending_ranking",
        "category_breakdown",
        "city_breakdown",
        "status_breakdown",
        "monthly_trend",
    }

    clean_op = operation.strip().lower()
    if clean_op not in valid_ops:
        return {
            "error": f"Invalid operation '{operation}'. Supported operations: {sorted(list(valid_ops))}"
        }

    df = get_orders_df()
    filtered = df.copy()

    # Pre-filtering
    filter_desc: Dict[str, Any] = {}

    if category:
        filtered = filtered[filtered["category"].str.contains(category.strip(), case=False, na=False)]
        filter_desc["category"] = category

    if city:
        filtered = filtered[filtered["city"].str.contains(city.strip(), case=False, na=False)]
        filter_desc["city"] = city

    if customer_name:
        filtered = filtered[filtered["customer_name"].str.contains(customer_name.strip(), case=False, na=False)]
        filter_desc["customer_name"] = customer_name

    month_num = parse_month_input(month)
    if month_num is not None:
        filtered = filtered[filtered["order_date_parsed"].dt.month == month_num]
        filter_desc["month"] = month_num

    if year is not None:
        filtered = filtered[filtered["order_date_parsed"].dt.year == int(year)]
        filter_desc["year"] = int(year)

    if status and status.strip().lower() != "all":
        st = status.strip().lower()
        if st in ["pending", "in-progress"]:
            filtered = filtered[filtered["status"].str.lower().isin(["processing", "shipped"])]
            filter_desc["status"] = "pending (processing/shipped)"
        elif st in ["non-cancelled", "active"]:
            filtered = filtered[filtered["status"].str.lower() != "cancelled"]
            filter_desc["status"] = "non-cancelled"
        else:
            filtered = filtered[filtered["status"].str.lower() == st]
            filter_desc["status"] = st

    matching_orders_count = len(filtered)

    # 1. COUNT ORDERS
    if clean_op == "count_orders":
        return {
            "operation": "count_orders",
            "filters_applied": filter_desc,
            "total_orders": matching_orders_count,
            "status_breakdown": filtered["status"].value_counts().to_dict(),
        }

    # 2. SUM REVENUE / VALUE
    if clean_op == "sum_revenue":
        total_recorded = float(filtered["total_inr"].sum())
        delivered_subset = filtered[filtered["status"] == "delivered"]
        delivered_revenue = float(delivered_subset["total_inr"].sum())
        non_cancelled_subset = filtered[filtered["status"] != "cancelled"]
        non_cancelled_revenue = float(non_cancelled_subset["total_inr"].sum())
        cancelled_subset = filtered[filtered["status"] == "cancelled"]
        cancelled_value = float(cancelled_subset["total_inr"].sum())

        status_breakdown = {}
        for status_val, group in filtered.groupby("status"):
            status_breakdown[str(status_val)] = {
                "order_count": int(len(group)),
                "total_inr": float(group["total_inr"].sum()),
            }

        return {
            "operation": "sum_revenue",
            "filters_applied": filter_desc,
            "total_orders": matching_orders_count,
            "total_recorded_value_inr": total_recorded,
            "realized_delivered_revenue_inr": delivered_revenue,
            "non_cancelled_value_inr": non_cancelled_revenue,
            "cancelled_value_inr": cancelled_value,
            "status_breakdown": status_breakdown,
            "note": (
                "Total recorded value includes all matched orders. Realized revenue includes only 'delivered' orders. "
                "Non-cancelled value excludes 'cancelled' orders."
            ),
        }

    # 3. AVERAGE ORDER VALUE
    if clean_op == "average_order_value":
        if matching_orders_count == 0:
            return {
                "operation": "average_order_value",
                "filters_applied": filter_desc,
                "total_orders": 0,
                "average_order_value_inr": 0.0,
            }
        avg_all = float(filtered["total_inr"].mean())
        delivered_subset = filtered[filtered["status"] == "delivered"]
        avg_delivered = float(delivered_subset["total_inr"].mean()) if not delivered_subset.empty else 0.0

        return {
            "operation": "average_order_value",
            "filters_applied": filter_desc,
            "total_orders": matching_orders_count,
            "average_order_value_inr": round(avg_all, 2),
            "average_delivered_order_value_inr": round(avg_delivered, 2),
        }

    # 4. CUSTOMER SPENDING RANKING
    if clean_op == "customer_spending_ranking":
        if matching_orders_count == 0:
            return {"operation": clean_op, "ranking": [], "total_customers": 0}

        grouped = filtered.groupby("customer_name").agg(
            total_spent_inr=("total_inr", "sum"),
            order_count=("order_id", "count"),
            delivered_spent_inr=("total_inr", lambda s: s[filtered.loc[s.index, "status"] == "delivered"].sum()),
            cancelled_count=("status", lambda s: (s == "cancelled").sum()),
        ).reset_index()

        grouped = grouped.sort_values(by="total_spent_inr", ascending=False)
        top_customers = grouped.head(max(1, min(int(top_n), 20))).to_dict(orient="records")

        top_spender = top_customers[0] if top_customers else None

        return {
            "operation": "customer_spending_ranking",
            "filters_applied": filter_desc,
            "ranking": top_customers,
            "highest_spending_customer": top_spender,
            "total_customers_evaluated": len(grouped),
        }

    # 5. CATEGORY BREAKDOWN
    if clean_op == "category_breakdown":
        if matching_orders_count == 0:
            return {"operation": clean_op, "breakdown": []}

        cat_group = filtered.groupby("category").agg(
            total_revenue_inr=("total_inr", "sum"),
            delivered_revenue_inr=("total_inr", lambda s: s[filtered.loc[s.index, "status"] == "delivered"].sum()),
            order_count=("order_id", "count"),
        ).reset_index().sort_values(by="total_revenue_inr", ascending=False)

        return {
            "operation": "category_breakdown",
            "filters_applied": filter_desc,
            "breakdown": cat_group.to_dict(orient="records"),
        }

    # 6. CITY BREAKDOWN
    if clean_op == "city_breakdown":
        if matching_orders_count == 0:
            return {"operation": clean_op, "breakdown": []}

        city_group = filtered.groupby("city").agg(
            total_revenue_inr=("total_inr", "sum"),
            delivered_revenue_inr=("total_inr", lambda s: s[filtered.loc[s.index, "status"] == "delivered"].sum()),
            order_count=("order_id", "count"),
        ).reset_index().sort_values(by="order_count", ascending=False)

        return {
            "operation": "city_breakdown",
            "filters_applied": filter_desc,
            "breakdown": city_group.to_dict(orient="records"),
        }

    # 7. STATUS BREAKDOWN
    if clean_op == "status_breakdown":
        if matching_orders_count == 0:
            return {"operation": clean_op, "breakdown": {}}

        status_group = filtered.groupby("status").agg(
            order_count=("order_id", "count"),
            total_value_inr=("total_inr", "sum"),
        ).to_dict(orient="index")

        return {
            "operation": "status_breakdown",
            "filters_applied": filter_desc,
            "breakdown": status_group,
            "total_orders": matching_orders_count,
        }

    # 8. MONTHLY TREND
    if clean_op == "monthly_trend":
        if matching_orders_count == 0:
            return {"operation": clean_op, "trend": []}

        temp_df = filtered.copy()
        temp_df["month_year"] = temp_df["order_date_parsed"].dt.strftime("%Y-%m")
        trend_group = temp_df.groupby("month_year").agg(
            total_revenue_inr=("total_inr", "sum"),
            delivered_revenue_inr=("total_inr", lambda s: s[temp_df.loc[s.index, "status"] == "delivered"].sum()),
            order_count=("order_id", "count"),
        ).reset_index().sort_values(by="month_year")

        return {
            "operation": "monthly_trend",
            "filters_applied": filter_desc,
            "trend": trend_group.to_dict(orient="records"),
        }

    return {"error": "Unexpected branch reached in analytics."}


# OpenAI Tool Specifications for model function calling
OPENAI_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_order_details",
            "description": "Look up complete details for a single specific order ID (e.g., 'ORD-1025'). Use this whenever the user asks about a specific order ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The exact order identifier, such as 'ORD-1025'.",
                    }
                },
                "required": ["order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_orders",
            "description": "Search and retrieve individual order records matching various filters such as customer name, city, category, product, status, or date range. Use this when the user wants to see a list of orders or check which orders meet specific criteria (e.g. pending orders, orders from a specific city, or products ordered by a customer).",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "Optional exact order ID filter.",
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "Optional customer name filter (e.g. 'Sneha Pillai', 'Vikram Reddy'). Case-insensitive, partial matching supported.",
                    },
                    "city": {
                        "type": "string",
                        "description": "Optional city filter (e.g. 'Chennai', 'Kochi', 'Bengaluru', 'Thiruvananthapuram', 'Hyderabad', 'Pune').",
                    },
                    "product": {
                        "type": "string",
                        "description": "Optional product name filter (e.g. 'Wireless Mouse', 'Standing Desk').",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional product category ('Electronics', 'Accessories', 'Stationery', 'Furniture').",
                    },
                    "status": {
                        "type": "string",
                        "description": "Optional order status ('delivered', 'cancelled', 'returned', 'processing', 'shipped', or 'pending'). Note that 'pending' matches unfulfilled/in-progress orders ('processing' and 'shipped').",
                    },
                    "payment_method": {
                        "type": "string",
                        "description": "Optional payment method ('UPI', 'Debit Card', 'Credit Card', 'Cash on Delivery', 'Net Banking').",
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Optional start date in YYYY-MM-DD format.",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Optional end date in YYYY-MM-DD format.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of order records to return (default 15, max 30).",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_order_analytics",
            "description": "Perform deterministic mathematical and statistical aggregations on the order data. Use this for counting orders (e.g. cancelled orders, orders in July), summing revenue (e.g. total revenue in September, Electronics revenue in August), finding the highest spending customer, average order value, or getting breakdowns by category, city, or status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": [
                            "count_orders",
                            "sum_revenue",
                            "average_order_value",
                            "customer_spending_ranking",
                            "category_breakdown",
                            "city_breakdown",
                            "status_breakdown",
                            "monthly_trend",
                        ],
                        "description": "The specific quantitative operation to perform.",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter (e.g. 'Electronics', 'Accessories', 'Stationery', 'Furniture').",
                    },
                    "month": {
                        "type": "string",
                        "description": "Optional month name (e.g. 'August', 'July', 'September', 'June') or number (1-12).",
                    },
                    "year": {
                        "type": "integer",
                        "description": "Optional year filter (e.g. 2026).",
                    },
                    "city": {
                        "type": "string",
                        "description": "Optional city filter (e.g. 'Chennai', 'Kochi').",
                    },
                    "status": {
                        "type": "string",
                        "description": "Optional status filter ('delivered', 'cancelled', 'returned', 'processing', 'shipped', 'pending', or 'all').",
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "Optional customer name filter.",
                    },
                    "top_n": {
                        "type": "integer",
                        "description": "Number of top ranked items to return for ranking operations (default 5).",
                    },
                },
                "required": ["operation"],
            },
        },
    },
]

# Mapping of tool name to Python callable
TOOL_DISPATCH = {
    "get_order_details": get_order_details,
    "search_orders": search_orders,
    "calculate_order_analytics": calculate_order_analytics,
}
