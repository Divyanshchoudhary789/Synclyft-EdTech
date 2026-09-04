"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdaptivePulse } from "@synclyft/ui/components/AdaptivePulse";
import { formatTime } from "@synclyft/lib/utils";
import { useInterviewStore } from "@synclyft/lib/store/interview";
import { AlertTriangle, WifiOff, X, Sun, Moon } from "lucide-react";
import type { RoundType } from "@synclyft/lib/types";
import { Logo } from "@synclyft/ui/components/Logo";
import { InterviewThemeContext, useInterviewThemeState } from "./useInterviewTheme";

interface InterviewShellProps {
  children: React.ReactNode;
  round: RoundType;
  roundLabel: string;
  questionCounter?: string;
  pulseMode?: "listening" | "speaking" | "processing" | "steady" | "static";
  totalSeconds?: number;
  /** Server wall-clock deadline (epoch ms). Takes precedence over totalSeconds
   *  and keeps the countdown accurate across refreshes. */
  endsAt?: number | null;
  onExit?: () => void;
  /** Fired once when the round timer reaches zero. */
  onTimeUp?: () => void;
  showExitConfirm?: boolean;
}

const ROUND_LABELS: Record<RoundType, string> = {
  aptitude: "01 — Aptitude",
  coding: "02 — Coding",
  technical: "03 — Technical",
  hr: "04 — HR / Behavioral",
};

export function InterviewShell({
  children,
  round,
  roundLabel,
  questionCounter,
  pulseMode = "steady",
  totalSeconds = 1800,
  endsAt = null,
  onExit,
  onTimeUp,
  showExitConfirm = true,
}: InterviewShellProps) {
  const { timer, startTimer, startTimerWithDeadline, tickTimer, stopTimer, connectionStatus, setConnectionStatus } =
    useInterviewStore();
  const themeCtx = useInterviewThemeState();
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const timeUpFired = useRef(false);
  const timerArmed = timer.isRunning || (endsAt ?? 0) > 0 || totalSeconds > 0;

  // Start / re-sync the timer whenever the server deadline (or fallback total) changes.
  useEffect(() => {
    setConnectionStatus("connected");
    timeUpFired.current = false;
    if (endsAt && endsAt > 0) {
      startTimerWithDeadline(endsAt);
    } else if (totalSeconds > 0) {
      startTimer(totalSeconds);
    }
    return () => stopTimer();
  }, [endsAt, totalSeconds, startTimer, startTimerWithDeadline, setConnectionStatus, stopTimer]);

  // Tick timer
  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, tickTimer]);

  // Fire onTimeUp once when the clock hits zero.
  useEffect(() => {
    if (timerArmed && timer.isRunning && timer.remaining <= 0 && !timeUpFired.current) {
      timeUpFired.current = true;
      onTimeUp?.();
    }
  }, [timer.remaining, timer.isRunning, timerArmed, onTimeUp]);

  const handleExitClick = useCallback(() => {
    if (showExitConfirm) {
      setExitModalOpen(true);
    } else {
      onExit?.();
    }
  }, [showExitConfirm, onExit]);

  const isTimeLow = timer.remaining < 300;
  const isTimeCritical = timer.remaining < 60;

  return (
   <InterviewThemeContext.Provider value={themeCtx}>
    <div
      className="flex flex-col h-screen bg-[var(--iv-bg)] text-[var(--iv-text)] overflow-hidden"
      data-iv-theme={themeCtx.theme}
      data-testid="interview-shell"
    >
      {/* AdaptivePulse top bar */}
      <div className="w-full shrink-0">
        <AdaptivePulse mode={pulseMode} intensity={0.7} />
      </div>

      {/* Top chrome */}
      <header className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-[var(--iv-border)] shrink-0">
        {/* Left — Brand + Round */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span
              className="text-[var(--iv-text-faint)] text-[0.7rem] font-mono uppercase tracking-widest"
              data-testid="round-label"
            >
              {ROUND_LABELS[round]}
            </span>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === "connected" ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
                <span className="text-[#3DDC84] text-[0.65rem] font-mono uppercase tracking-wider hidden sm:block">Live</span>
              </>
            ) : connectionStatus === "reconnecting" ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[#0062FF] animate-pulse" />
                <span className="text-[#0062FF] text-[0.65rem] font-mono uppercase tracking-wider">Reconnecting...</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C5C]" />
                <span className="text-[#FF5C5C] text-[0.65rem] font-mono uppercase tracking-wider">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Center — Question counter */}
        {questionCounter && (
          <div
            className="font-mono text-[var(--iv-text-muted)] text-sm tracking-wide"
            data-testid="question-counter"
          >
            {questionCounter}
          </div>
        )}

        {/* Right — Theme + Timer + Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={themeCtx.toggle}
            className="p-1.5 rounded text-[var(--iv-text-faint)] hover:text-[var(--iv-text)] hover:bg-[color-mix(in_srgb,var(--iv-text)_10%,transparent)] transition-colors"
            title={themeCtx.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle interview theme"
            data-testid="interview-theme-toggle"
          >
            {themeCtx.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div
            className={`font-mono text-sm sm:text-base font-medium tracking-wider tabular-nums ${
              isTimeCritical
                ? "text-[#FF5C5C]"
                : isTimeLow
                ? "text-[#0062FF]"
                : "text-[var(--iv-text-secondary)]"
            }`}
            data-testid="round-timer"
          >
            {formatTime(timer.remaining)}
          </div>

          <button
            onClick={handleExitClick}
            className="p-1.5 rounded text-[var(--iv-text-faint)] hover:text-[var(--iv-text-secondary)] hover:bg-[color-mix(in_srgb,var(--iv-text)_10%,transparent)] transition-colors"
            data-testid="exit-interview-btn"
            aria-label="Exit interview"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Disconnected banner */}
      {connectionStatus === "disconnected" && (
        <div className="bg-[#3D1010] border-b border-[rgba(255,92,92,0.2)] px-6 py-2.5 flex items-center gap-3" data-testid="disconnected-banner">
          <WifiOff size={14} className="text-[#FF5C5C] shrink-0" />
          <span className="text-[#FF5C5C] text-sm flex-1">Connection lost — your answers are saved locally. Attempting to reconnect...</span>
          <button
            onClick={() => setConnectionStatus("reconnecting")}
            className="text-[#0062FF] text-sm font-medium hover:underline"
          >
            Retry now
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Exit confirmation modal */}
      {exitModalOpen && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.75)] z-50 flex items-center justify-center p-4"
          data-testid="exit-modal"
        >
          <div
            className="max-w-sm w-full p-6 space-y-4 rounded-2xl border shadow-xl"
            style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}
            data-iv-theme={themeCtx.theme}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded" style={{ backgroundColor: "color-mix(in srgb, #FF5C5C 16%, transparent)" }}>
                <AlertTriangle size={18} className="text-[#FF5C5C]" />
              </div>
              <div>
                <h3 className="text-[var(--iv-text)] font-semibold text-base mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  Exit interview?
                </h3>
                <p className="text-[var(--iv-text-faint)] text-sm leading-relaxed">
                  Your current session will be abandoned and your progress for this round will be lost. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setExitModalOpen(false)}
                className="btn-secondary flex-1"
                data-testid="exit-cancel-btn"
              >
                Continue session
              </button>
              <button
                onClick={() => { setExitModalOpen(false); onExit?.(); }}
                className="btn-primary flex-1 !bg-[#FF5C5C] hover:!bg-[rgba(255,92,92,0.85)] !text-white"
                data-testid="exit-confirm-btn"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
   </InterviewThemeContext.Provider>
  );
}
