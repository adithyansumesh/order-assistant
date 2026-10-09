# Order Assistant — Technical Write-Up

## 1. Architecture and Data Flow

Order Assistant is built as a production-grade, full-stack AI application combining a modern **React 19 + TypeScript + Vite** frontend with a high-performance **FastAPI (Python 3.11+)** backend:

- **Frontend Interface**: Features six comprehensive views — Assistant Chat, Order Insights (executive KPIs, charts, customer leaderboard), Order Explorer (paginated directory with real-time filtering), Data Management (CSV drag-and-drop intake, pre-flight schema validation, append/replace ingestion, and snapshot backups), Tool & Model Inspector, and System Settings.
- **Backend & Data Engine**: Operates directly on the active store dataset (`orders.csv`). The backend strictly enforces schema integrity, validates data types, standardizes ISO dates, trims whitespace, and rejects duplicate order IDs. In-memory DataFrame caching provides sub-millisecond query execution, while persistent disk storage ensures changes survive reboots.
- **AI Agent Interaction**: The user's query passes from the React client to `/api/chat`. The agent loop invokes LLM tool-calling (via Groq/OpenAI with `llama-3.3-70b-versatile` or `gpt-4o-mini`). The LLM does not ingest the raw 60-row dataset in its system prompt; rather, it autonomously queries allowlisted tools and receives deterministic, grounded results.

## 2. Agent Tool Selection & Execution Flow

The agent utilizes three allowlisted, strictly typed tools defined in `backend/tools.py`:
1. `get_order_details`: Selected for exact single-record lookups whenever an order ID (e.g., `ORD-1025`) is specified.
2. `search_orders`: Selected for qualitative queries, listing matching orders by attributes (customer name, city, category, date range), or identifying pending/in-transit orders (`processing` or `shipped`).
3. `calculate_order_analytics`: Selected for mathematical and statistical aggregations (order counts, gross vs. delivered revenue, average order value, customer spend rankings, category breakdown, city breakdown, status breakdown, and monthly sales trends).

### Tool Execution & Grounding
- **Strict Grounding**: The LLM synthesizes final answers based strictly on deterministic tool outputs. If an order is not found, the agent states this truthfully rather than hallucinating details.
- **Financial Precision**: System instructions and tool logic strictly separate **gross recorded order value** (all 60 orders = ₹4,70,312) from **realized net revenue** (48 delivered orders = ₹3,71,040), explicitly detailing deductions for cancelled (₹72,634) and returned (₹24,292) orders.

## 3. Guardrails and Error Handling

- **Deterministic Computation**: All mathematical operations (sums, averages, counts, rankings) are performed directly in Python/Pandas, avoiding LLM arithmetic errors.
- **Strict Parameter Validation**: Tools validate incoming arguments against defined schemas. Unallowlisted tools and malformed arguments are caught and handled gracefully.
- **Loop Bound Safeguard**: The tool-calling loop enforces a hard ceiling of 5 iterations (`MAX_AGENT_ITERATIONS`), preventing runaway token loops.
- **Secret Isolation**: Upstream API keys (`GROQ_API_KEY`, `OPENAI_API_KEY`) remain strictly on the backend. Frontend configuration uses public variables (`VITE_API_BASE_URL`) only.
- **Dataset Protection**: Invalid CSV uploads fail pre-flight validation without corrupting the active dataset. Replacement ingestion automatically archives snapshots in `backups/`.

## 4. Deployment Architecture

- **Frontend Hosting (Vercel)**: The React/Vite application is deployed to Vercel as a high-speed SPA. `vercel.json` ensures client-side routing rewrites (`/(.*)` -> `/index.html`) work on deep links and page refreshes. When decoupled, `VITE_API_BASE_URL` directs API traffic to the backend.
- **Backend Hosting (Render / Persistent Container)**: Because CSV uploads, append/replace ingestion, and snapshot backups require a persistent, writable filesystem that survives serverless container recycling, the FastAPI backend is designed for persistent container hosting (e.g. Render Web Service via `render.yaml` or unified FastAPI asset serving). A Vercel Serverless Function entry point (`api/index.py`) is also provided for unified serverless environments.
- **Environment Management**: Secrets are stored in platform environment settings. Zero credentials or `.env` files are tracked in Git.

## 5. Potential Improvements with More Time

1. **Streaming Responses**: Add Server-Sent Events (SSE) for token-by-token streaming in Assistant Chat.
2. **Persistent Cloud Storage**: Integrate Google Cloud Storage (GCS) or AWS S3 for cloud-replicated CSV backups across distributed regions.
3. **Multi-Turn Memory**: Implement session-based conversation caching with Redis.

## 6. AI Tools Used During Development

- **Google Antigravity**: Agentic AI pair programming assistant used for codebase architecture, backend tool implementation, automated testing, and dataset integrity verification.
- **Google Stitch**: Used for generative UI/UX design, responsive layout specifications, and screen generation for the Order Assistant and Data Management interfaces.
- **Groq & OpenAI Models**: High-speed inference and tool-calling validation via `llama-3.3-70b-versatile` and `gpt-4o-mini`.
