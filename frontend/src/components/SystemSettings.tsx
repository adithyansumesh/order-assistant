import React, { useState } from "react";
import { Mic, Volume2, Eye, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppSettings } from "../types";

interface SystemSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  settings,
  onUpdateSettings,
  onClearChat,
  hasMessages,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if browser supports speech recognition
  const isSpeechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const handleConfirmClear = () => {
    onClearChat();
    setShowConfirmModal(false);
    setSuccessMessage("Conversation memory cleared successfully.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="settings-layout" aria-label="Application Settings">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your assistant preferences and accessibility.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Settings Group Card */}
      <div className="settings-card">
        {/* 1. Speech Recognition Language */}
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-icon-col">
              <Mic size={20} />
            </div>
            <div className="settings-text-col">
              <label htmlFor="voice-lang-select" className="settings-label">
                Voice Input Dialect
              </label>
              <p className="settings-desc">
                Select your preferred speech-to-text language dialect for microphone queries.
              </p>
              <span className="text-xs font-mono text-muted mt-1">
                {isSpeechSupported
                  ? "Web Speech API: Available in this browser"
                  : "Web Speech API: Not supported in this browser (text input available)"}
              </span>
            </div>
          </div>

          <div className="settings-control">
            <select
              id="voice-lang-select"
              className="styled-select font-mono"
              value={settings.voiceLanguage}
              onChange={(e) => onUpdateSettings({ voiceLanguage: e.target.value })}
              aria-label="Select speech recognition dialect"
            >
              <option value="en-IN">English (India — en-IN)</option>
              <option value="en-US">English (United States — en-US)</option>
              <option value="en-GB">English (United Kingdom — en-GB)</option>
            </select>
          </div>
        </div>

        {/* 2. Audio Feedback Preference */}
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-icon-col">
              <Volume2 size={20} />
            </div>
            <div className="settings-text-col">
              <span className="settings-label">Audio Feedback</span>
              <p className="settings-desc">
                Play subtle confirmation audio cues upon message submission, voice recording, and copying results.
              </p>
            </div>
          </div>

          <div className="settings-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.audioFeedback}
                onChange={(e) => onUpdateSettings({ audioFeedback: e.target.checked })}
                aria-label="Toggle audio feedback"
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* 3. Reduced Motion Preference */}
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-icon-col">
              <Eye size={20} />
            </div>
            <div className="settings-text-col">
              <span className="settings-label">Reduced Motion Mode</span>
              <p className="settings-desc">
                Minimizes ambient pulsing, glowing rings, and micro-animations for improved visual comfort.
              </p>
            </div>
          </div>

          <div className="settings-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                aria-label="Toggle reduced motion mode"
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* 4. Destructive Action: Clear Conversation Card */}
      <div className="settings-card destructive-card">
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-icon-col text-error">
              <Trash2 size={20} />
            </div>
            <div className="settings-text-col">
              <span className="settings-label text-error">Clear Conversation</span>
              <p className="settings-desc">
                Permanently clears active conversation messages and query state. Store dataset (<code>orders.csv</code>)
                and preferences are safely preserved.
              </p>
            </div>
          </div>

          <div className="settings-control">
            <button
              type="button"
              className="btn-danger"
              disabled={!hasMessages}
              onClick={() => setShowConfirmModal(true)}
              aria-label="Clear conversation history"
            >
              <Trash2 size={14} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Dialog */}
      {showConfirmModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowConfirmModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-error">
              <AlertTriangle size={24} />
              <h2 className="modal-title">Clear Active Conversation?</h2>
            </div>

            <p className="modal-desc">
              Are you sure you want to clear your current conversation? All chat messages will be deleted from your active view.
              This does not modify the store dataset (<code>orders.csv</code>) or system settings.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmClear}
              >
                Yes, Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
