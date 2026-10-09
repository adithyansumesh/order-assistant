"""Pydantic schemas for request/response validation and tool structures."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ChatMessageRequest(BaseModel):
    """User incoming chat message payload."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User question or query about store orders",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty or contain only whitespace.")
        return trimmed


class ToolCallSummary(BaseModel):
    """Safe, human-readable tool execution summary for display in the UI."""
    tool_name: str
    arguments: Dict[str, Any]
    summary: str
    record_count: Optional[int] = None


class ChatMessageResponse(BaseModel):
    """Chat API response schema."""
    reply: str
    tool_calls: List[ToolCallSummary] = Field(default_factory=list)
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Application and dataset health check schema."""
    status: str
    dataset_loaded: bool
    total_orders: int
    version: str = "1.0.0"


class StatsResponse(BaseModel):
    """High-level summary statistics of the dataset."""
    total_orders: int
    total_recorded_value_inr: float
    realized_revenue_inr: float
    cancelled_orders_count: int
    cancelled_value_inr: float
    returned_orders_count: int
    pending_orders_count: int
    orders_by_status: Dict[str, int]
    orders_by_category: Dict[str, int]
    orders_by_city: Dict[str, int]
    date_range: Dict[str, str]
    top_customers: Optional[List[Dict[str, Any]]] = None


class ValidateCsvRequest(BaseModel):
    content: str = Field(..., description="CSV file text content")
    filename: Optional[str] = Field("uploaded.csv", description="Original filename")


class ImportCsvRequest(BaseModel):
    content: str = Field(..., description="CSV file text content")
    filename: Optional[str] = Field("uploaded.csv", description="Original filename")
    mode: str = Field("append", description="Import mode: 'append' or 'replace'")
    create_backup: bool = Field(True, description="Whether to create an automatic backup")

