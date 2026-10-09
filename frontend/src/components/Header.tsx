import React from "react";
import { ShoppingBag } from "lucide-react";
import { HealthStatus } from "../types";

interface HeaderProps {
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  const isHealthy = health?.status === "healthy" && health?.dataset_loaded;

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <ShoppingBag size={22} />
        </div>
        <div>
          <h1 className="brand-title">Order Assistant</h1>
          <p className="brand-subtitle">AI-powered assistant for store orders & analytics</p>
        </div>
      </div>

      <div className="header-status-badge">
        <span className={`status-dot ${isHealthy ? "" : "degraded"}`} />
        <span>
          {isHealthy
            ? `Dataset Active (${health?.total_orders} Orders)`
            : "Dataset Initializing..."}
        </span>
      </div>
    </header>
  );
};
