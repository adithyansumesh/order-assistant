import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, AlertCircle, RotateCcw, Copy, Check } from "lucide-react";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (text: string) => void;
  onViewInsights?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetryClick = () => {
    if (!onRetry) return;
    setIsRetrying(true);
    onRetry(message.content);
    setTimeout(() => setIsRetrying(false), 1200);
  };

  if (isUser) {
    return (
      <div className="message-row user">
        <div className="flex flex-col items-end max-w-xl">
          <div className="user-bubble-box">{message.content}</div>
          <div className="user-bubble-time">{message.timestamp}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row assistant">
      <div className="flex items-start gap-3 w-full max-w-3xl">
        <div
          className="brand-icon-box"
          style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", flexShrink: 0, marginTop: "2px" }}
        >
          <Bot size={18} />
        </div>

        <div className="assistant-card-box">
          {/* Formatted Markdown Content */}
          <div className="assistant-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Error Banner if error present */}
          {message.error && (
            <div className="p-3 rounded bg-status-error-bg border border-status-error text-error flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{message.error}</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-status-error text-white font-medium flex items-center gap-1"
                  onClick={handleRetryClick}
                >
                  <RotateCcw size={12} className={isRetrying ? "animate-spin" : ""} />
                  Retry
                </button>
              )}
            </div>
          )}



          {/* Contextual Actions Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
            <span className="font-mono text-xs text-muted">{message.timestamp}</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                title="Copy answer"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span className="text-xs font-mono ml-1">{copied ? "Copied" : "Copy"}</span>
              </button>

              {onRetry && (
                <button
                  type="button"
                  className="btn-icon"
                  onClick={handleRetryClick}
                  title="Retry question"
                >
                  <RotateCcw size={14} className={isRetrying ? "animate-spin text-cyan" : ""} />
                  <span className="text-xs font-mono ml-1">Retry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
