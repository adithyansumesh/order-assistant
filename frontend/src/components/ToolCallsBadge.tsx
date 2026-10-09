import React, { useState } from "react";
import { Wrench, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { ToolCallSummary } from "../types";

interface ToolCallsBadgeProps {
  toolCalls: ToolCallSummary[];
}

export const ToolCallsBadge: React.FC<ToolCallsBadgeProps> = ({ toolCalls }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="tool-disclosure">
      <div
        className="tool-disclosure-summary"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Wrench size={13} />
          <span>Tools used ({toolCalls.length})</span>
        </span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      {isOpen && (
        <div className="tool-disclosure-list">
          {toolCalls.map((tc, idx) => (
            <div key={idx} className="tool-item">
              <CheckCircle2 size={13} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <span className="tool-pill">{tc.tool_name}</span>
                <span style={{ marginLeft: "6px" }}>{tc.summary}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
