"""Data loading and validation module for Order Assistant.

Loads, validates, and caches the orders dataset from orders.csv.
"""

from __future__ import annotations

import datetime
import io
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
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
    # 0. If in Vercel serverless environment, use writable /tmp
    if os.getenv("VERCEL") and not custom_path and not os.getenv("ORDERS_CSV_PATH"):
        tmp_csv = Path("/tmp") / "orders.csv"
        if not tmp_csv.is_file():
            project_root = Path(__file__).resolve().parent.parent
            src_csv = project_root / "orders.csv"
            if src_csv.is_file():
                shutil.copy2(src_csv, tmp_csv)
        if tmp_csv.is_file():
            return tmp_csv

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


def validate_csv_data(content: str | bytes, filename: str = "upload.csv") -> Dict[str, Any]:
    """Validate uploaded CSV structure, required schema, data types, and check for duplicates.

    Returns a rich pre-flight validation report with preview rows, errors, and warnings.
    """
    if isinstance(content, str):
        content_bytes = content.encode("utf-8")
        stream = io.StringIO(content)
    else:
        content_bytes = content
        stream = io.BytesIO(content)

    file_size = len(content_bytes)

    try:
        df = pd.read_csv(stream, dtype={"order_id": str})
    except Exception as exc:
        return {
            "valid": False,
            "filename": filename,
            "file_size_bytes": file_size,
            "total_rows": 0,
            "columns": [],
            "missing_columns": REQUIRED_COLUMNS,
            "errors": [f"Malformed CSV syntax: {str(exc)}"],
            "warnings": [],
            "internal_duplicates": [],
            "existing_duplicates": [],
            "preview_rows": [],
        }

    errors: List[str] = []
    warnings: List[str] = []

    # 1. Required columns check
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        errors.append(f"Missing required columns: {', '.join(missing_cols)}")

    if len(df) == 0:
        errors.append("Uploaded CSV file contains no data rows.")

    # 2. String sanitization & whitespace check
    str_cols = ["order_id", "customer_name", "city", "product", "category", "payment_method", "status"]
    for col in str_cols:
        if col in df.columns:
            raw_s = df[col].astype(str)
            stripped_s = raw_s.str.strip()
            diff_count = int((raw_s != stripped_s).sum())
            if diff_count > 0:
                warnings.append(f"Column '{col}' had {diff_count} entries with extra whitespace (auto-trimmed).")
            df[col] = stripped_s

    # 3. Order ID checks (empty and internal duplicates)
    internal_dups: List[str] = []
    if "order_id" in df.columns:
        empty_ids = df[df["order_id"].isna() | (df["order_id"] == "") | (df["order_id"].str.lower() == "nan")]
        if not empty_ids.empty:
            errors.append(f"Found {len(empty_ids)} rows with empty or missing order_id.")

        dup_mask = df["order_id"].str.upper().duplicated(keep=False)
        if dup_mask.any():
            internal_dups = df.loc[dup_mask, "order_id"].unique().tolist()
            errors.append(
                f"Uploaded file contains {len(internal_dups)} duplicate order IDs: {', '.join(internal_dups[:5])}"
                f"{'...' if len(internal_dups) > 5 else ''}"
            )

    # 4. Check overlap with currently active dataset
    existing_dups: List[str] = []
    try:
        current_df = get_orders_df()
        if "order_id" in df.columns and "order_id" in current_df.columns:
            current_ids = set(current_df["order_id"].str.upper())
            file_ids = set(df["order_id"].str.upper())
            overlap = file_ids.intersection(current_ids)
            if overlap:
                existing_dups = list(overlap)
                warnings.append(
                    f"{len(existing_dups)} order IDs already exist in the active store dataset (will be skipped during append)."
                )
    except Exception:
        pass

    # 5. Numeric validations
    for num_col in ["quantity", "unit_price_inr", "total_inr"]:
        if num_col in df.columns:
            invalid_mask = pd.to_numeric(df[num_col], errors="coerce").isna()
            if invalid_mask.any():
                invalid_count = int(invalid_mask.sum())
                errors.append(f"Column '{num_col}' contains {invalid_count} non-numeric values.")
            else:
                converted = pd.to_numeric(df[num_col])
                if (converted < 0).any():
                    errors.append(f"Column '{num_col}' contains negative values.")

    # 6. Date validation
    if "order_date" in df.columns:
        invalid_dates = pd.to_datetime(df["order_date"], errors="coerce").isna()
        if invalid_dates.any():
            errors.append(f"Column 'order_date' contains {int(invalid_dates.sum())} unparseable date values.")

    # 7. Status values check
    valid_statuses = {"delivered", "cancelled", "returned", "processing", "shipped", "pending"}
    if "status" in df.columns:
        unknown_statuses = set(df["status"].str.lower().unique()) - valid_statuses
        if unknown_statuses:
            warnings.append(f"Encountered non-standard status values: {', '.join(unknown_statuses)}.")

    preview_rows = []
    if len(df) > 0:
        sample_df = df.head(15).copy()
        for c in sample_df.columns:
            sample_df[c] = sample_df[c].astype(str)
        preview_rows = sample_df.to_dict(orient="records")

    return {
        "valid": len(errors) == 0,
        "filename": filename,
        "file_size_bytes": file_size,
        "total_rows": len(df),
        "columns": list(df.columns),
        "missing_columns": missing_cols,
        "internal_duplicates": internal_dups,
        "existing_duplicates": existing_dups,
        "errors": errors,
        "warnings": warnings,
        "preview_rows": preview_rows,
    }


def import_csv_data(
    content: str | bytes,
    mode: str = "append",  # "append" or "replace"
    create_backup: bool = True,
    filename: str = "upload.csv",
) -> Dict[str, Any]:
    """Import uploaded CSV dataset either by replacing active dataset or appending new records.

    Persistently saves updates to orders.csv and resets server in-memory cache so
    assistant and analytics immediately use the updated active dataset.
    """
    validation = validate_csv_data(content, filename)
    if not validation["valid"]:
        return {
            "success": False,
            "mode": mode,
            "error": "Validation failed: " + "; ".join(validation["errors"]),
            "validation": validation,
        }

    if isinstance(content, str):
        stream = io.StringIO(content)
    else:
        stream = io.BytesIO(content)

    new_df = pd.read_csv(stream, dtype={"order_id": str})
    # Clean whitespace
    for col in REQUIRED_COLUMNS:
        if col in new_df.columns and col not in ["quantity", "unit_price_inr", "total_inr"]:
            new_df[col] = new_df[col].astype(str).str.strip()

    dataset_path = resolve_dataset_path()
    backup_name: Optional[str] = None

    if create_backup and dataset_path.is_file():
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backups_dir = dataset_path.parent / "backups"
        backups_dir.mkdir(exist_ok=True)
        backup_file = backups_dir / f"orders_backup_{timestamp}.csv"
        shutil.copy2(dataset_path, backup_file)
        backup_name = str(backup_file.name)

    if mode == "replace":
        # Overwrite orders.csv
        new_df[REQUIRED_COLUMNS].to_csv(dataset_path, index=False)
        reset_cache()
        fresh_df = get_orders_df(force_reload=True)
        return {
            "success": True,
            "mode": "replace",
            "records_added": len(fresh_df),
            "records_skipped": 0,
            "records_rejected": 0,
            "total_records": len(fresh_df),
            "backup_created": backup_name,
            "message": f"Successfully replaced active dataset with {len(fresh_df)} records.",
        }
    elif mode == "append":
        current_df = get_orders_df()
        current_ids = set(current_df["order_id"].str.upper())

        # Exclude duplicate order IDs
        new_df["_key"] = new_df["order_id"].str.upper()
        unique_mask = ~new_df["_key"].isin(current_ids)
        new_records = new_df[unique_mask].drop(columns=["_key"])
        skipped_records = new_df[~unique_mask]

        skipped_ids = skipped_records["order_id"].tolist()

        merged_df = pd.concat([current_df, new_records], ignore_index=True)
        merged_df[REQUIRED_COLUMNS].to_csv(dataset_path, index=False)

        reset_cache()
        fresh_df = get_orders_df(force_reload=True)
        return {
            "success": True,
            "mode": "append",
            "records_added": len(new_records),
            "records_skipped": len(skipped_records),
            "records_rejected": 0,
            "skipped_order_ids": skipped_ids[:20],
            "total_records": len(fresh_df),
            "backup_created": backup_name,
            "message": f"Successfully appended {len(new_records)} new records ({len(skipped_records)} duplicate order IDs skipped).",
        }
    else:
        return {
            "success": False,
            "mode": mode,
            "error": f"Invalid import mode '{mode}'. Expected 'append' or 'replace'.",
        }


def reset_dataset_to_seed() -> Dict[str, Any]:
    """Restore dataset from seed copy if available."""
    dataset_path = resolve_dataset_path()
    seed_path = dataset_path.parent / "orders_seed.csv"
    if not seed_path.is_file():
        seed_path = Path(__file__).resolve().parent.parent / "orders_seed.csv"
    if seed_path.is_file():
        shutil.copy2(seed_path, dataset_path)
        reset_cache()
        fresh_df = get_orders_df(force_reload=True)
        return {
            "success": True,
            "message": f"Reset dataset to default seed with {len(fresh_df)} records.",
            "total_records": len(fresh_df),
        }
    return {
        "success": False,
        "message": "Seed dataset file 'orders_seed.csv' not found.",
        "total_records": len(get_orders_df()),
    }
