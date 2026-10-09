"""Data loading and validation module for Order Assistant.

Loads, validates, and caches the orders dataset from orders.csv.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional
import pandas as pd

logger = logging.getLogger("order_assistant.data")

REQUIRED_COLUMNS = [
    "order_id",
    "order_date",
    "customer_name",
    "city",
    "product",
    "category",
    "quantity",
    "unit_price_inr",
    "total_inr",
    "payment_method",
    "status",
]

_CACHED_DF: Optional[pd.DataFrame] = None


class DataLoadError(Exception):
    """Raised when orders dataset fails to load or validate."""
    pass


def resolve_dataset_path(custom_path: Optional[str] = None) -> Path:
    """Resolve the dataset file path relatively and safely."""
    # 1. Custom explicit path passed or from environment
    env_path = custom_path or os.getenv("ORDERS_CSV_PATH")
    if env_path:
        p = Path(env_path)
        if p.is_file():
            return p.resolve()
        # Also try relative to current working directory
        cwd_p = Path.cwd() / env_path
        if cwd_p.is_file():
            return cwd_p.resolve()
        raise DataLoadError(f"Specified dataset file does not exist: '{env_path}'")

    # 2. Check project root (parent of backend directory)
    project_root = Path(__file__).resolve().parent.parent
    candidate_root = project_root / "orders.csv"
    if candidate_root.is_file():
        return candidate_root

    # 3. Check current working directory
    candidate_cwd = Path.cwd() / "orders.csv"
    if candidate_cwd.is_file():
        return candidate_cwd

    # 4. Check backend directory
    candidate_backend = Path(__file__).resolve().parent / "orders.csv"
    if candidate_backend.is_file():
        return candidate_backend

    raise DataLoadError(
        f"orders.csv could not be found. Checked: '{candidate_root}' and '{candidate_cwd}'. "
        "Please place orders.csv in the project root or set ORDERS_CSV_PATH."
    )


def load_orders_dataframe(filepath: Optional[str | Path] = None) -> pd.DataFrame:
    """Load and strictly validate the orders dataset from CSV.

    Validates:
    - Required columns are present
    - No duplicate order IDs
    - Correct numeric casting for quantity, unit_price_inr, total_inr
    - Date parsing into datetime
    - Order IDs preserved as strings
    """
    resolved_path = resolve_dataset_path(str(filepath) if filepath else None)
    logger.info("Loading orders dataset from %s", resolved_path)

    try:
        df = pd.read_csv(
            resolved_path,
            dtype={"order_id": str},  # Preserve order_id as string
        )
    except Exception as exc:
        raise DataLoadError(f"Failed to read CSV at {resolved_path}: {exc}") from exc

    # 1. Validate required columns
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise DataLoadError(f"Dataset is missing required columns: {missing_cols}")

    # Strip any accidental whitespace from string columns
    str_cols = ["order_id", "customer_name", "city", "product", "category", "payment_method", "status"]
    for col in str_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # 2. Check for duplicate order IDs
    duplicates = df[df["order_id"].duplicated(keep=False)]
    if not duplicates.empty:
        dup_ids = duplicates["order_id"].unique().tolist()
        raise DataLoadError(f"Dataset contains duplicate order IDs: {dup_ids}")

    # 3. Numeric conversion and validation
    for num_col in ["quantity", "unit_price_inr", "total_inr"]:
        try:
            df[num_col] = pd.to_numeric(df[num_col], errors="raise")
        except Exception as exc:
            raise DataLoadError(f"Failed to parse column '{num_col}' as numeric: {exc}") from exc

    # Ensure quantity is integer
    df["quantity"] = df["quantity"].astype(int)

    # 4. Parse dates
    try:
        df["order_date_parsed"] = pd.to_datetime(df["order_date"], format="%Y-%m-%d", errors="raise")
    except Exception as exc:
        # Fallback to general date parser if specific format fails
        try:
            df["order_date_parsed"] = pd.to_datetime(df["order_date"], errors="raise")
        except Exception as inner_exc:
            raise DataLoadError(f"Failed to parse 'order_date' column: {inner_exc}") from exc

    logger.info("Successfully loaded and validated %d orders from %s", len(df), resolved_path)
    return df


def get_orders_df(force_reload: bool = False, custom_path: Optional[str] = None) -> pd.DataFrame:
    """Retrieve the cached orders DataFrame, loading it if not yet loaded."""
    global _CACHED_DF
    if _CACHED_DF is None or force_reload:
        _CACHED_DF = load_orders_dataframe(custom_path)
    return _CACHED_DF.copy()


def reset_cache() -> None:
    """Clear the cached DataFrame (primarily for test teardown)."""
    global _CACHED_DF
    _CACHED_DF = None
