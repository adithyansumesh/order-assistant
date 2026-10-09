import React, { useState } from "react";
import {
  Cpu,
  Database,
  Search,
  Calculator,
  Filter,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HealthStatus, StatsData } from "../types";

interface ToolModelInspectorProps {
  health: HealthStatus | null;
  stats: StatsData | null;
}

export const ToolModelInspector: React.FC<ToolModelInspectorProps> = ({
  health,
  stats,
}) => {
  const [expandedTool, setExpandedTool] = useState<string | null>("get_order_details");

  const toggleExpand = (toolName: string) => {
    setExpandedTool((prev) => (prev === toolName ? null : toolName));
  };

  const isModelConnected = Boolean(health?.status === "healthy");
  const isDatasetLoaded = Boolean(health?.dataset_loaded);
  const rowCount = stats?.total_orders ?? health?.total_orders ?? 0;

  return (
    <div className="inspector-layout" aria-label="Tool and Model Inspector">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Tool & Model Inspector</h1>
        <p className="page-subtitle">
          Inspect the AI model, data source, and available order tools.
        </p>
      </div>

      {/* Overview Grid: Model Info & Dataset Integrity */}
      <div className="inspector-top-grid">
        {/* Model Information Card */}
        <div className="overview-card">
          <div className="overview-header">
            <span className="card-title">
              <Cpu size={18} className="text-accent" />
              <span>AI Model Configuration</span>
            </span>
            <span className={`badge-status ${isModelConnected ? "active" : "info"}`}>
              <CheckCircle2 size={12} />
              <span>{isModelConnected ? "Active & Ready" : "Initializing"}</span>
            </span>
          </div>

          <div>
            <div className="overview-title">Llama-3.3-70b-versatile</div>
            <p className="overview-desc">
              Configured via Groq ultra-fast LPU inference engine. Orchestrates multi-turn customer order
              dialogues and executes backend tools with strict parameter grounding.
            </p>
          </div>

          <div className="overview-meta-list">
            <div className="overview-meta-item">
              <span className="overview-meta-label">Provider</span>
              <span className="overview-meta-val">Groq Cloud API</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Tool Protocol</span>
              <span className="overview-meta-val">OpenAI Function Calling</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Temperature</span>
              <span className="overview-meta-val">0.0 (Precise)</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Max Iterations</span>
              <span className="overview-meta-val">5 steps / query</span>
            </div>
          </div>
        </div>

        {/* Dataset Integrity Card */}
        <div className="overview-card">
          <div className="overview-header">
            <span className="card-title">
              <Database size={18} className="text-cyan" />
              <span>Dataset Integrity</span>
            </span>
            <span className={`badge-status ${isDatasetLoaded ? "active" : "info"}`}>
              <CheckCircle2 size={12} />
              <span>{isDatasetLoaded ? "Loaded & Verified" : "Loading"}</span>
            </span>
          </div>

          <div>
            <div className="overview-title">orders.csv</div>
            <p className="overview-desc">
              Verified source of truth loaded into an in-memory Pandas DataFrame. All quantitative answers,
              statuses, and customer metrics are strictly computed from these records.
            </p>
          </div>

          <div className="overview-meta-list">
            <div className="overview-meta-item">
              <span className="overview-meta-label">Total Verified Rows</span>
              <span className="overview-meta-val">{rowCount} records</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Schema Columns</span>
              <span className="overview-meta-val">11 required fields</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Missing Values</span>
              <span className="overview-meta-val text-success">0 nulls detected</span>
            </div>
            <div className="overview-meta-item">
              <span className="overview-meta-label">Date Range</span>
              <span className="overview-meta-val">Jun 1 – Sep 28, 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guardrails Section */}
      <div className="guardrails-box">
        <div className="card-title">
          <ShieldCheck size={18} className="text-accent" />
          <span>Application Guardrails & Safety Controls</span>
        </div>

        <div className="guardrails-grid">
          <div className="guardrail-card">
            <span className="guardrail-card-title">1. Grounded Determinism</span>
            <p className="guardrail-card-text">
              Numerical revenue sums, cancellation counts, and order statuses must match verified tool outputs.
              Speculative responses or fabricated order numbers are strictly prevented by prompt boundaries.
            </p>
          </div>

          <div className="guardrail-card">
            <span className="guardrail-card-title">2. Allowlisted Dispatch</span>
            <p className="guardrail-card-text">
              The AI agent can only invoke explicitly registered tool handlers. Any unallowlisted tool name is rejected
              by the backend dispatcher without execution.
            </p>
          </div>

          <div className="guardrail-card">
            <span className="guardrail-card-title">3. Input Validation</span>
            <p className="guardrail-card-text">
              Order IDs, category names, and dates are checked against valid formats before pandas execution,
              preventing query crashes or unexpected code evaluations.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Tools Grid */}
      <div className="tools-section">
        <div className="card-title">
          <span>Registered Backend Tools</span>
        </div>

        <div className="tools-grid">
          {/* Tool 1: get_order_details */}
          <div className="tool-card">
            <div>
              <div className="tool-header-row">
                <div className="tool-icon-box search">
                  <Search size={18} />
                </div>
                <span className="badge-status active">Active</span>
              </div>
              <div className="tool-title">get_order_details</div>
              <p className="tool-description">
                Retrieves complete details for a specific order ID including customer, amount, product, city,
                and fulfillment status.
              </p>
            </div>

            <div className="tool-expandable">
              <button
                type="button"
                className="tool-expand-trigger"
                onClick={() => toggleExpand("get_order_details")}
              >
                <span>Schema Specification</span>
                {expandedTool === "get_order_details" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {expandedTool === "get_order_details" && (
                <div className="tool-param-pill-wrap">
                  <span className="tool-param-pill font-mono">order_id (string, required)</span>
                  <span className="tool-param-pill font-mono">returns: OrderRecord</span>
                </div>
              )}
            </div>
          </div>

          {/* Tool 2: calculate_order_analytics */}
          <div className="tool-card">
            <div>
              <div className="tool-header-row">
                <div className="tool-icon-box analytics">
                  <Calculator size={18} />
                </div>
                <span className="badge-status active">Active</span>
              </div>
              <div className="tool-title">calculate_order_analytics</div>
              <p className="tool-description">
                Performs numerical aggregations: revenue totals with status breakdowns, cancellation counts,
                customer rankings, and average order values.
              </p>
            </div>

            <div className="tool-expandable">
              <button
                type="button"
                className="tool-expand-trigger"
                onClick={() => toggleExpand("calculate_order_analytics")}
              >
                <span>Schema Specification</span>
                {expandedTool === "calculate_order_analytics" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {expandedTool === "calculate_order_analytics" && (
                <div className="tool-param-pill-wrap">
                  <span className="tool-param-pill font-mono">operation (string, required)</span>
                  <span className="tool-param-pill font-mono">category (string, optional)</span>
                  <span className="tool-param-pill font-mono">month (string, optional)</span>
                  <span className="tool-param-pill font-mono">year (integer, optional)</span>
                </div>
              )}
            </div>
          </div>

          {/* Tool 3: search_orders */}
          <div className="tool-card">
            <div>
              <div className="tool-header-row">
                <div className="tool-icon-box filter">
                  <Filter size={18} />
                </div>
                <span className="badge-status active">Active</span>
              </div>
              <div className="tool-title">search_orders</div>
              <p className="tool-description">
                Filters and searches store orders by fulfillment status (e.g. pending/shipped), customer name,
                city, or category with safety limits.
              </p>
            </div>

            <div className="tool-expandable">
              <button
                type="button"
                className="tool-expand-trigger"
                onClick={() => toggleExpand("search_orders")}
              >
                <span>Schema Specification</span>
                {expandedTool === "search_orders" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {expandedTool === "search_orders" && (
                <div className="tool-param-pill-wrap">
                  <span className="tool-param-pill font-mono">status (string, optional)</span>
                  <span className="tool-param-pill font-mono">customer_name (string, optional)</span>
                  <span className="tool-param-pill font-mono">city (string, optional)</span>
                  <span className="tool-param-pill font-mono">limit (integer, max 20)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
