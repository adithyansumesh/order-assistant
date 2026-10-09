import React, { useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { MobileDrawer } from "./components/MobileDrawer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { Footer } from "./components/Footer";
import { MessageBubble } from "./components/MessageBubble";
import { ChatComposer } from "./components/ChatComposer";
import { OperationsHud } from "./components/OperationsHud";
import { OrderInsightsPanel } from "./components/OrderInsightsPanel";
import { OrderExplorer } from "./components/OrderExplorer";
import { DataManagement } from "./components/DataManagement";
import { ToolModelInspector } from "./components/ToolModelInspector";
import { SystemSettings } from "./components/SystemSettings";
import {
  ChatMessage,
  HealthStatus,
  StatsData,
  WorkspaceTab,
  AppSettings,
} from "./types";
import { apiUrl } from "./config";
import {
  Package,
  AlertCircle,
  TrendingUp,
  Award,
  ArrowUpRight,
  Bot,
  ShoppingBag,
} from "lucide-react";

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  // Navigation state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("ai-assistant");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // App Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("order_assistant_settings");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      voiceLanguage: "en-IN",
      audioFeedback: false,
      reducedMotion: false,
    };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply reduced motion to HTML root
  useEffect(() => {
    if (settings.reducedMotion) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }
  }, [settings.reducedMotion]);

  // Persist settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("order_assistant_settings", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
      return updated;
    });
  };

  // Play subtle feedback chime if enabled
  const playAudioChime = () => {
    if (!settings.audioFeedback) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load initial health and stats
  const fetchSystemStats = async () => {
    try {
      const healthRes = await fetch(apiUrl("/api/health"));
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (err) {
      console.error("Failed to fetch /api/health", err);
    }

    try {
      const statsRes = await fetch(apiUrl("/api/stats"));
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch /api/stats", err);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    // Switch to Assistant tab if query was sent from insights, explorer, or prompt cards
    if (activeTab !== "ai-assistant") {
      setActiveTab("ai-assistant");
    }

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
      const response = await fetch(apiUrl("/api/chat"), {
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
      playAudioChime();
    } catch (err: any) {
      console.error("Chat error:", err);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I ran into an issue communicating with the server.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: err.message || "Network or connection failure. Please try again.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="platform-container">
      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
          hasMessages={messages.length > 0}
          onClearChat={handleClearChat}
        />

        {/* Content Container */}
        <main className="workspace-content-container">
          {activeTab === "ai-assistant" && (
            <div className="assistant-grid-layout">
              {/* Chat Stream & Composer */}
              <div className="assistant-main-stream">
                {/* Clean Order Assistant Welcome Banner */}
                {messages.length === 0 && (
                  <section className="orbital-hero-banner">
                    <div className="hero-banner-inner">
                      <div className="hero-emblem-cluster">
                        <div className="brand-icon-box" style={{ width: "42px", height: "42px" }}>
                          <ShoppingBag size={22} />
                        </div>

                        <div className="hero-text-col">
                          <h1 className="hero-headline">
                            Order Assistant
                          </h1>
                          <p className="hero-subtext">
                            Ask questions about store orders, deliveries, revenue, and customer analytics.
                            Grounded in your active store dataset.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4 Interactive Quick Prompt Cards */}
                    <div className="quick-prompts-grid">
                      <button
                        type="button"
                        className="quick-prompt-card"
                        onClick={() => handleSendMessage("What is the status of order ORD-1025?")}
                      >
                        <div className="prompt-icon-row">
                          <div className="prompt-icon-badge cyan">
                            <Package size={16} />
                          </div>
                          <ArrowUpRight size={14} className="text-muted" />
                        </div>
                        <span className="prompt-card-text">What is the status of order ORD-1025?</span>
                      </button>

                      <button
                        type="button"
                        className="quick-prompt-card"
                        onClick={() => handleSendMessage("How many orders were cancelled?")}
                      >
                        <div className="prompt-icon-row">
                          <div className="prompt-icon-badge red">
                            <AlertCircle size={16} />
                          </div>
                          <ArrowUpRight size={14} className="text-muted" />
                        </div>
                        <span className="prompt-card-text">How many orders were cancelled?</span>
                      </button>

                      <button
                        type="button"
                        className="quick-prompt-card"
                        onClick={() =>
                          handleSendMessage("What was the total revenue from Electronics in August?")
                        }
                      >
                        <div className="prompt-icon-row">
                          <div className="prompt-icon-badge indigo">
                            <TrendingUp size={16} />
                          </div>
                          <ArrowUpRight size={14} className="text-muted" />
                        </div>
                        <span className="prompt-card-text">
                          What was the Electronics revenue in August?
                        </span>
                      </button>

                      <button
                        type="button"
                        className="quick-prompt-card"
                        onClick={() => handleSendMessage("Which customer has spent the most?")}
                      >
                        <div className="prompt-icon-row">
                          <div className="prompt-icon-badge purple">
                            <Award size={16} />
                          </div>
                          <ArrowUpRight size={14} className="text-muted" />
                        </div>
                        <span className="prompt-card-text">Which customer has spent the most?</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Conversation Stream */}
                {messages.length > 0 && (
                  <section className="chat-stream-section" aria-label="Conversation stream">
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        onRetry={handleRetry}
                        onViewInsights={() => setActiveTab("order-insights")}
                      />
                    ))}

                    {/* Loading Indicator */}
                    {loading && (
                      <div className="chat-row assistant">
                        <div className="assistant-msg-container">
                          <div className="assistant-avatar-badge">
                            <Bot size={16} />
                            <span className="assistant-avatar-dot" />
                          </div>
                          <div className="typing-dots-pill">
                            <span className="typing-dot-quantum" />
                            <span className="typing-dot-quantum" />
                            <span className="typing-dot-quantum" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </section>
                )}

                {/* Chat Composer */}
                <ChatComposer
                  input={input}
                  setInput={setInput}
                  onSend={handleSendMessage}
                  disabled={loading}
                  voiceLanguage={settings.voiceLanguage}
                />
              </div>

              {/* Operations Overview HUD */}
              <OperationsHud stats={stats} onQuickQuery={handleSendMessage} />
            </div>
          )}

          {activeTab === "order-insights" && (
            <OrderInsightsPanel stats={stats} onAskQuestion={handleSendMessage} />
          )}

          {activeTab === "order-explorer" && (
            <OrderExplorer
              onAskOrder={(orderId) =>
                handleSendMessage(`What is the status and full details of order ${orderId}?`)
              }
            />
          )}

          {activeTab === "data-management" && (
            <DataManagement
              stats={stats}
              onDatasetUpdated={fetchSystemStats}
              onAskQuestion={handleSendMessage}
            />
          )}

          {activeTab === "tool-inspector" && (
            <ToolModelInspector health={health} stats={stats} />
          )}

          {activeTab === "settings" && (
            <SystemSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClearChat={handleClearChat}
              hasMessages={messages.length > 0}
            />
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Navigation */}
      <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
};
