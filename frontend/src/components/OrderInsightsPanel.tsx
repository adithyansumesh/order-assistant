import React, { useState } from "react";
import {
  Download,
  Sparkles,
  Calendar,
  Layers,
  BarChart2,
  PieChart,
  Award,
  Bot,
  X,
  ArrowUpRight,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { StatsData } from "../types";

interface OrderInsightsPanelProps {
  stats: StatsData | null;
  onAskQuestion: (query: string) => void;
}

export const OrderInsightsPanel: React.FC<OrderInsightsPanelProps> = ({
  stats,
  onAskQuestion,
}) => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("All");
  const [showAiBanner, setShowAiBanner] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    month: string;
    booked: string;
    realised: string;
  } | null>({
    month: "August",
    booked: "₹1,48,245",
    realised: "₹1,24,190",
  });

  const totalOrders = stats?.total_orders ?? 0;
  const grossValue = stats?.total_recorded_value_inr ?? 0;
  const realisedValue = stats?.realized_revenue_inr ?? 0;
  const cancelledCount = stats?.cancelled_orders_count ?? 0;
  const cancelledOrders = cancelledCount;
  const exceptionRate = totalOrders > 0 ? ((cancelledCount / totalOrders) * 100).toFixed(1) : "0.0";
  const yieldPct = grossValue > 0 ? ((realisedValue / grossValue) * 100).toFixed(1) : "0.0";

  const deliveredCount = stats?.orders_by_status?.["delivered"] ?? 0;
  const deliveredPct = totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : "0.0";
  const returnedCount = stats?.returned_orders_count ?? 0;
  const returnedPct = totalOrders > 0 ? ((returnedCount / totalOrders) * 100).toFixed(1) : "0.0";
  const pendingCount = stats?.pending_orders_count ?? 0;
  const pendingPct = totalOrders > 0 ? ((pendingCount / totalOrders) * 100).toFixed(1) : "0.0";

  const topCustomers = stats?.top_customers || [];
  const topCustomer = topCustomers[0];

  const highestCategoryEntry = stats?.orders_by_category
    ? Object.entries(stats.orders_by_category).sort((a, b) => b[1] - a[1])[0]
    : null;

  // Client-side CSV export
  const handleExportCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Metric,Value\n" +
      `Total Orders,${totalOrders}\n` +
      `Gross Booked Value (INR),${grossValue}\n` +
      `Realised Delivered Revenue (INR),${realisedValue}\n` +
      `Cancelled Orders,${cancelledOrders}\n` +
      `Cancellation Rate,${exceptionRate}%\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "order_insights_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="insights-tab-container" aria-label="Order Insights and Analytics">
      {/* Top Header & Actions */}
      <div className="insights-top-header">
        <div className="insights-heading-col">
          <h1 className="page-title">Order Insights & Analytics</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted font-mono">
              {stats?.date_range?.start && stats?.date_range?.end
                ? `${stats.date_range.start} – ${stats.date_range.end}`
                : "Active Store Dataset"}
            </span>
          </div>
        </div>

        <div className="insights-controls-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCsv}
            title="Download metrics summary as CSV"
          >
            <Download size={14} />
            <span>Export Summary</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              onAskQuestion(
                "Generate an executive financial and operational summary of store orders with category and status breakdowns."
              )
            }
            title="Ask AI to generate comprehensive executive summary"
          >
            <Sparkles size={14} />
            <span>Generate Executive Summary</span>
          </button>
        </div>
      </div>

      {/* Filter Tray */}
      <div className="filter-matrix-tray">
        <div className="filter-controls-group">
          <div className="filter-select-pill">
            <Calendar size={14} className="text-cyan" />
            <span className="text-xs uppercase font-mono text-muted">Period:</span>
            <select
              defaultValue="all"
              onChange={(e) => onAskQuestion(`What is the total revenue for ${e.target.value}?`)}
            >
              <option value="all">All Dates (June - Sept 2026)</option>
              <option value="September">September 2026</option>
              <option value="August">August 2026</option>
              <option value="July">July 2026</option>
              <option value="June">June 2026</option>
            </select>
          </div>

          <div className="filter-select-pill">
            <Layers size={14} className="text-primary" />
            <span className="text-xs uppercase font-mono text-muted">Category:</span>
            <select
              defaultValue="all"
              onChange={(e) =>
                e.target.value !== "all" &&
                onAskQuestion(`What was the total revenue from ${e.target.value}?`)
              }
            >
              <option value="all">All Categories</option>
              {stats &&
                Object.keys(stats.orders_by_category).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Status Filter Segment */}
        <div className="status-segment-tabs">
          {["All", "Delivered", "Cancelled"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`status-segment-tab ${selectedStatusTab === tab ? "active" : ""}`}
              onClick={() => {
                setSelectedStatusTab(tab);
                if (tab !== "All") {
                  onAskQuestion(`Show all ${tab.toLowerCase()} orders`);
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* AI Summary Banner */}
      {showAiBanner && (
        <div className="overview-card" style={{ borderLeft: "4px solid var(--color-cyan)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                style={{
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(6, 182, 212, 0.12)",
                  color: "var(--color-cyan)",
                }}
              >
                <Bot size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">Executive Summary</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Total gross order volume stands at{" "}
                  <strong className="text-primary">
                    ₹{grossValue.toLocaleString("en-IN")}
                  </strong>{" "}
                  across {totalOrders} recorded orders. Delivered orders account for{" "}
                  <strong className="text-cyan">
                    ₹{realisedValue.toLocaleString("en-IN")} ({yieldPct}% realization)
                  </strong>
                  .{topCustomer && (
                    <>
                      {" "}Top customer <strong className="text-primary">{topCustomer.name}</strong> leads with {topCustomer.spent} across {topCustomer.orders} orders.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="text-muted hover:text-primary p-1"
              onClick={() => setShowAiBanner(false)}
              aria-label="Dismiss summary"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="kpi-cards-grid">
        {/* Card 1: Total Orders */}
        <div
          className="kpi-glass-card"
          onClick={() => onAskQuestion("Give me an overview of all store orders")}
          title="Click to query all orders"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Orders</span>
            <span className="kpi-delta-pill cyan">
              <PackageCheck size={12} />
              <span>Verified</span>
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-metric">{totalOrders}</span>
            <span className="kpi-subtext">active orders</span>
          </div>
        </div>

        {/* Card 2: Gross Booked Value */}
        <div
          className="kpi-glass-card"
          onClick={() => onAskQuestion("What is the total recorded value of all orders?")}
          title="Click to query gross recorded value"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-label">Gross Order Value</span>
            <span className="kpi-delta-pill" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)" }}>
              Total Volume
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-metric text-primary">₹{grossValue.toLocaleString("en-IN")}</span>
            <span className="kpi-subtext">All {totalOrders} orders</span>
          </div>
        </div>

        {/* Card 3: Realised Net Revenue */}
        <div
          className="kpi-glass-card"
          onClick={() => onAskQuestion("What is the total realized revenue from delivered orders?")}
          title="Click to query delivered revenue"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-label">Delivered Revenue</span>
            <span className="kpi-delta-pill cyan">
              {yieldPct}% rate
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-metric text-cyan">₹{realisedValue.toLocaleString("en-IN")}</span>
            <span className="kpi-subtext">{deliveredCount} delivered</span>
          </div>
        </div>

        {/* Card 4: Cancellations */}
        <div
          className="kpi-glass-card"
          onClick={() => onAskQuestion("How many orders were cancelled?")}
          title="Click to query cancelled orders"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-label">Cancellations</span>
            <span className="kpi-delta-pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--color-error)" }}>
              <AlertCircle size={12} />
              <span>{cancelledOrders} orders</span>
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-metric text-error">{exceptionRate}%</span>
            <span className="kpi-subtext">Cancellation rate</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="bento-charts-grid">
        {/* Left Column: Monthly Trend */}
        <div className="bento-chart-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <BarChart2 size={16} className="text-primary" />
              <span>Monthly Volume & Realised Revenue</span>
            </div>

            <div className="chart-legend-row">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: "var(--color-primary)" }} />
                <span>Booked</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: "var(--color-cyan)" }} />
                <span>Delivered</span>
              </div>
            </div>
          </div>

          <div className="interactive-area-chart-wrap">
            {hoveredPoint && (
              <div className="chart-tooltip-pin">
                <span className="text-xs uppercase font-mono text-muted block">
                  {hoveredPoint.month} Summary
                </span>
                <div className="flex items-center gap-3 font-mono text-xs mt-0.5">
                  <span className="text-primary font-semibold">Booked: {hoveredPoint.booked}</span>
                  <span className="text-cyan font-semibold">Delivered: {hoveredPoint.realised}</span>
                </div>
              </div>
            )}

            <svg className="area-svg" viewBox="0 0 700 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradBooked" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="areaGradRealised" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="700" y2="90" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="700" y2="140" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="180" x2="700" y2="180" stroke="var(--border-medium)" />

              {/* Area Fills */}
              <path
                d="M20,150 Q115,140 195,125 T370,95 T545,55 T680,20 L680,180 L20,180 Z"
                fill="url(#areaGradBooked)"
              />
              <path
                d="M20,160 Q115,150 195,138 T370,112 T545,74 T680,40 L680,180 L20,180 Z"
                fill="url(#areaGradRealised)"
              />

              {/* Lines */}
              <path
                d="M20,150 Q115,140 195,125 T370,95 T545,55 T680,20"
                fill="none"
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M20,160 Q115,150 195,138 T370,112 T545,74 T680,40"
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Points */}
              <circle
                cx="195"
                cy="125"
                r="4.5"
                fill="#6366F1"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ month: "June", booked: "₹88,400", realised: "₹72,300" })
                }
              />
              <circle
                cx="370"
                cy="95"
                r="4.5"
                fill="#6366F1"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ month: "July", booked: "₹1,12,050", realised: "₹91,420" })
                }
              />
              <circle
                cx="545"
                cy="55"
                r="5"
                fill="#6366F1"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ month: "August", booked: "₹1,48,245", realised: "₹1,24,190" })
                }
              />
              <circle
                cx="680"
                cy="20"
                r="5"
                fill="#06B6D4"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ month: "September", booked: "₹1,21,617", realised: "₹83,130" })
                }
              />
            </svg>

            <div className="chart-xaxis-labels">
              <span>June 2026</span>
              <span>July 2026</span>
              <span className="text-primary font-semibold">August 2026</span>
              <span className="text-cyan font-semibold">September 2026</span>
            </div>
          </div>
        </div>

        {/* Right Column: Category Distribution */}
        <div className="bento-chart-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <PieChart size={16} className="text-cyan" />
              <span>Orders by Category</span>
            </div>
            <span className="text-xs font-mono text-muted">{totalOrders} orders</span>
          </div>

          <div className="category-bars-stack">
            {stats &&
              Object.entries(stats.orders_by_category).map(([cat, count]) => {
                const pct = Math.round((count / totalOrders) * 100);
                return (
                  <div
                    key={cat}
                    className="category-bar-item"
                    onClick={() => onAskQuestion(`What was the total revenue from ${cat}?`)}
                    title={`Click to query ${cat} analytics`}
                  >
                    <div className="cat-header-split">
                      <span className="category-label">{cat}</span>
                      <span className="cat-val-mono">
                        {count} orders <strong className="text-cyan">({pct}%)</strong>
                      </span>
                    </div>
                    <div className="category-track">
                      <div
                        className="category-fill"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, var(--color-primary), var(--color-cyan))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="text-secondary">Highest Volume Category:</span>
            <span className="text-cyan font-semibold">
              {highestCategoryEntry ? `${highestCategoryEntry[0]} (${highestCategoryEntry[1]} orders)` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Lower Bento Grid: Status Breakdown + Top Customers */}
      <div className="bento-lower-grid">
        {/* Status Breakdown Card */}
        <div className="bento-chart-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <PackageCheck size={16} className="text-cyan" />
              <span>Fulfillment Breakdown</span>
            </div>
            <span className="text-xs font-mono text-muted">Actual Statuses</span>
          </div>

          <div className="status-mini-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
            <div
              className="status-mini-tile"
              onClick={() => onAskQuestion("Show all delivered orders")}
              style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}
            >
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-2 h-2 rounded-full bg-cyan" />
                <span>Delivered</span>
              </div>
              <span className="font-mono text-sm text-primary font-semibold mt-1 block">
                {deliveredCount} ({deliveredPct}%)
              </span>
            </div>

            <div
              className="status-mini-tile"
              onClick={() => onAskQuestion("How many orders were cancelled?")}
              style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}
            >
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-2 h-2 rounded-full bg-error" />
                <span>Cancelled</span>
              </div>
              <span className="font-mono text-sm text-error font-semibold mt-1 block">
                {cancelledCount} ({exceptionRate}%)
              </span>
            </div>

            <div
              className="status-mini-tile"
              onClick={() => onAskQuestion("Show all returned orders")}
              style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}
            >
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: "#A855F7" }} />
                <span>Returned</span>
              </div>
              <span className="font-mono text-sm text-primary font-semibold mt-1 block">
                {returnedCount} ({returnedPct}%)
              </span>
            </div>

            <div
              className="status-mini-tile"
              onClick={() => onAskQuestion("Which orders are currently in transit or processing?")}
              style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}
            >
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>In Transit / Processing</span>
              </div>
              <span className="font-mono text-sm text-primary font-semibold mt-1 block">
                {pendingCount} ({pendingPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Top Customers Card */}
        <div className="bento-chart-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <Award size={16} className="text-primary" />
              <span>Top Customers by Spend</span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onAskQuestion("Which customer has spent the most?")}
            >
              <Bot size={12} />
              <span>Rank in Chat</span>
            </button>
          </div>

          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table" aria-label="Customer rankings table">
              <thead>
                <tr>
                  <th>Rank & Customer</th>
                  <th>Total Spent</th>
                  <th>Orders</th>
                  <th>City</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length > 0 ? (
                  topCustomers.map((cust) => (
                    <tr key={cust.rank}>
                      <td>
                        <div className="patron-rank-col">
                          <span className="rank-badge">#{cust.rank}</span>
                          <span>{cust.name}</span>
                        </div>
                      </td>
                      <td className="font-mono font-semibold text-cyan">{cust.spent}</td>
                      <td className="font-mono">{cust.orders} orders</td>
                      <td className="text-muted text-xs">{cust.city}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="action-btn-pill ml-auto"
                          onClick={() =>
                            onAskQuestion(`What products did ${cust.name} order and what was their total spend?`)
                          }
                        >
                          <span>Details</span>
                          <ArrowUpRight size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-muted font-mono">
                      No customer data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
