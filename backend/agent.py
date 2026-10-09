"""AI Agent module for Order Assistant.

Executes OpenAI tool-calling loops with strict grounding, input validation,
deterministic tool execution, error handling, and safe UI summaries.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import openai
from openai import OpenAI

from backend.schemas import ToolCallSummary
from backend.tools import OPENAI_TOOLS, TOOL_DISPATCH

logger = logging.getLogger("order_assistant.agent")

MAX_AGENT_ITERATIONS = 5

SYSTEM_PROMPT = """You are Order Assistant, an AI assistant specialized in querying and analyzing store orders.
You have access to real store order data through deterministic backend tools.

Guidelines for answering:
1. Always ground your factual answers about orders, customers, amounts, dates, and products in the actual tool outputs. Never invent or hallucinate order details, customer spending, revenue figures, or order statuses.
2. If the user asks a question requiring order data, call the appropriate tool:
   - For an exact order ID (e.g. 'ORD-1025'): call `get_order_details`.
   - For quantitative questions (e.g., how many cancelled orders, August Electronics revenue, highest spending customer, average order value): call `calculate_order_analytics`.
   - For listing orders or searching by customer, city, category, or pending status: call `search_orders`.
   - For simple greetings or general capabilities questions: answer politely and concisely without calling tools.
3. Revenue and Order Value Clarification:
   - When reporting financial numbers, clearly distinguish between total recorded order value (all orders) and realized/delivered revenue. If cancelled orders exist, clarify whether the figure includes or excludes cancelled orders.
4. Monetary Formatting: Format amounts in Indian Rupees (₹), e.g., ₹2,397 or ₹1,12,282.
5. In-Progress Orders: Orders with status 'processing' or 'shipped' represent unfulfilled/in-progress orders.
6. Truthfulness: If a search returns no matching records, or an order ID is not found, state that clearly and truthfully. Never invent fake orders or guess.
7. Be concise, professional, and clear.
"""


def generate_human_readable_summary(tool_name: str, args: Dict[str, Any], result: Dict[str, Any]) -> str:
    """Produce a safe, human-readable summary of the tool execution for display in the UI."""
    if tool_name == "get_order_details":
        order_id = args.get("order_id", "specified ID")
        found = result.get("found", False)
        return f"Looked up order {order_id} ({'Found' if found else 'Not found'})"

    if tool_name == "search_orders":
        filters = []
        if args.get("order_id"):
            filters.append(f"ID={args['order_id']}")
        if args.get("customer_name"):
            filters.append(f"customer='{args['customer_name']}'")
        if args.get("city"):
            filters.append(f"city='{args['city']}'")
        if args.get("status"):
            filters.append(f"status='{args['status']}'")
        if args.get("category"):
            filters.append(f"category='{args['category']}'")
        if args.get("product"):
            filters.append(f"product='{args['product']}'")

        filter_str = ", ".join(filters) if filters else "all criteria"
        count = result.get("total_matches", len(result.get("orders", [])))
        return f"Searched orders matching {filter_str} (Found {count} orders)"

    if tool_name == "calculate_order_analytics":
        op = args.get("operation", "analytics")
        op_label_map = {
            "count_orders": "Counted orders",
            "sum_revenue": "Calculated revenue & order values",
            "average_order_value": "Calculated average order value",
            "customer_spending_ranking": "Ranked customer spending",
            "category_breakdown": "Aggregated category revenue",
            "city_breakdown": "Aggregated city statistics",
            "status_breakdown": "Aggregated order status breakdown",
            "monthly_trend": "Analyzed monthly sales trend",
        }
        label = op_label_map.get(op, f"Ran {op}")
        extras = []
        if args.get("category"):
            extras.append(f"category: {args['category']}")
        if args.get("month"):
            extras.append(f"month: {args['month']}")
        if args.get("status"):
            extras.append(f"status: {args['status']}")
        if args.get("city"):
            extras.append(f"city: {args['city']}")

        if extras:
            return f"{label} ({', '.join(extras)})"
        return label

    return f"Executed {tool_name}"


def execute_tool_safely(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute allowlisted tool deterministically with argument validation."""
    if tool_name not in TOOL_DISPATCH:
        logger.warning("Attempted execution of unallowlisted tool: %s", tool_name)
        return {"error": f"Tool '{tool_name}' is not recognized or supported."}

    handler = TOOL_DISPATCH[tool_name]
    try:
        logger.info("Executing tool '%s' with args %s", tool_name, arguments)
        result = handler(**arguments)
        return result
    except TypeError as te:
        logger.error("Argument error calling %s: %s", tool_name, te)
        return {"error": f"Invalid arguments provided for tool '{tool_name}': {te}"}
    except Exception as exc:
        logger.error("Unexpected error executing %s: %s", tool_name, exc, exc_info=True)
        return {"error": f"Internal tool execution error: {str(exc)}"}


class AgentExecutionError(Exception):
    """Raised for irrecoverable agent execution failures."""
    pass


def run_agent_turn(
    user_message: str,
    client: Optional[OpenAI] = None,
    model_override: Optional[str] = None,
) -> Tuple[str, List[ToolCallSummary]]:
    """Run an agent turn with the OpenAI API and local tool execution loop.

    Returns:
        Tuple of (reply_text, list_of_tool_call_summaries)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.strip() in ["", "your_openai_api_key_here"]:
        raise AgentExecutionError(
            "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable "
            "in your .env file or deployment settings."
        )

    model_name = model_override or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if client is None:
        client = OpenAI(api_key=api_key)

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    tool_summaries: List[ToolCallSummary] = []
    iteration = 0

    while iteration < MAX_AGENT_ITERATIONS:
        iteration += 1

        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                tools=OPENAI_TOOLS,
                tool_choice="auto",
                temperature=0.0,  # Deterministic factual generation
            )
        except openai.AuthenticationError as err:
            logger.error("OpenAI authentication error: %s", err)
            raise AgentExecutionError("OpenAI authentication failed. Please check your API key.") from err
        except openai.RateLimitError as err:
            logger.error("OpenAI rate limit error: %s", err)
            raise AgentExecutionError("OpenAI rate limit reached. Please retry in a few moments.") from err
        except (openai.APITimeoutError, openai.APIConnectionError) as err:
            logger.error("OpenAI connection/timeout error: %s", err)
            raise AgentExecutionError("Unable to reach OpenAI service. Please check network connectivity.") from err
        except Exception as err:
            logger.error("Unexpected OpenAI API error: %s", err, exc_info=True)
            raise AgentExecutionError("Error communicating with AI service. Please try again.") from err

        choice = response.choices[0]
        response_msg = choice.message

        # Append assistant's response to message history
        # We construct a clean dict for subsequent turns
        assistant_turn: Dict[str, Any] = {
            "role": "assistant",
            "content": response_msg.content or "",
        }
        if response_msg.tool_calls:
            assistant_turn["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in response_msg.tool_calls
            ]
        messages.append(assistant_turn)

        # Check if the model made tool calls
        if not response_msg.tool_calls:
            # Final reply reached
            final_reply = response_msg.content or "No response generated."
            return final_reply, tool_summaries

        # Execute all tool calls from the model
        for tool_call in response_msg.tool_calls:
            tool_name = tool_call.function.name
            raw_args = tool_call.function.arguments

            try:
                parsed_args = json.loads(raw_args) if raw_args else {}
            except json.JSONDecodeError:
                logger.warning("Model passed malformed JSON for tool %s: %s", tool_name, raw_args)
                parsed_args = {}

            # Execute tool
            tool_result = execute_tool_safely(tool_name, parsed_args)

            # Record safe summary for UI
            summary_text = generate_human_readable_summary(tool_name, parsed_args, tool_result)
            tool_summaries.append(
                ToolCallSummary(
                    tool_name=tool_name,
                    arguments=parsed_args,
                    summary=summary_text,
                    record_count=tool_result.get("total_matches") or tool_result.get("total_orders"),
                )
            )

            # Feed tool response back into conversation
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_name,
                "content": json.dumps(tool_result),
            })

    # If maximum iterations exceeded, ask model for a final synthesis with the tools gathered so far
    try:
        final_response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.0,
        )
        return final_response.choices[0].message.content or "Completed calculations.", tool_summaries
    except Exception as exc:
        logger.error("Failed to generate final synthesis after max iterations: %s", exc)
        return "Calculations complete based on retrieved order records.", tool_summaries
