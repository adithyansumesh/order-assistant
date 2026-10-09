"""Tests for AI Agent loop, tool dispatching, and error handling with mocked OpenAI client."""

import json
from unittest.mock import MagicMock, patch
import pytest

from backend.agent import (
    AgentExecutionError,
    execute_tool_safely,
    generate_human_readable_summary,
    run_agent_turn,
)


class MockFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class MockToolCall:
    def __init__(self, call_id: str, name: str, arguments: str):
        self.id = call_id
        self.type = "function"
        self.function = MockFunction(name, arguments)


class MockMessage:
    def __init__(self, content: str = None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls or []


class MockChoice:
    def __init__(self, message: MockMessage):
        self.message = message


class MockCompletion:
    def __init__(self, message: MockMessage):
        self.choices = [MockChoice(message)]


def test_agent_executes_tool_call_and_returns_grounded_reply():
    """Verify that agent receives a tool call request from model, executes the real backend tool,

    passes the result back in the message loop, and obtains the final model response.
    """
    mock_client = MagicMock()

    # Step 1: Model requests tool call to get_order_details for ORD-1025
    tool_call = MockToolCall(
        call_id="call_12345",
        name="get_order_details",
        arguments=json.dumps({"order_id": "ORD-1025"}),
    )
    first_response = MockCompletion(MockMessage(content=None, tool_calls=[tool_call]))

    # Step 2: Model gives final reply after receiving the real tool output
    second_response = MockCompletion(
        MockMessage(
            content="Order ORD-1025 was placed by Karthik Rao for a Wireless Mouse and its status is delivered.",
            tool_calls=[],
        )
    )

    mock_client.chat.completions.create.side_effect = [first_response, second_response]

    with patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test-valid-key"}):
        reply, tool_summaries = run_agent_turn(
            "What is the status of order ORD-1025?",
            client=mock_client,
        )

    assert "delivered" in reply
    assert len(tool_summaries) == 1
    assert tool_summaries[0].tool_name == "get_order_details"
    assert tool_summaries[0].arguments == {"order_id": "ORD-1025"}
    assert "ORD-1025" in tool_summaries[0].summary

    # Verify that mock_client was called twice
    assert mock_client.chat.completions.create.call_count == 2

    # Verify that the second call contained the tool response
    second_call_messages = mock_client.chat.completions.create.call_args_list[1][1]["messages"]
    tool_msg = next((m for m in second_call_messages if m.get("role") == "tool"), None)
    assert tool_msg is not None
    assert tool_msg["tool_call_id"] == "call_12345"
    assert tool_msg["name"] == "get_order_details"
    tool_data = json.loads(tool_msg["content"])
    assert tool_data["found"] is True
    assert tool_data["order"]["customer_name"] == "Karthik Rao"


def test_agent_missing_api_key_raises_informative_error():
    """Verify that when OPENAI_API_KEY is missing or unset, an informative AgentExecutionError is raised."""
    with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
        with pytest.raises(AgentExecutionError, match="OpenAI API key is not configured"):
            run_agent_turn("How many orders were cancelled?")


def test_execute_tool_safely_unallowlisted_tool():
    """Verify unallowlisted tool invocation is rejected safely without execution."""
    res = execute_tool_safely("delete_all_records", {})
    assert "error" in res
    assert "not recognized" in res["error"]


def test_generate_human_readable_summary():
    """Verify safe UI summaries are constructed correctly."""
    summary_1 = generate_human_readable_summary(
        "calculate_order_analytics",
        {"operation": "count_orders", "status": "cancelled"},
        {"total_orders": 7},
    )
    assert "Counted orders" in summary_1
    assert "cancelled" in summary_1

    summary_2 = generate_human_readable_summary(
        "search_orders",
        {"city": "Chennai"},
        {"total_matches": 21, "orders": []},
    )
    assert "Chennai" in summary_2
    assert "21" in summary_2
