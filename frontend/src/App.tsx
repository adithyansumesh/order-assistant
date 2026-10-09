import React, { useEffect, useRef, useState } from "react";
import { Send, Trash2, Bot, MessageSquare } from "lucide-react";
import { Header } from "./components/Header";
import { StatsBanner } from "./components/StatsBanner";
import { MessageBubble } from "./components/MessageBubble";
import { ExampleChips } from "./components/ExampleChips";
import { ChatMessage, HealthStatus, StatsData } from "./types";

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load initial health and stats
  useEffect(() => {
    const fetchHealthAndStats = async () => {
      try {
        const healthRes = await fetch("/api/health");
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch (err) {
        console.error("Failed to fetch /api/health", err);
      }

      try {
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to fetch /api/stats", err);
      }
    };

    fetchHealthAndStats();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setLastUserMessage(query);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: query }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || (data.error ? "Could not process request." : "No reply."),
        tool_calls: data.tool_calls || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: data.error,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I ran into a problem communicating with the server.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: err.message || "Network or connection failure. Please try again.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      // Refocus input
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage);
    }
  };

  return (
    <div className="app-container">
      <Header health={health} />
      <StatsBanner stats={stats} />

      <main className="chat-wrapper" aria-label="Order Assistant Chat Interface">
        <div className="chat-action-bar">
          <div className="action-bar-title">
            <MessageSquare size={16} />
            <span>Assistant Chat</span>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClearChat}
              title="Clear current conversation"
              aria-label="Clear chat"
            >
              <Trash2 size={14} />
              <span>Clear Chat</span>
            </button>
          )}
        </div>

        <div className="messages-container" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome-card">
              <h2 className="welcome-title">Welcome to Order Assistant</h2>
              <p className="welcome-desc">
                Ask questions about store orders, calculate revenue, check order status, or analyze
                customer spending. All answers are grounded in real store data via deterministic
                tools.
              </p>

              <div className="example-chips-heading">Suggested questions to try</div>
              <ExampleChips onSelect={(q) => handleSendMessage(q)} disabled={loading} />
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onRetry={handleRetry} />
              ))}

              {loading && (
                <div className="message-row assistant">
                  <div className="message-avatar assistant-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-bubble-wrapper">
                    <div className="message-bubble">
                      <div className="typing-dots">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="composer-container">
          <form
            className="composer-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Ask a question about orders (e.g. 'Status of ORD-1025', 'Total revenue in September')..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="send-button"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="composer-hint">
            <span>Press Enter to send, Shift + Enter for new line</span>
            <span>Ground truth: orders.csv ({stats?.total_orders || 60} orders)</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
