import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, X } from "lucide-react";

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text?: string) => void;
  disabled?: boolean;
  voiceLanguage?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSend,
  disabled,
  voiceLanguage = "en-IN",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Web Speech API safely
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLanguage;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (event.error === "not-allowed") {
          setVoiceNotice("Microphone permission was denied. Please allow microphone access.");
        } else {
          setVoiceNotice(`Speech recognition notice: ${event.error}`);
        }
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setInput, voiceLanguage]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setVoiceNotice("Web Speech API is not supported in this browser. Please type your query.");
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Could not start recognition:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled) {
        onSend();
      }
    }
  };

  const QUICK_PROMPTS = [
    "What is the status of order ORD-1025?",
    "How many orders were cancelled?",
    "What was the total revenue from Electronics in August?",
    "Which customer has spent the most?",
    "Which orders are still pending?",
    "Show all orders from Chennai",
  ];

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="composer-dock" aria-label="Message Input Composer">
      <div className="composer-box">
        {/* Voice Fallback Notice */}
        {voiceNotice && (
          <div className="p-2 rounded bg-status-error-bg text-error text-xs flex items-center justify-between">
            <span>{voiceNotice}</span>
            <button
              type="button"
              className="text-error hover:opacity-80 p-0.5"
              onClick={() => setVoiceNotice(null)}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Active Voice Recording Banner */}
        {isRecording && (
          <div className="flex items-center justify-between p-2 rounded bg-bg-surface-elevated border border-status-error">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-error animate-pulse" />
              <span className="text-xs font-medium text-primary">Listening...</span>
              <span className="font-mono text-xs text-cyan ml-2">{formatTimer(recordingSeconds)}</span>
            </div>
            <button
              type="button"
              className="text-xs text-error hover:underline"
              onClick={toggleVoice}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Input Textarea and Action Buttons */}
        <div className="composer-input-row">
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder="Ask about orders (e.g. 'Status of ORD-1025', 'Electronics revenue in August')..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Ask Order Assistant"
          />

          <button
            type="button"
            className={`composer-btn-mic ${isRecording ? "recording" : ""}`}
            onClick={toggleVoice}
            title={isRecording ? "Stop voice recording" : "Voice input"}
            aria-label="Voice input"
          >
            <Mic size={18} />
          </button>

          <button
            type="button"
            className="composer-btn-send"
            disabled={disabled || !input.trim()}
            onClick={() => onSend()}
            title="Send query"
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        {/* Prompt Suggestions Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1.5 pb-0.5">
          <span className="text-xs font-mono text-muted uppercase shrink-0">Try asking:</span>
          {QUICK_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              className="prompt-chip-btn"
              onClick={() => onSend(promptText)}
              disabled={disabled}
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
