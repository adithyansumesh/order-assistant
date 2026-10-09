"""Tests for FastAPI endpoints: /api/chat, /api/health, and /api/stats."""

from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.agent import AgentExecutionError
from backend.main import app
from backend.schemas import ToolCallSummary

client = TestClient(app)


def test_health_endpoint_success():
    """Verify health endpoint reports healthy status and loaded orders count."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["dataset_loaded"] is True
    assert data["total_orders"] == 60


def test_stats_endpoint_matches_csv_aggregates():
    """Verify stats endpoint returns accurate derived figures from the actual CSV."""
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_orders"] == 60
    assert data["total_recorded_value_inr"] == 470312.0
    assert data["realized_revenue_inr"] == 371040.0
    assert data["cancelled_orders_count"] == 7
    assert data["cancelled_value_inr"] == 72634.0
    assert data["returned_orders_count"] == 3
    assert data["pending_orders_count"] == 2
    assert "Electronics" in data["orders_by_category"]
    assert "Chennai" in data["orders_by_city"]


def test_chat_endpoint_rejects_empty_or_whitespace_message():
    """Verify chat endpoint rejects empty or whitespace-only queries."""
    res_empty = client.post("/api/chat", json={"message": ""})
    assert res_empty.status_code == 422

    res_whitespace = client.post("/api/chat", json={"message": "   \n\t  "})
    assert res_whitespace.status_code == 422


def test_chat_endpoint_rejects_excessively_long_message():
    """Verify chat endpoint rejects messages exceeding maximum character limit."""
    long_msg = "x" * 2001
    response = client.post("/api/chat", json={"message": long_msg})
    assert response.status_code == 422


def test_chat_endpoint_successful_mocked_interaction():
    """Verify chat endpoint returns properly structured response with reply and tool summaries."""
    mock_summary = ToolCallSummary(
        tool_name="get_order_details",
        arguments={"order_id": "ORD-1025"},
        summary="Looked up order ORD-1025 (Found)",
        record_count=1,
    )

    with patch(
        "backend.main.run_agent_turn",
        return_value=("Order ORD-1025 is delivered.", [mock_summary]),
    ):
        response = client.post(
            "/api/chat",
            json={"message": "What is the status of order ORD-1025?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == "Order ORD-1025 is delivered."
        assert len(data["tool_calls"]) == 1
        assert data["tool_calls"][0]["tool_name"] == "get_order_details"
        assert data["error"] is None


def test_chat_endpoint_agent_execution_error_handled_gracefully():
    """Verify that agent errors (e.g. missing API key) return clean user-facing error message."""
    with patch(
        "backend.main.run_agent_turn",
        side_effect=AgentExecutionError("OpenAI API key is not configured."),
    ):
        response = client.post(
            "/api/chat",
            json={"message": "Show cancelled orders"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "OpenAI API key is not configured" in data["error"]
        assert data["tool_calls"] == []


def test_health_endpoint_degraded_when_dataset_missing():
    """Verify health endpoint gracefully degrades if dataset fails to load."""
    with patch("backend.main.get_orders_df", side_effect=Exception("Disk error")):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["dataset_loaded"] is False
        assert data["total_orders"] == 0


def test_spa_index_served():
    """Verify built frontend index.html is served from root URL."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Order Assistant" in response.text

