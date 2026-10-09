import React from "react";
import { ShoppingBag } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer" aria-label="Order Assistant Footer">
      <div className="flex items-center gap-2 text-muted text-xs">
        <ShoppingBag size={13} className="text-primary" />
        <span className="font-medium text-foreground">Order Assistant</span>
        <span>•</span>
        <span>Store AI Platform</span>
      </div>

      <div className="text-muted text-xs">
        Store Intelligence Engine
      </div>
    </footer>
  );
};
