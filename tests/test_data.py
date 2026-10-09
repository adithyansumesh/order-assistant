"""Tests for dataset loading, validation, and error reporting."""

import tempfile
from pathlib import Path
import pytest
import pandas as pd

from backend.data import (
    DataLoadError,
    REQUIRED_COLUMNS,
    get_orders_df,
    load_orders_dataframe,
    reset_cache,
    resolve_dataset_path,
)


def test_real_dataset_loads_successfully():
    """Verify that the actual orders.csv file loads without errors and meets schema rules."""
    reset_cache()
    df = get_orders_df()
    assert len(df) == 60
    for col in REQUIRED_COLUMNS:
        assert col in df.columns
    assert df["order_id"].nunique() == 60
    assert df["quantity"].dtype in [int, "int64", "int32"]
    assert df["total_inr"].dtype in [int, float, "int64", "float64"]
    assert df["order_date_parsed"].notnull().all()


def test_missing_required_column_raises_error():
    """Verify that a CSV missing one of the required columns raises DataLoadError."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
        tmp.write("order_id,order_date,customer_name\nORD-999,2026-01-01,Alice\n")
        tmp_path = tmp.name

    try:
        with pytest.raises(DataLoadError, match="missing required columns"):
            load_orders_dataframe(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_duplicate_order_ids_raises_error():
    """Verify that duplicate order IDs in CSV trigger DataLoadError."""
    content = (
        "order_id,order_date,customer_name,city,product,category,quantity,unit_price_inr,total_inr,payment_method,status\n"
        "ORD-1001,2026-06-01,Alice,Kochi,Mouse,Electronics,1,100,100,UPI,delivered\n"
        "ORD-1001,2026-06-02,Bob,Kochi,Mouse,Electronics,1,100,100,UPI,delivered\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with pytest.raises(DataLoadError, match="duplicate order IDs"):
            load_orders_dataframe(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_nonexistent_dataset_file_raises_error():
    """Verify that resolving or loading a non-existent file path fails with DataLoadError."""
    with pytest.raises(DataLoadError):
        load_orders_dataframe("non_existent_path_xyz_123.csv")
