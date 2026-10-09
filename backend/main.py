"""FastAPI backend application for Order Assistant.

Serves:
- POST /api/chat
- GET /api/health
- GET /api/stats
- Built static frontend files (SPA)
"""

from __future__ import annotations

import asyncio
import datetime
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is in sys.path so "backend.*" imports work when root is backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from backend.agent import AgentExecutionError, run_agent_turn
    from backend.data import (
        DataLoadError,
        get_orders_df,
        import_csv_data,
        reset_dataset_to_seed,
        resolve_dataset_path,
        validate_csv_data,
    )
    from backend.schemas import (
        ChatMessageRequest,
        ChatMessageResponse,
        HealthResponse,
        ImportCsvRequest,
        StatsResponse,
        ValidateCsvRequest,
    )
except ImportError:
    from agent import AgentExecutionError, run_agent_turn
    from data import (
        DataLoadError,
        get_orders_df,
        import_csv_data,
        reset_dataset_to_seed,
        resolve_dataset_path,
        validate_csv_data,
    )
    from schemas import (
        ChatMessageRequest,
        ChatMessageResponse,
        HealthResponse,
        ImportCsvRequest,
        StatsResponse,
        ValidateCsvRequest,
    )

# Load environment variables from .env
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("order_assistant.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown tasks."""
    logger.info("Initializing Order Assistant application...")
    try:
        df = get_orders_df()
        logger.info("Dataset verified and pre-loaded. Total orders: %d", len(df))
    except Exception as exc:
        logger.error("Failed to load dataset on startup: %s", exc)
    yield
    logger.info("Order Assistant application shutting down.")


app = FastAPI(
    title="Order Assistant API",
    description="Backend API and AI agent for querying store order data.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/api/chat",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with the Order Assistant agent",
)
async def chat_endpoint(payload: ChatMessageRequest) -> ChatMessageResponse:
    """Processes user queries about store orders using OpenAI tool calling."""
    try:
        reply, tool_calls = await asyncio.to_thread(run_agent_turn, payload.message)
        return ChatMessageResponse(
            reply=reply,
            tool_calls=tool_calls,
            error=None,
        )
    except AgentExecutionError as agent_err:
        logger.warning("Agent execution warning for query '%s': %s", payload.message[:50], agent_err)
        return ChatMessageResponse(
            reply="I encountered an issue processing your request.",
            tool_calls=[],
            error=str(agent_err),
        )
    except Exception as exc:
        logger.error("Unhandled error processing chat query: %s", exc, exc_info=True)
        # Avoid leaking internal system secrets or stack traces to client
        return ChatMessageResponse(
            reply="An unexpected server error occurred while processing your query.",
            tool_calls=[],
            error="Internal server error. Please try again later.",
        )


@app.get(
    "/api/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application and dataset health check",
)
async def health_endpoint() -> HealthResponse:
    """Returns application health and dataset loading status."""
    try:
        df = get_orders_df()
        return HealthResponse(
            status="healthy",
            dataset_loaded=True,
            total_orders=len(df),
            version="1.0.0",
        )
    except Exception as exc:
        logger.error("Health check failed dataset loading: %s", exc)
        return HealthResponse(
            status="degraded",
            dataset_loaded=False,
            total_orders=0,
            version="1.0.0",
        )


@app.get(
    "/api/stats",
    response_model=StatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Summary statistics of the dataset",
)
async def stats_endpoint() -> StatsResponse:
    """Returns key summary aggregates and categorical distributions from the dataset."""
    try:
        df = get_orders_df()
    except Exception as exc:
        logger.error("Failed to load dataset for /api/stats: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order dataset is currently unavailable.",
        ) from exc

    total_orders = len(df)
    total_recorded = float(df["total_inr"].sum())

    delivered_df = df[df["status"] == "delivered"]
    realized_revenue = float(delivered_df["total_inr"].sum())

    cancelled_df = df[df["status"] == "cancelled"]
    cancelled_count = len(cancelled_df)
    cancelled_val = float(cancelled_df["total_inr"].sum())

    returned_df = df[df["status"] == "returned"]
    returned_count = len(returned_df)

    pending_df = df[df["status"].isin(["processing", "shipped"])]
    pending_count = len(pending_df)

    # Compute genuine top customers by total spend from active dataframe
    top_cust_df = (
        df.groupby("customer_name")
        .agg(spent=("total_inr", "sum"), orders=("order_id", "count"), city=("city", "first"))
        .sort_values(by="spent", ascending=False)
        .head(5)
        .reset_index()
    )
    top_customers = [
        {
            "rank": int(idx + 1),
            "name": str(row["customer_name"]),
            "spent": f"₹{int(row['spent']):,}",
            "orders": int(row["orders"]),
            "tier": "Platinum VIP" if idx < 2 else "Gold VIP",
            "city": str(row["city"]),
        }
        for idx, row in top_cust_df.iterrows()
    ]

    return StatsResponse(
        total_orders=total_orders,
        total_recorded_value_inr=total_recorded,
        realized_revenue_inr=realized_revenue,
        cancelled_orders_count=cancelled_count,
        cancelled_value_inr=cancelled_val,
        returned_orders_count=returned_count,
        pending_orders_count=pending_count,
        orders_by_status=df["status"].value_counts().to_dict(),
        orders_by_category=df["category"].value_counts().to_dict(),
        orders_by_city=df["city"].value_counts().to_dict(),
        date_range={
            "start": str(df["order_date"].min()),
            "end": str(df["order_date"].max()),
        },
        top_customers=top_customers,
    )


@app.get(
    "/api/orders",
    summary="Retrieve orders list with filtering and pagination from active dataset",
)
async def list_orders_endpoint(
    status: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    try:
        df = get_orders_df()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order dataset is currently unavailable.",
        ) from exc

    filtered = df.copy()
    if status and status.lower() != "all":
        filtered = filtered[filtered["status"].str.lower() == status.strip().lower()]

    if query:
        q = query.strip().lower()
        filtered = filtered[
            filtered["order_id"].str.lower().str.contains(q, na=False)
            | filtered["customer_name"].str.lower().str.contains(q, na=False)
            | filtered["city"].str.lower().str.contains(q, na=False)
            | filtered["product"].str.lower().str.contains(q, na=False)
            | filtered["category"].str.lower().str.contains(q, na=False)
        ]

    total_count = len(filtered)
    safe_offset = max(0, offset)
    safe_limit = max(1, min(limit, 500))
    paged = filtered.iloc[safe_offset : safe_offset + safe_limit]

    records = []
    for _, row in paged.iterrows():
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
        "total": total_count,
        "returned": len(records),
        "offset": safe_offset,
        "limit": safe_limit,
        "orders": records,
    }


@app.post(
    "/api/data/validate",
    summary="Pre-flight validation of an uploaded CSV dataset",
)
async def validate_data_endpoint(payload: ValidateCsvRequest):
    try:
        res = validate_csv_data(payload.content, filename=payload.filename or "uploaded.csv")
        return res
    except Exception as exc:
        logger.error("Failed to validate CSV data: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=400,
            content={
                "valid": False,
                "filename": payload.filename or "uploaded.csv",
                "errors": [f"Validation processing error: {str(exc)}"],
                "warnings": [],
                "preview_rows": [],
            },
        )


@app.post(
    "/api/data/import",
    summary="Import or append CSV data to the active dataset",
)
async def import_data_endpoint(payload: ImportCsvRequest):
    try:
        res = import_csv_data(
            content=payload.content,
            mode=payload.mode,
            create_backup=payload.create_backup,
            filename=payload.filename or "uploaded.csv",
        )
        if not res.get("success"):
            return JSONResponse(status_code=400, content=res)
        return res
    except Exception as exc:
        logger.error("Failed to import CSV data: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Import failed: {str(exc)}",
            },
        )


@app.get(
    "/api/data/current",
    summary="Get metadata and sample of currently active dataset",
)
async def current_data_endpoint():
    try:
        df = get_orders_df()
        dataset_path = resolve_dataset_path()
        mtime = datetime.datetime.fromtimestamp(dataset_path.stat().st_mtime).isoformat()
        sample = df.head(10).to_dict(orient="records")
        for row in sample:
            for k in row:
                row[k] = str(row[k])
        return {
            "total_records": len(df),
            "filename": dataset_path.name,
            "last_modified": mtime,
            "columns": list(df.columns),
            "date_range": {
                "start": str(df["order_date"].min()),
                "end": str(df["order_date"].max()),
            },
            "sample_rows": sample,
        }
    except Exception as exc:
        logger.error("Failed to get current dataset info: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get(
    "/api/data/download",
    summary="Download currently active orders.csv",
)
async def download_data_endpoint():
    dataset_path = resolve_dataset_path()
    if not dataset_path.is_file():
        raise HTTPException(status_code=404, detail="Dataset file not found")
    return FileResponse(
        path=dataset_path,
        filename="orders.csv",
        media_type="text/csv",
    )


@app.post(
    "/api/data/reset",
    summary="Reset active dataset to default seed",
)
async def reset_data_endpoint():
    res = reset_dataset_to_seed()
    return res


# Mount built static frontend if present (for single-service deployment on Render)
dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if dist_dir.is_dir() and (dist_dir / "index.html").is_file():
    logger.info("Serving built frontend from %s", dist_dir)
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = dist_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    async def root_dev_message():
        return {
            "message": "Order Assistant API is running.",
            "health": "/api/health",
            "stats": "/api/stats",
            "chat": "/api/chat",
            "frontend_status": "Built frontend not found in frontend/dist. Run 'npm run build' inside frontend directory to package the UI.",
        }
