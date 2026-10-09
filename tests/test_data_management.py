"""Unit tests for Data Management CSV validation, append, and replacement functionality."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.data import validate_csv_data, import_csv_data, get_orders_df, reset_cache, resolve_dataset_path


@pytest.fixture
def client():
    return TestClient(app)


def test_validate_valid_csv():
    csv_content = """order_id,order_date,customer_name,city,product,category,quantity,unit_price_inr,total_inr,payment_method,status
ORD-9001,2026-09-01,Test User,Mumbai,Headphones,Electronics,1,1999,1999,UPI,delivered
ORD-9002,2026-09-02,Test User 2,Delhi,Notebook,Stationery,2,299,598,Credit Card,shipped
"""
    result = validate_csv_data(csv_content, filename="test.csv")
    assert result["valid"] is True
    assert result["total_rows"] == 2
    assert len(result["errors"]) == 0
    assert len(result["preview_rows"]) == 2


def test_validate_missing_columns():
    csv_content = """order_id,customer_name,city,total_inr
ORD-9001,Test User,Mumbai,1999
"""
    result = validate_csv_data(csv_content, filename="missing.csv")
    assert result["valid"] is False
    assert any("Missing required columns" in err for err in result["errors"])


def test_validate_duplicate_order_ids_in_upload():
    csv_content = """order_id,order_date,customer_name,city,product,category,quantity,unit_price_inr,total_inr,payment_method,status
ORD-9001,2026-09-01,User A,Mumbai,Product A,Electronics,1,1000,1000,UPI,delivered
ORD-9001,2026-09-02,User B,Delhi,Product B,Stationery,1,1000,1000,UPI,delivered
"""
    result = validate_csv_data(csv_content, filename="dups.csv")
    assert result["valid"] is False
    assert len(result["internal_duplicates"]) > 0


def test_api_orders_endpoint(client):
    response = client.get("/api/orders?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "orders" in data
    assert len(data["orders"]) <= 10


def test_api_data_current_endpoint(client):
    response = client.get("/api/data/current")
    assert response.status_code == 200
    data = response.json()
    assert "total_records" in data
    assert "columns" in data
    assert "date_range" in data
