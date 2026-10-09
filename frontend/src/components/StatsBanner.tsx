import React from "react";
import { StatsData } from "../types";

interface StatsBannerProps {
  stats: StatsData | null;
}

const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const StatsBanner: React.FC<StatsBannerProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <section className="stats-strip" aria-label="Dataset Summary Statistics">
      <div className="stat-card">
        <span className="stat-label">Total Orders</span>
        <span className="stat-value">{stats.total_orders}</span>
        <span className="stat-subtext">June – Sept 2026</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Recorded Value</span>
        <span className="stat-value">{formatINR(stats.total_recorded_value_inr)}</span>
        <span className="stat-subtext">Gross all 60 orders</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Realized Revenue</span>
        <span className="stat-value">{formatINR(stats.realized_revenue_inr)}</span>
        <span className="stat-subtext">{stats.orders_by_status["delivered"] || 0} delivered orders</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Cancelled Orders</span>
        <span className="stat-value">{stats.cancelled_orders_count}</span>
        <span className="stat-subtext">{formatINR(stats.cancelled_value_inr)} value</span>
      </div>
    </section>
  );
};
