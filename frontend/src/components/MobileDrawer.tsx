import React from "react";
import {
  X,
  MessageSquare,
  BarChart3,
  Package,
  Database,
  Terminal,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { WorkspaceTab } from "../types";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal-dialog"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "280px",
          borderRadius: "0",
          height: "100%",
          maxHeight: "100%",
          borderRight: "1px solid var(--border-medium)",
          justifyContent: "space-between",
          padding: "20px 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="brand-icon-box" style={{ width: "30px", height: "30px" }}>
                <ShoppingBag size={16} />
              </div>
              <span className="brand-title">Order Assistant</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              type="button"
              className={`nav-item-btn ${activeTab === "ai-assistant" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("ai-assistant");
                onClose();
              }}
            >
              <MessageSquare size={18} />
              <span>Assistant Chat</span>
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "order-insights" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("order-insights");
                onClose();
              }}
            >
              <BarChart3 size={18} />
              <span>Order Insights</span>
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "order-explorer" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("order-explorer");
                onClose();
              }}
            >
              <Package size={18} />
              <span>Order Explorer</span>
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "data-management" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("data-management");
                onClose();
              }}
            >
              <Database size={18} />
              <span>Data Management</span>
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "tool-inspector" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("tool-inspector");
                onClose();
              }}
            >
              <Terminal size={18} />
              <span>Tool & Model Inspector</span>
            </button>

            <button
              type="button"
              className={`nav-item-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("settings");
                onClose();
              }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
