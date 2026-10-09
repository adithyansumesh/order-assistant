# Order Assistant — Store Orders AI Agent

Order Assistant is a production-ready, full-stack AI agent application built for querying and analyzing e-commerce store orders. The assistant is powered by genuine OpenAI function/tool calling grounded in deterministic backend operations on a real dataset (`orders.csv`), preventing hallucinations and delivering mathematically exact order facts, revenue analytics, and status lookups.

---

## 1. Key Features

- **Genuine AI Tool Calling**: The LLM autonomously determines when and which backend tools to invoke (`get_order_details`, `search_orders`, `calculate_order_analytics`). The model never receives the raw 60-row dataset in its prompt; it interacts solely through structured tool outputs.
- **Strict Grounding & Anti-Hallucination**: All factual answers about orders, customer spending, revenues, and counts are grounded in the dataset. If an order does not exist or a filter returns no matches, it truthy reports that.
- **Revenue Clarity**: Explicitly distinguishes between gross recorded order values (all orders) and realized net revenue (delivered orders only), accounting for cancelled (₹72,634) and returned orders.
- **Deterministic Analytics Engine**: High-performance aggregations powered by Pandas for calculating counts, sums, rankings, averages, and group breakdowns.
- **SaaS UI Dashboard**: Clean, responsive interface featuring real-time dataset health, quick KPI stats banner, clickable question suggestions, transparent "Tools used" disclosure, multiline message composer with keyboard shortcuts, and graceful error recovery.
- **Single-Service Architecture**: The React + TypeScript + Vite frontend is pre-built into static assets and served directly by FastAPI, enabling zero-hassle deployment on Render under a single unified URL.

---

## 2. Tech Stack

- **Backend**:
  - Python 3.11+ / 3.14
  - FastAPI (REST API & static SPA file serving)
  - Pydantic v2 (Request/response schemas & validation)
  - Pandas (CSV loading, validation, and analytics)
  - OpenAI Python SDK (Genuine model-supported tool calling)
  - Pytest & FastAPI TestClient (26 automated unit and integration tests)
  - Uvicorn (ASGI server)
- **Frontend**:
  - React 19 + TypeScript
  - Vite 6
  - Lucide React (Clean iconography)
  - Custom Responsive SaaS CSS Design System
- **Deployment**:
  - Render Web Service
  - `render.yaml` Blueprint

---

## 3. Project Directory Structure

```
order-assistant/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI application, CORS, endpoints, SPA serving
│   ├── agent.py         # OpenAI tool-calling loop, multi-turn dispatch, error handling
│   ├── tools.py         # search_orders, calculate_order_analytics, get_order_details
│   ├── data.py          # CSV loader, schema validator, duplicate detector, cache
│   └── schemas.py       # Pydantic schemas for requests, responses, and tool models
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx        # Brand logo, title, and live dataset health pill
│   │   │   ├── StatsBanner.tsx   # Top KPI metrics strip
│   │   │   ├── MessageBubble.tsx # User/assistant bubbles, markdown, retry option
│   │   │   ├── ToolCallsBadge.tsx# Transparent "Tools used" collapsible disclosure
│   │   │   └── ExampleChips.tsx  # Clickable suggested questions
│   │   ├── App.tsx               # Main application container & chat state
│   │   ├── index.css             # Cohesive SaaS design system & typography
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── main.tsx              # React entry point
│   ├── dist/                     # Production build artifacts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── tests/
│   ├── __init__.py
│   ├── test_data.py     # Dataset loading, required column checks, duplicate checks
│   ├── test_tools.py    # Order lookup, status filters, analytics, customer ranking
│   ├── test_agent.py    # Mocked OpenAI agent loop, tool dispatch, error handling
│   └── test_api.py      # Health, stats, chat validation, and SPA endpoint tests
├── orders.csv           # Source of truth dataset (60 orders, June - Sept 2026)
├── run.py               # Single-command application launcher
├── render.yaml          # Render Blueprint deployment configuration
├── requirements.txt     # Python production dependencies
├── .env.example         # Environment template with placeholders
├── .gitignore           # Git ignore rules excluding secrets, venvs, and build folders
├── README.md            # Comprehensive project documentation
└── WRITEUP.md           # Engineering decision write-up
```

---

## 4. Dataset Overview (`orders.csv`)

The application uses the provided `orders.csv` containing 60 orders spanning June 1, 2026 to September 28, 2026:
- **Columns**: `order_id, order_date, customer_name, city, product, category, quantity, unit_price_inr, total_inr, payment_method, status`
- **Total Recorded Order Value**: ₹4,70,312 (60 orders)
- **Delivered Realized Revenue**: ₹3,71,040 (48 orders)
- **Cancelled Orders**: 7 orders, total value ₹72,634
- **Returned Orders**: 3 orders, total value ₹24,292
- **In-Progress / Pending Orders**: 2 orders (ORD-1059: `processing`, ORD-1060: `shipped`)
- **Top Customer Spender**: Rohan Das (₹1,12,282 total across 7 orders)
- **Consistency**: All rows satisfy `quantity * unit_price_inr == total_inr` with zero nulls.

---

## 5. Prerequisites

- Python 3.11 or newer
- Node.js v18 or newer and npm
- An OpenAI API Key (e.g. `sk-...`)

---

## 6. Local Setup and Installation

### Step 1: Clone or Navigate to the Workspace
```bash
cd order-assistant
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Open `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=8000
HOST=0.0.0.0
```

### Step 3: Set Up Python Virtual Environment
```bash
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate

# On Windows:
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies and Build Assets
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 7. Running the Application

### Option A: Single-Command Production Mode (Recommended)
This runs the unified FastAPI server which serves both the API and the built React frontend on `http://localhost:8000`:

```bash
python run.py
```
Or directly with Uvicorn:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Visit **http://localhost:8000** in your browser.

---

### Option B: Dual Development Server Mode (with Hot Reloading)
If you want live hot-reloading for frontend modifications:

**Terminal 1 (Backend API):**
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 (Frontend Vite Server):**
```bash
cd frontend
npm run dev
```
Visit **http://localhost:5173** (Vite proxies all `/api/*` calls to FastAPI at port 8000).

---

## 8. Running Automated Tests

Run the complete test suite with pytest:
```bash
pytest -v
```

All 26 automated tests run in ~1.3 seconds and require no paid API calls (external OpenAI calls are mocked):
```
tests/test_agent.py::test_agent_executes_tool_call_and_returns_grounded_reply PASSED
tests/test_agent.py::test_agent_missing_api_key_raises_informative_error PASSED
tests/test_agent.py::test_execute_tool_safely_unallowlisted_tool PASSED
tests/test_agent.py::test_generate_human_readable_summary PASSED
tests/test_api.py::test_health_endpoint_success PASSED
tests/test_api.py::test_stats_endpoint_matches_csv_aggregates PASSED
tests/test_api.py::test_chat_endpoint_rejects_empty_or_whitespace_message PASSED
tests/test_api.py::test_chat_endpoint_rejects_excessively_long_message PASSED
tests/test_api.py::test_chat_endpoint_successful_mocked_interaction PASSED
tests/test_api.py::test_chat_endpoint_agent_execution_error_handled_gracefully PASSED
tests/test_api.py::test_health_endpoint_degraded_when_dataset_missing PASSED
tests/test_api.py::test_spa_index_served PASSED
tests/test_data.py::test_real_dataset_loads_successfully PASSED
tests/test_data.py::test_missing_required_column_raises_error PASSED
tests/test_data.py::test_duplicate_order_ids_raises_error PASSED
tests/test_data.py::test_nonexistent_dataset_file_raises_error PASSED
tests/test_tools.py::test_get_existing_order_details PASSED
tests/test_tools.py::test_get_nonexistent_order_details PASSED
tests/test_tools.py::test_search_orders_by_status PASSED
tests/test_tools.py::test_search_orders_pending PASSED
tests/test_tools.py::test_search_orders_by_city_and_customer PASSED
tests/test_tools.py::test_calculate_cancelled_orders_count PASSED
tests/test_tools.py::test_calculate_category_revenue_for_month PASSED
tests/test_tools.py::test_ranking_customers_by_spending PASSED
tests/test_tools.py::test_average_order_value PASSED
tests/test_tools.py::test_invalid_operation_returns_error PASSED
============================== 26 passed in 1.34s ==============================
```

---

## 9. API Documentation

### 1. `POST /api/chat`
Processes questions about store orders using the AI Agent tool-calling loop.

**Request:**
```json
{
  "message": "What is the status of order ORD-1025?"
}
```

**Success Response (HTTP 200):**
```json
{
  "reply": "Order ORD-1025 was placed by Karthik Rao on July 14, 2026, for 3 units of Wireless Mouse (totaling ₹2,397). Its current status is delivered.",
  "tool_calls": [
    {
      "tool_name": "get_order_details",
      "arguments": {
        "order_id": "ORD-1025"
      },
      "summary": "Looked up order ORD-1025 (Found)",
      "record_count": null
    }
  ],
  "error": null
}
```

**Validation Error Response (HTTP 422):**
If `message` is empty, contains only whitespace, or exceeds 2,000 characters.

**Graceful Configuration / Upstream Error Response (HTTP 200):**
```json
{
  "reply": "I encountered an issue processing your request.",
  "tool_calls": [],
  "error": "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable in your .env file or deployment settings."
}
```

---

### 2. `GET /api/health`
Returns system health, dataset status, and loaded order count.

**Response (HTTP 200):**
```json
{
  "status": "healthy",
  "dataset_loaded": true,
  "total_orders": 60,
  "version": "1.0.0"
}
```

---

### 3. `GET /api/stats`
Returns summary statistics and distributions derived directly from `orders.csv`.

**Response (HTTP 200):**
```json
{
  "total_orders": 60,
  "total_recorded_value_inr": 470312.0,
  "realized_revenue_inr": 371040.0,
  "cancelled_orders_count": 7,
  "cancelled_value_inr": 72634.0,
  "returned_orders_count": 3,
  "pending_orders_count": 2,
  "orders_by_status": {
    "delivered": 48,
    "cancelled": 7,
    "returned": 3,
    "processing": 1,
    "shipped": 1
  },
  "orders_by_category": {
    "Electronics": 21,
    "Accessories": 18,
    "Stationery": 11,
    "Furniture": 10
  },
  "orders_by_city": {
    "Chennai": 21,
    "Thiruvananthapuram": 16,
    "Kochi": 13,
    "Hyderabad": 4,
    "Bengaluru": 4,
    "Pune": 2
  },
  "date_range": {
    "start": "2026-06-01",
    "end": "2026-09-28"
  }
}
```

---

## 10. How the AI Agent Uses Tools

The agent operates in a closed deterministic loop:
```
User Question
      │
      ▼
OpenAI LLM + Tool Definitions
      │
      ▼
LLM selects Tool & generates JSON arguments
      │
      ▼
Backend validates & executes Python tool against orders.csv
      │
      ▼
Tool outputs returned to LLM as role='tool' message
      │
      ▼
LLM produces final grounded answer (or selects next tool, max 5 iterations)
      │
      ▼
Safe reply + Tool summaries returned to client
```

### Registered Tools:
1. `get_order_details(order_id)`:
   - Used for queries with an exact order ID (e.g. "Status of ORD-1025").
   - Case-insensitive lookup; returns exact attributes or explicit not-found structure.
2. `search_orders(order_id, customer_name, city, product, category, status, start_date, end_date, limit)`:
   - Used for listing orders or searching by customer, city, or status (e.g. "Show all orders from Chennai", "Which orders are pending?").
   - Maps `pending` to active non-final orders (`processing` and `shipped`).
3. `calculate_order_analytics(operation, category, month, year, city, status, customer_name, top_n)`:
   - Used for quantitative questions (e.g. "How many orders were cancelled?", "Total revenue from Electronics in August", "Which customer has spent the most?").
   - Always provides both gross recorded value and realized delivered revenue.

---

## 11. Deployment on Render

The repository is configured for single-service deployment on Render.

### Option 1: Render Blueprint (`render.yaml`)
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml`.
4. Provide your `OPENAI_API_KEY` under Environment Variables.
5. Click **Apply**.

### Option 2: Manual Web Service Setup on Render
1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Environment**: Python 3
   - **Region**: Oregon (or your preferred region)
   - **Branch**: main
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && cd frontend && npm install && npm run build && cd ..
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Health Check Path**: `/api/health`
4. Under **Environment Variables**, add:
   - `OPENAI_API_KEY`: `your_actual_openai_key`
   - `OPENAI_MODEL`: `gpt-4o-mini`
   - `PYTHON_VERSION`: `3.11.9`
5. Click **Create Web Service**.

---

## 12. Troubleshooting and Known Limitations

- **Render Free Tier Cold Starts**: On Render's free tier, inactive services spin down after 15 minutes of inactivity. The first request after sleep may take 30-50 seconds to respond. Subsequent requests are fast.
- **Dataset Read-Only Scope**: The dataset is static and read-only. The assistant cannot modify orders, create new records, or execute refunds.
- **Max Agent Turns**: The agent loop is bounded at 5 iterations to prevent infinite recursion and limit cost.
