import React from "react";
import {
  MessageSquare,
  BarChart3,
  Package,
  Database,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { WorkspaceTab } from "../types";

interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside
      className={`desktop-sidebar ${isCollapsed ? "collapsed" : ""}`}
      aria-label="Desktop Navigation Sidebar"
    >
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="flex items-center">
            <div className="brand-icon-box">
              <ShoppingBag size={18} />
            </div>
            {!isCollapsed && (
              <div className="brand-text-col">
                <span className="brand-title">Order Assistant</span>
                <span className="brand-tagline">Store AI Platform</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="sidebar-nav-container">
          {!isCollapsed && <div className="nav-section-title">Navigation</div>}

          <nav className="flex flex-col gap-1">
            <button
              type="button"
              className={`nav-item-btn ${activeTab === "ai-assistant" ? "active" : ""}`}
              onClick={() => onSelectTab("ai-assistant")}
              title="Assistant Chat"
            >
              <MessageSquare size={18} />
              {!isCollapsed && <span>Assistant Chat</span>}
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "order-insights" ? "active" : ""}`}
              onClick={() => onSelectTab("order-insights")}
              title="Order Insights"
            >
              <BarChart3 size={18} />
              {!isCollapsed && <span>Order Insights</span>}
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "order-explorer" ? "active" : ""}`}
              onClick={() => onSelectTab("order-explorer")}
              title="Order Explorer"
            >
              <Package size={18} />
              {!isCollapsed && <span>Order Explorer</span>}
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "data-management" ? "active" : ""}`}
              onClick={() => onSelectTab("data-management")}
              title="Data Management"
            >
              <Database size={18} />
              {!isCollapsed && <span>Data Management</span>}
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "tool-inspector" ? "active" : ""}`}
              onClick={() => onSelectTab("tool-inspector")}
              title="Tool & Model Inspector"
            >
              <Terminal size={18} />
              {!isCollapsed && <span>Tool & Model Inspector</span>}
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => onSelectTab("settings")}
              title="Settings"
            >
              <Settings size={18} />
              {!isCollapsed && <span>Settings</span>}
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
};
