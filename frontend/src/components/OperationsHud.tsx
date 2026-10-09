import React, { useState } from "react";
import {
  Search,
  PackageCheck,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { StatsData } from "../types";

interface OperationsHudProps {
  stats: StatsData | null;
  onQuickQuery: (query: string) => void;
}

export const OperationsHud: React.FC<OperationsHudProps> = ({
  stats,
  onQuickQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const term = searchTerm.trim();
    if (term.toUpperCase().startsWith("ORD-")) {
      onQuickQuery(`What is the status of order ${term.toUpperCase()}?`);
    } else {
      onQuickQuery(`Show order details for ${term}`);
    }
    setSearchTerm("");
  };

  const totalOrders = stats?.total_orders ?? 0;
  const deliveredCount = stats?.orders_by_status?.["delivered"] ?? 0;
  const cancelledCount = stats?.cancelled_orders_count ?? 0;
  const returnedCount = stats?.returned_orders_count ?? 0;
  const shippedCount = stats?.orders_by_status?.["shipped"] ?? 0;
  const processingCount = stats?.orders_by_status?.["processing"] ?? 0;
  const deliveredPct = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  return (
    <aside className="operations-hud-card" aria-label="Operations Overview">
      {/* Title */}
      <div className="hud-title-row">
        <div className="hud-heading-group">
          <span>Operations Overview</span>
        </div>
      </div>

      {/* Mini Search */}
      <form onSubmit={handleSearchSubmit} className="hud-search-box">
        <Search size={16} className="text-muted" />
        <input
          type="text"
          className="hud-search-input"
          placeholder="Lookup order (e.g. ORD-1025)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Quick order lookup"
        />
        {searchTerm && (
          <button
            type="submit"
            className="text-primary hover:text-cyan text-xs font-mono"
          >
            Go
          </button>
        )}
      </form>

      {/* Verified Dataset Metrics */}
      <div className="hud-stats-stack">
        <div
          className="hud-stat-tile"
          onClick={() => onQuickQuery("Give me an overview of all store orders")}
          title="Click to query all orders"
        >
          <div className="hud-tile-left">
            <span className="hud-tile-label">Total Orders</span>
            <span className="hud-tile-val">{totalOrders} records</span>
          </div>
          <div
            className="hud-tile-icon"
            style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--color-primary)" }}
          >
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="hud-stat-tile"
          onClick={() => onQuickQuery("What is the total realized revenue from delivered orders?")}
          title="Click to query delivered orders"
        >
          <div className="hud-tile-left">
            <span className="hud-tile-label">Delivered Rate</span>
            <span className="hud-tile-val text-cyan">{deliveredPct}% ({deliveredCount})</span>
          </div>
          <div
            className="hud-tile-icon"
            style={{ background: "rgba(6, 182, 212, 0.12)", color: "var(--color-cyan)" }}
          >
            <PackageCheck size={16} />
          </div>
        </div>

        <div
          className="hud-stat-tile"
          onClick={() => onQuickQuery("How many orders were cancelled?")}
          title="Click to query cancellations"
        >
          <div className="hud-tile-left">
            <span className="hud-tile-label">Cancellations</span>
            <span className="hud-tile-val text-error">{cancelledCount} orders</span>
          </div>
          <div
            className="hud-tile-icon"
            style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--color-error)" }}
          >
            <AlertCircle size={16} />
          </div>
        </div>
      </div>

      {/* Status Breakdown Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted">
          <span className="uppercase tracking-wider">Status Breakdown</span>
          <span>{totalOrders} total</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div
            className="hud-breakdown-row"
            onClick={() => onQuickQuery("Show all delivered orders")}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan" />
              <span>Delivered</span>
            </div>
            <span className="font-mono text-secondary font-medium">{deliveredCount}</span>
          </div>

          <div
            className="hud-breakdown-row"
            onClick={() => onQuickQuery("How many orders were cancelled?")}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error" />
              <span>Cancelled</span>
            </div>
            <span className="font-mono text-secondary font-medium">{cancelledCount}</span>
          </div>

          <div
            className="hud-breakdown-row"
            onClick={() => onQuickQuery("Show all returned orders")}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "#A855F7" }} />
              <span>Returned</span>
            </div>
            <span className="font-mono text-secondary font-medium">{returnedCount}</span>
          </div>

          <div
            className="hud-breakdown-row"
            onClick={() => onQuickQuery("Which orders are currently in transit or processing?")}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>In Transit / Processing</span>
            </div>
            <span className="font-mono text-secondary font-medium">
              {shippedCount + processingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Inquiries */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted">
          <span className="uppercase tracking-wider">Recommended Queries</span>
          <Sparkles size={12} className="text-primary" />
        </div>

        <div className="flex flex-col gap-1.5">
          {[
            { label: "Check status of ORD-1025", query: "What is the status of order ORD-1025?" },
            { label: "Electronics revenue in August", query: "What was the total revenue from Electronics in August?" },
            { label: "Top customer spending ranking", query: "Which customer has spent the most?" },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="hud-quick-btn"
              onClick={() => onQuickQuery(item.query)}
            >
              <span>{item.label}</span>
              <ArrowRight size={12} className="text-muted" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
