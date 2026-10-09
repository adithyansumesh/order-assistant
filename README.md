# Order Assistant — Store AI Platform

Order Assistant is a production-ready, full-stack AI agent application designed for querying, exploring, and analyzing e-commerce store orders. Built with **FastAPI** and **React 19 + TypeScript + Vite**, the assistant employs model-native tool calling grounded strictly in deterministic backend operations on a real dataset (`orders.csv`), eliminating hallucinations and delivering mathematically exact order details, status summaries, and financial analytics.

---

## 1. Main Features

- **Genuine AI Tool Calling**: The LLM autonomously inspects queries and executes appropriate backend tools (`get_order_details`, `search_orders`, `calculate_order_analytics`). The model never receives the raw dataset in its prompt; it interacts exclusively through typed tool schemas.
- **Strict Grounding & Anti-Hallucination**: All factual answers about orders, customer spending, revenues, and counts are grounded in the active dataset. If an order does not exist or a filter returns no matches, it truthy reports that.
- **Financial Precision**: Explicitly distinguishes between **gross recorded order value** (all orders) and **realized net revenue** (delivered orders only), detailing exact deductions for cancelled and returned orders.
- **6 Comprehensive Views**:
  - **Assistant Chat**: Interactive conversational interface with suggested queries, keyboard shortcuts, markdown rendering, and transparent tool execution disclosure.
  - **Order Insights**: Executive KPI metrics, interactive revenue area charts, category distribution bars, fulfillment breakdown, and dynamic customer spend leaderboard.
  - **Order Explorer**: Real-time paginated directory with multi-field search (order ID, customer name, product, city) and status filtering.
  - **Data Management**: Production CSV intake with drag-and-drop file upload, pre-flight schema validation, tabular staged preview, append ingestion with duplicate detection, replacement ingestion with automatic snapshot backups, and direct active dataset download.
  - **Tool & Model Inspector**: Real-time diagnostic viewer inspecting model configuration, data connection, and tool schemas.
  - **System Settings**: Model provider selection, dataset file path management, and interface preferences.
- **Dynamic Dataset Reactivity**: When new orders are uploaded or modified via Data Management, all views (Chat, Insights, Explorer, and Tools) immediately reflect the active dataset without requiring server restarts.

---

## 2. Technology Stack

- **Frontend**:
  - React 19 + TypeScript
  - Vite 6
  - Lucide React (Icons)
  - Custom Responsive Design System (Desktop, Tablet, and Mobile layouts)
- **Backend**:
  - Python 3.11+ / 3.14
  - FastAPI (REST API & static SPA asset serving)
  - Pydantic v2 (Request/response schemas & data validation)
  - Pandas (CSV loading, schema verification, and deterministic analytics)
  - Groq / OpenAI SDK (Tool-calling inference via `llama-3.3-70b-versatile` or `gpt-4o-mini`)
  - Uvicorn (ASGI production server)
- **Testing**:
  - Pytest & FastAPI TestClient (31 automated unit and integration tests)
- **Deployment**:
  - **Frontend**: Vercel (SPA with client-side rewrites)
  - **Backend**: Render Web Service (`render.yaml`) / Containerized FastAPI
  - **Serverless Fallback**: Vercel Serverless Function entry point (`api/index.py`)

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  React 19 + TypeScript + Vite SPA (Hosted on Vercel)        │
│  Views: Chat | Insights | Explorer | Data Management        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│  FastAPI REST API (Hosted on Render / Container)             │
│  Routes: /api/chat, /api/orders, /api/stats, /api/data/*     │
└──────────────┬───────────────────────────────┬──────────────┘
               │ Tool Calls                    │ Data Ops
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      AI Agent Engine         │ │    Data Management Engine  │
│  LLM: Groq / OpenAI          │ │  Pandas DataFrame Cache    │
│  Tools:                      │ │  orders.csv (Active File)  │
│  - get_order_details         │ │  backups/ (Snapshots)      │
│  - search_orders             │ │  orders_seed.csv (Reset)   │
│  - calculate_order_analytics │ └────────────────────────────┘
└──────────────────────────────┘
```

---

## 4. Repository Structure

```
order-assistant/
├── api/
│   └── index.py              # Vercel Serverless Function entry point
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI application, CORS, and REST endpoints
│   ├── agent.py             # LLM tool-calling loop and dispatch
│   ├── tools.py             # Deterministic analytics, search, and lookup tools
│   ├── data.py              # CSV validator, append/replace ingestion, caching
│   └── schemas.py           # Pydantic validation schemas
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Header, Sidebar, DataManagement, etc.)
│   │   ├── App.tsx          # Main state container and tab navigation
│   │   ├── config.ts        # Environment API base URL resolver
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── index.css        # Responsive design system
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vercel.json          # Frontend SPA routing configuration
├── tests/
│   ├── test_data.py         # CSV schema and loading validation tests
│   ├── test_tools.py        # Analytics, search, and lookup unit tests
│   ├── test_agent.py        # Mocked agent execution and tool loop tests
│   ├── test_api.py          # API endpoint and health tests
│   └── test_data_management.py # CSV validation and ingestion tests
├── orders.csv               # Authentic active dataset (60 verified records)
├── orders_seed.csv          # Safe baseline dataset for recovery/reset
├── render.yaml              # Render Blueprint deployment configuration
├── vercel.json              # Root Vercel deployment configuration
├── requirements.txt         # Python dependencies
├── run.py                   # Single-command local launcher
├── .env.example             # Environment template with placeholders
├── README.md                # Project documentation
└── WRITEUP.md               # Engineering decisions and architecture write-up
```

---

## 5. Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: 18.0 or newer (with npm)
- **API Key**: A valid Groq API key (`gsk_...`) or OpenAI API key (`sk-...`)

---

## 6. Local Installation & Setup

Set up the project in two simple steps:

### 1. Clone the repository and install dependencies

```bash
# Clone the repository
git clone https://github.com/<your-username>/order-assistant.git
cd order-assistant

# Set up Python virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies and build assets
cd frontend
npm install
npm run build
cd ..
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to provide your API key:

```env
# Choose Groq (recommended for speed) or OpenAI:
GROQ_API_KEY=gsk_your_groq_api_key_here
# or
OPENAI_API_KEY=sk-your_openai_api_key_here
```

---

## 7. Running the Application Locally

### Option A: Single Command Launcher (Serves Frontend & Backend on Port 8000)

```bash
python run.py
```

Open **`http://localhost:8000`** in your browser.

### Option B: Separate Frontend Dev Server with Hot Reload

```bash
# Terminal 1 (Backend):
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 (Frontend):
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser (API requests automatically proxy to port 8000).

---

## 8. Required Environment Variables

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq API Key (starts with `gsk_`) | Optional* | None |
| `OPENAI_API_KEY` | OpenAI API Key (starts with `sk-`) | Optional* | None |
| `OPENAI_MODEL` | Model to use for tool calling | Optional | `llama-3.3-70b-versatile` (Groq) or `gpt-4o-mini` (OpenAI) |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible APIs | Optional | `https://api.groq.com/openai/v1` (if Groq) |
| `VITE_API_BASE_URL` | Public backend URL for frontend (set on Vercel) | Optional | Relative `/api` (local) |
| `ORDERS_CSV_PATH` | Path override for active dataset | Optional | `orders.csv` in project root |
| `PORT` | HTTP server port | Optional | `8000` |
| `HOST` | HTTP server host binding | Optional | `0.0.0.0` |

*\* At least one AI API key (`GROQ_API_KEY` or `OPENAI_API_KEY`) is required for Assistant Chat.*

---

## 9. How the Agent Uses Tools

The agent uses native model tool calling to query the store dataset:

1. **`get_order_details`**:
   - Triggered when queries include an exact order ID (e.g. *"What is the status of ORD-1025?"*).
   - Returns full order record: customer name, product, quantity, unit price, total INR, payment method, order date, and fulfillment status.
2. **`search_orders`**:
   - Triggered for attribute-based searches (e.g. *"Show orders from Chennai"*, *"Which orders are currently in transit?"*).
   - Supports filtering by `status`, `city`, `category`, `customer_name`, and `date_from`/`date_to`.
3. **`calculate_order_analytics`**:
   - Triggered for numerical calculations (e.g. *"What was the revenue of Electronics in August?"*, *"Who is our top customer?"*).
   - Operations: `sum_revenue`, `count_orders`, `average_order_value`, `customer_spending_ranking`, `category_breakdown`, `city_breakdown`, `status_breakdown`, `monthly_trend`.

---

## 10. CSV Schema & Data Management

### Required CSV Schema (11 Columns)

Any uploaded CSV must contain the following header columns (case-insensitive, whitespace-trimmed):

```csv
order_id,order_date,customer_name,city,product,category,quantity,unit_price_inr,total_inr,payment_method,status
```

- **Validation Rules**:
  - `order_id`: Non-empty string, unique within the dataset.
  - `order_date`: ISO-8601 formatted date (`YYYY-MM-DD`).
  - `quantity`: Positive integer.
  - `unit_price_inr`, `total_inr`: Positive numbers.
  - `status`: One of `delivered`, `cancelled`, `returned`, `processing`, `shipped`.

### Ingestion Modes:
- **Append New Records**: Ingests new unique rows. Automatically skips existing duplicate order IDs and reports them.
- **Replace Current Dataset**: Atomically swaps the active dataset after creating a dated snapshot backup in `backups/`.

---

## 11. Running the Automated Test Suite

Run all 31 unit and integration tests with pytest:

```bash
pytest
```

All tests execute in ~1.5 seconds. Tests mock external AI provider calls so they run deterministically without incurring API charges or requiring network access.

---

## 12. Deployment Architecture & Hosting

### Recommended Production Architecture (Vercel Frontend + Render Backend)

Because production CSV uploads, appending, and snapshot backups require persistent filesystem storage that survives serverless container recycling, the recommended architecture separates the frontend and backend:

1. **Frontend on Vercel**:
   - Hosted as a high-speed React SPA on Vercel's global CDN.
   - Configure **Output Directory**: `frontend/dist` (or set Root Directory to `frontend`).
   - Add environment variable `VITE_API_BASE_URL` pointing to your deployed backend URL.
2. **Backend on Render (or container host)**:
   - Deployed as a Web Service using the included `render.yaml`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Environment Variables: `GROQ_API_KEY` (or `OPENAI_API_KEY`), `PYTHON_VERSION=3.11.9`.
   - Health check endpoint: `/api/health`.

---

## 13. Live Application & Repository Links

- **GitHub Repository**: [https://github.com/adithyansumesh/order-assistant](https://github.com/adithyansumesh/order-assistant)
- **Production Live URL (Vercel Full-Stack)**: [https://order-assistant-weld.vercel.app](https://order-assistant-weld.vercel.app)
- **Vercel Project Dashboard**: [https://vercel.com/adithyansreevinu-7233s-projects/order-assistant](https://vercel.com/adithyansreevinu-7233s-projects/order-assistant)
- **Local Host**: [http://localhost:8000](http://localhost:8000)

---

## 14. Known Limitations

- **Free-Tier Cold Starts**: If using a free-tier backend host (e.g. Render free tier), the server may spin down after 15 minutes of inactivity, causing the first request after idle to take ~30–50 seconds to boot.
- **Multi-Instance Serverless Storage**: Serverless platforms (like Vercel Functions) have ephemeral, non-shared filesystems; persistent CSV modifications require a containerized backend or persistent volume for cross-device synchronization.
