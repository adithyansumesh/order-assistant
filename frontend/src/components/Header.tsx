import React from "react";
import { Menu, ShoppingBag, Trash2 } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  hasMessages: boolean;
  onClearChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  hasMessages,
  onClearChat,
}) => {

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="menu-trigger-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="header-brand-wrap">
          <div className="brand-icon-box" style={{ width: "28px", height: "28px" }}>
            <ShoppingBag size={16} />
          </div>
          <span className="brand-title" style={{ fontSize: "16px" }}>
            Order Assistant
          </span>
        </div>
      </div>

      <div className="header-right">
        {hasMessages && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onClearChat}
            title="Clear active conversation"
            aria-label="Clear active conversation"
          >
            <Trash2 size={14} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>
    </header>
  );
};
