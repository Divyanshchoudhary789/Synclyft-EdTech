"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_Backend_URL || "").replace(/\/api\/?$/, "") ||
  "http://localhost:8080";

export type ProctorViolationType =
  | "face_absence"
  | "multiple_faces"
  | "gaze_deviation"
  | "tab_switch"
  | "window_minimize"
  | "paste_attempt"
  | "scripted_input"
  | "multiple_voices"
  | "mobile_detected";

/**
 * Thin wrapper around the backend proctoring socket (services/proctorEngine.js).
 * One instance per interview session; shared across round pages.
 */
export class ProctorSocket {
  private socket: Socket | null = null;
  private started = false;

  constructor(
    private sessionId: string,
    private candidateId: string,
    private handlers: {
      onRiskUpdate?: (score: number, message: string) => void;
      onTerminate?: (reason: string) => void;
      onReady?: (score: number) => void;
    } = {}
  ) {}

  connect() {
    if (this.socket) return;
    this.socket = io(SOCKET_URL, { transports: ["websocket"], withCredentials: true });

    this.socket.on("connect", () => {
      if (!this.started) {
        this.socket!.emit("START_PROCTORING", { sessionId: this.sessionId, candidateId: this.candidateId });
        this.started = true;
      }
    });
    this.socket.on("PROCTORING_INITIALIZED", (d: { currentScore: number }) => this.handlers.onReady?.(d.currentScore ?? 0));
    this.socket.on("RISK_SCORE_UPDATE", (d: { riskScore: number; message: string }) =>
      this.handlers.onRiskUpdate?.(d.riskScore ?? 0, d.message ?? "")
    );
    this.socket.on("TERMINATE_SESSION", (d: { reason: string }) => this.handlers.onTerminate?.(d.reason ?? "Session terminated"));
  }

  report(type: ProctorViolationType, roundType: string, rawData?: Record<string, unknown>, imageCapture?: string) {
    this.socket?.emit("PROCTOR_EVENT", { type, roundType, rawData, imageCapture });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.started = false;
  }
}
