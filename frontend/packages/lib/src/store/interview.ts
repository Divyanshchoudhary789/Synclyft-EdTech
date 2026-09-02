import { create } from "zustand";
import type { RoundType, InterviewSession, MCQQuestion, ChatMessage } from "../api/types";

interface TimerState {
  totalSeconds: number;
  remaining: number;
  isRunning: boolean;
  /** Wall-clock deadline (epoch ms). When set, `remaining` is derived from it so
   *  the timer stays accurate across refreshes / tab sleep. */
  deadline: number | null;
}

interface ProctoringState {
  isActive: boolean;
  cameraPermission: "granted" | "denied" | "pending";
  violations: { type: string; timestamp: string; severity: "low" | "medium" | "high" }[];
  riskScore: number;
}

interface InterviewStore {
  session: InterviewSession | null;
  currentRound: RoundType | null;
  timer: TimerState;
  proctoring: ProctoringState;
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting";

  // Aptitude
  currentQuestionIndex: number;
  totalQuestions: number;
  selectedAnswers: Record<string, string>;
  questions: MCQQuestion[];

  // Coding
  selectedLanguage: string;
  code: Record<string, string>;
  isRunning: boolean;

  // Technical/HR
  messages: ChatMessage[];
  isAISpeaking: boolean;
  isCandidateSpeaking: boolean;
  voiceState: "idle" | "speaking" | "listening" | "processing";

  // Actions
  setSession: (session: InterviewSession) => void;
  setCurrentRound: (round: RoundType) => void;
  startTimer: (seconds: number) => void;
  /** Start (or re-sync) the timer against a server-provided wall-clock deadline. */
  startTimerWithDeadline: (deadlineMs: number, totalSeconds?: number) => void;
  tickTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  selectAnswer: (questionId: string, answerId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setLanguage: (lang: string) => void;
  setCode: (lang: string, code: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setVoiceState: (state: "idle" | "speaking" | "listening" | "processing") => void;
  addViolation: (type: string, severity: "low" | "medium" | "high") => void;
  setConnectionStatus: (status: "connecting" | "connected" | "disconnected" | "reconnecting") => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  session: null,
  currentRound: null,
  timer: { totalSeconds: 0, remaining: 0, isRunning: false, deadline: null },
  proctoring: {
    isActive: false,
    cameraPermission: "pending",
    violations: [],
    riskScore: 0,
  },
  isConnected: false,
  connectionStatus: "disconnected",
  currentQuestionIndex: 0,
  totalQuestions: 15,
  selectedAnswers: {},
  questions: [],
  selectedLanguage: "python",
  code: {},
  isRunning: false,
  messages: [],
  isAISpeaking: false,
  isCandidateSpeaking: false,
  voiceState: "idle",

  setSession: (session) => set({ session }),
  setCurrentRound: (round) => set({ currentRound: round }),

  startTimer: (seconds) =>
    set({ timer: { totalSeconds: seconds, remaining: seconds, isRunning: true, deadline: null } }),

  startTimerWithDeadline: (deadlineMs, totalSeconds) =>
    set(() => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      return {
        timer: {
          totalSeconds: totalSeconds ?? remaining,
          remaining,
          isRunning: true,
          deadline: deadlineMs,
        },
      };
    }),

  tickTimer: () =>
    set((state) => {
      if (state.timer.deadline) {
        return {
          timer: {
            ...state.timer,
            remaining: Math.max(0, Math.round((state.timer.deadline - Date.now()) / 1000)),
          },
        };
      }
      return { timer: { ...state.timer, remaining: Math.max(0, state.timer.remaining - 1) } };
    }),

  stopTimer: () =>
    set((state) => ({ timer: { ...state.timer, isRunning: false } })),

  resetTimer: () =>
    set((state) => ({
      timer: { ...state.timer, remaining: state.timer.totalSeconds, deadline: null },
    })),

  selectAnswer: (questionId, answerId) =>
    set((state) => ({
      selectedAnswers: { ...state.selectedAnswers, [questionId]: answerId },
    })),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(
        state.currentQuestionIndex + 1,
        state.totalQuestions - 1
      ),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
    })),

  setLanguage: (lang) => set({ selectedLanguage: lang }),

  setCode: (lang, code) =>
    set((state) => ({ code: { ...state.code, [lang]: code } })),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setVoiceState: (voiceState) => set({ voiceState }),

  addViolation: (type, severity) =>
    set((state) => ({
      proctoring: {
        ...state.proctoring,
        violations: [
          ...state.proctoring.violations,
          { type, severity, timestamp: new Date().toISOString() },
        ],
      },
    })),

  setConnectionStatus: (connectionStatus) =>
    set({ connectionStatus, isConnected: connectionStatus === "connected" }),

  reset: () =>
    set({
      session: null,
      currentRound: null,
      timer: { totalSeconds: 0, remaining: 0, isRunning: false, deadline: null },
      currentQuestionIndex: 0,
      selectedAnswers: {},
      messages: [],
      voiceState: "idle",
    }),
}));
