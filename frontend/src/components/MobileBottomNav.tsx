import React from "react";
import { MessageSquare, BarChart3, Package, Database, Settings } from "lucide-react";
import { WorkspaceTab } from "../types";

interface MobileBottomNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "ai-assistant" ? "active" : ""}`}
        onClick={() => onSelectTab("ai-assistant")}
      >
        <MessageSquare size={18} />
        <span className="mobile-nav-label">Chat</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "order-insights" ? "active" : ""}`}
        onClick={() => onSelectTab("order-insights")}
      >
        <BarChart3 size={18} />
        <span className="mobile-nav-label">Insights</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "order-explorer" ? "active" : ""}`}
        onClick={() => onSelectTab("order-explorer")}
      >
        <Package size={18} />
        <span className="mobile-nav-label">Orders</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "data-management" ? "active" : ""}`}
        onClick={() => onSelectTab("data-management")}
      >
        <Database size={18} />
        <span className="mobile-nav-label">Data</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => onSelectTab("settings")}
      >
        <Settings size={18} />
        <span className="mobile-nav-label">Settings</span>
      </button>
    </nav>
  );
};
