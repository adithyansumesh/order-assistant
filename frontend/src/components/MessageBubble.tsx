import React from "react";
import { User, Bot, AlertCircle, RefreshCw } from "lucide-react";
import { ChatMessage } from "../types";
import { ToolCallsBadge } from "./ToolCallsBadge";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (text: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : "assistant-avatar"}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="message-bubble-wrapper">
        <div className="message-bubble">
          {message.content}

          {message.tool_calls && message.tool_calls.length > 0 && (
            <ToolCallsBadge toolCalls={message.tool_calls} />
          )}

          {message.error && (
            <div className="error-banner" style={{ marginTop: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={15} />
                <span>{message.error}</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  className="retry-button"
                  onClick={() => onRetry(message.content)}
                  title="Retry this request"
                >
                  <RefreshCw size={12} style={{ marginRight: "4px" }} />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        <span className="message-time">{message.timestamp}</span>
      </div>
    </div>
  );
};
