# Order Assistant — Technical Write-Up

## 1. Architecture and Technology Choices

Order Assistant is built as a single-service, full-stack application pairing **FastAPI (Python 3.14/3.11)** with **React 19 + TypeScript + Vite**. 

- **Single Public URL Strategy**: Rather than maintaining disjoint web services and dealing with cross-origin cookie/credential friction, the React SPA is compiled into static assets and mounted directly on the root path of the FastAPI application. API routes are strictly scoped under `/api/*`.
- **Pandas Data Layer with Strict Validation**: The dataset (`orders.csv`) is verified at startup. Column types are explicitly coerced, order IDs preserved as strings, duplicate IDs rejected, and dates standardized. Rather than querying an external database, Pandas executes deterministic aggregations in-memory with sub-millisecond latency.
- **Genuine Function Calling**: The application uses the official OpenAI Python SDK (`chat.completions.create` with native `tools` JSON schemas) rather than raw prompt engineering or mock routing. The model never sees the entire dataset in its prompt; it interacts exclusively via structured tools.

## 2. Tool Decision Logic and Execution Flow

The agent utilizes three allowlisted tools registered with OpenAI:
1. `get_order_details`: Specifically targeted for single-record lookups whenever an exact `order_id` is detected.
2. `search_orders`: Targeted for qualitative queries, listing matching orders by attributes (e.g., city, category, customer name, date window), or finding pending orders (`processing`/`shipped`).
3. `calculate_order_analytics`: Targeted for mathematical and statistical queries (counts, sums, averages, customer spend rankings, group breakdowns).

### Tool Output Processing & Grounding
When the model invokes a tool:
1. Arguments are validated and executed server-side against the cached DataFrame.
2. The deterministic result is returned to the conversation as a `role: "tool"` message.
3. The LLM synthesizes the final reply based strictly on the structured tool output.
4. **Revenue Precision**: To prevent misleading financial claims, the analytics engine and system prompt distinguish between **gross recorded order value** (all 60 orders = ₹4,70,312) and **realized revenue** (delivered orders = ₹3,71,040), making the exclusion of cancelled (₹72,634) and returned (₹24,292) orders explicit.

## 3. Guardrails and Error Handling

- **Zero Arbitrary Execution**: Tools accept only structured, typed parameters. No arbitrary SQL or Python code execution is possible.
- **Loop Bounds**: The agent loop is constrained to a maximum of 5 iterations to prevent runaway loops or budget exhaustion.
- **Fail-Safe Secret Protection**: API keys and stack traces are never passed to the client. When `OPENAI_API_KEY` is missing or upstream services fail, structured error messages inform the user without crashing the server.
- **Input Validation**: `ChatMessageRequest` enforces character limits (1 to 2,000 characters) and rejects whitespace-only queries with HTTP 422.

## 4. Deployment Status and Methodology

- **Configuration**: Ready for zero-friction deployment on Render using the included `render.yaml` Blueprint or standard Web Service configuration.
- **Deployment Status**: Configured and verified locally. The full production build and test suite pass (26/26 tests). Actual public deployment on Render requires pushing to a GitHub repository and attaching an active `OPENAI_API_KEY` in the Render dashboard.

## 5. Potential Improvements with More Time

1. **Streaming Responses**: Implement Server-Sent Events (SSE) for token-by-token streaming in the UI.
2. **Conversational Memory**: Persist multi-turn conversation context across sessions via an ephemeral cache (e.g. Redis).
3. **Interactive Charts**: Render visual bar and line charts in the chat window for aggregations like monthly revenue trends and category breakdowns.

## 6. AI Tools Used During Development

- **Antigravity AI (Pair Programming Agent)**: Used for rapid scaffolding, automated test generation, dataset profiling, and documentation creation.
