"""Tests for deterministic tools against the actual dataset."""

from backend.tools import (
    calculate_order_analytics,
    get_order_details,
    search_orders,
)


def test_get_existing_order_details():
    """Verify looking up an existing order returns accurate data matching the CSV."""
    res = get_order_details("ORD-1025")
    assert res["found"] is True
    order = res["order"]
    assert order["order_id"] == "ORD-1025"
    assert order["customer_name"] == "Karthik Rao"
    assert order["product"] == "Wireless Mouse"
    assert order["category"] == "Electronics"
    assert order["quantity"] == 3
    assert order["unit_price_inr"] == 799.0
    assert order["total_inr"] == 2397.0
    assert order["status"] == "delivered"
    assert order["payment_method"] == "Credit Card"


def test_get_nonexistent_order_details():
    """Verify looking up a nonexistent order returns a clean not-found response."""
    res = get_order_details("ORD-9999")
    assert res["found"] is False
    assert "not found" in res["message"].lower()


def test_search_orders_by_status():
    """Verify filtering orders by status matches the actual dataset distribution."""
    res_cancelled = search_orders(status="cancelled")
    assert res_cancelled["total_matches"] == 7
    for ord_item in res_cancelled["orders"]:
        assert ord_item["status"] == "cancelled"

    res_delivered = search_orders(status="delivered", limit=30)
    assert res_delivered["total_matches"] == 48
    assert res_delivered["returned_count"] == 30
    assert res_delivered["truncated"] is True


def test_search_orders_pending():
    """Verify pending search includes 'processing' and 'shipped' active orders."""
    res_pending = search_orders(status="pending")
    # In dataset: ORD-1059 is processing, ORD-1060 is shipped
    assert res_pending["total_matches"] == 2
    order_ids = {o["order_id"] for o in res_pending["orders"]}
    assert "ORD-1059" in order_ids
    assert "ORD-1060" in order_ids


def test_search_orders_by_city_and_customer():
    """Verify partial and case-insensitive searching by city and customer name."""
    res_chennai = search_orders(city="chennai")
    assert res_chennai["total_matches"] == 21

    res_customer = search_orders(customer_name="sneha")
    assert res_customer["total_matches"] == 4
    for o in res_customer["orders"]:
        assert "sneha" in o["customer_name"].lower()


def test_calculate_cancelled_orders_count():
    """Verify exact count of cancelled orders from the dataset is 7."""
    res = calculate_order_analytics("count_orders", status="cancelled")
    assert res["operation"] == "count_orders"
    assert res["total_orders"] == 7


def test_calculate_category_revenue_for_month():
    """Verify revenue calculation for Electronics in August matches exact CSV figures."""
    res = calculate_order_analytics("sum_revenue", category="Electronics", month="August")
    assert res["total_orders"] == 4
    assert res["total_recorded_value_inr"] == 27189.0
    # ORD-1041 (₹10,497) was cancelled, so delivered revenue is 27189 - 10497 = 16692
    assert res["realized_delivered_revenue_inr"] == 16692.0
    assert res["cancelled_value_inr"] == 10497.0


def test_ranking_customers_by_spending():
    """Verify customer spending ranking identifies top spenders accurately."""
    res = calculate_order_analytics("customer_spending_ranking", top_n=5)
    assert res["operation"] == "customer_spending_ranking"
    ranking = res["ranking"]
    assert len(ranking) == 5

    # Rohan Das is top spender with ₹112,282 total
    top_customer = ranking[0]
    assert top_customer["customer_name"] == "Rohan Das"
    assert top_customer["total_spent_inr"] == 112282

    # Second is Vikram Reddy with ₹81,430
    second = ranking[1]
    assert second["customer_name"] == "Vikram Reddy"
    assert second["total_spent_inr"] == 81430


def test_average_order_value():
    """Verify average order value calculation."""
    res = calculate_order_analytics("average_order_value")
    assert res["total_orders"] == 60
    # 470,312 / 60 = 7838.53
    assert res["average_order_value_inr"] == 7838.53
    # 371,040 / 48 = 7730.00
    assert res["average_delivered_order_value_inr"] == 7730.0


def test_invalid_operation_returns_error():
    """Verify unsupported operations return clear structured errors."""
    res = calculate_order_analytics("unsupported_op_xyz")
    assert "error" in res
