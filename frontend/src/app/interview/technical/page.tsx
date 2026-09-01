"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { mockTechnicalMessages } from "@/lib/api/mock";
import { AdaptivePulse } from "@/components/ui/AdaptivePulse";
import { useInterviewStore } from "@/lib/store/interview";
import { Send, Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api/types";
import TechnicalRoundWorkspace from "@/components/TechnicalRoundWorkspace"

const AI_RESPONSES = [
  "Good point — now, how would you handle the case where that service goes down mid-operation? Walk me through your failure recovery strategy.",
  "Interesting approach. What are the consistency guarantees of the system you're describing? And how does that interact with your caching layer?",
  "That's the right intuition. Can you formalize that in terms of CAP theorem? Where do you land on the consistency-availability tradeoff?",
  "Let's go deeper on that. You mentioned Redis — what eviction policy would you use, and why?",
];

let aiResponseIdx = 0;

export default function TechnicalRoundPage() {
  const router = useRouter();
  const { voiceState, setVoiceState } = useInterviewStore();
  const [messages, setMessages] = useState<ChatMessage[]>(mockTechnicalMessages);
  const [inputText, setInputText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: "candidate",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsAITyping(true);
    setVoiceState("processing");

    await new Promise((r) => setTimeout(r, 2000));

    const aiMsg: ChatMessage = {
      id: `m${Date.now() + 1}`,
      role: "ai",
      content: AI_RESPONSES[aiResponseIdx % AI_RESPONSES.length],
      timestamp: new Date().toISOString(),
    };
    aiResponseIdx++;

    setMessages((prev) => [...prev, aiMsg]);
    setIsAITyping(false);
    setVoiceState("idle");
  };

  const handleSend = () => sendMessage(inputText);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    setIsVoiceMode((v) => !v);
    setVoiceState(isVoiceMode ? "idle" : "listening");
  };

  const pulseMode = voiceState === "listening" ? "listening" : voiceState === "processing" ? "processing" : "steady";

  return (
    <InterviewShell
      round="technical"
      roundLabel="Technical"
      pulseMode={pulseMode}
      totalSeconds={18}
      onExit={() => router.push("/dashboard")}
    >
      <div className="flex flex-col h-full">
        {/* AI Interviewer header */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[#2A2F38] bg-[#12151A] shrink-0">
          <div className="w-9 h-9 rounded-full bg-[rgba(0, 98, 255, 0.12)] border border-[rgba(0, 98, 255, 0.2)] flex items-center justify-center">
            <Volume2 size={16} className="text-[#0062FF]" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#E8EAF0]" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Aria — Technical Interviewer
            </div>
            <div className="font-mono text-[0.65rem] text-[#4A5260] uppercase tracking-wider">
              {voiceState === "idle" && "Waiting for your response"}
              {voiceState === "listening" && "Listening..."}
              {voiceState === "processing" && "Processing..."}
            </div>
          </div>

          {/* Voice toggle */}
          <button
            onClick={toggleVoice}
            className={cn(
              "ml-auto flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all",
              isVoiceMode
                ? "bg-[rgba(255,92,92,0.12)] text-[#FF5C5C] border border-[rgba(255,92,92,0.2)]"
                : "bg-[#1B1F26] text-[#6B7280] border border-[#2A2F38] hover:text-[#C8CDD5]"
            )}
            data-testid="voice-toggle"
          >
            {isVoiceMode ? <><MicOff size={12} /> End voice</> : <><Mic size={12} /> Voice mode</>}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-3xl",
                msg.role === "candidate" ? "ml-auto flex-row-reverse" : ""
              )}
              data-testid={`message-${msg.role}`}
            >
              {/* Avatar */}
              <div className={cn(
                "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-medium mt-1",
                msg.role === "ai"
                  ? "bg-[rgba(0, 98, 255, 0.12)] border border-[rgba(0, 98, 255, 0.2)] text-[#0062FF]"
                  : "bg-[#2A2F38] text-[#9CA3AF]"
              )}>
                {msg.role === "ai" ? "AI" : "AM"}
              </div>

              {/* Bubble */}
              <div className={cn(
                "px-4 py-3 rounded-[8px] max-w-[80%]",
                msg.role === "ai"
                  ? "bg-[#1B1F26] text-[#C8CDD5] border-l-2 border-[#0062FF]"
                  : "bg-[#2A2F38] text-[#E8EAF0]"
              )}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className="text-[0.65rem] font-mono mt-2 opacity-40">
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* AI typing indicator */}
          {isAITyping && (
            <div className="flex gap-3 max-w-3xl">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-medium bg-[rgba(0, 98, 255, 0.12)] border border-[rgba(0, 98, 255, 0.2)] text-[#0062FF]">
                AI
              </div>
              <div className="px-4 py-3 rounded-[8px] bg-[#1B1F26] border-l-2 border-[#0062FF]">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#0062FF] animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice waveform or text input */}
        <div className="border-t border-[#2A2F38] bg-[#12151A] px-4 md:px-6 py-4 shrink-0">
          {isVoiceMode ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-full">
                <AdaptivePulse mode="listening" intensity={0.8} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF5C5C] animate-pulse" />
                <span className="font-mono text-xs text-[#FF5C5C] uppercase tracking-wider">Recording</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response... (Shift+Enter for new line)"
                className="input-dark flex-1 !h-[60px] resize-none"
                data-testid="technical-text-input"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isAITyping}
                className="btn-primary px-4 self-end disabled:opacity-40"
                data-testid="send-message-btn"
              >
                <Send size={15} />
              </button>
            </div>
          )}
          <p className="text-[0.65rem] font-mono text-[#2A2F38] mt-2">
            Enter to send · Shift+Enter for new line · {messages.filter((m) => m.role === "candidate").length} responses so far
          </p>
        </div>
      </div>

      {/* <TechnicalRoundWorkspace sessionId= "" roundId="1234" simliSessionToken /> */}
      <ProctoringOverlay />
    </InterviewShell>
  );
}
