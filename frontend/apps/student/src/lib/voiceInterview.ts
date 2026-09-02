"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_Backend_URL || "").replace(/\/api\/?$/, "") ||
  "http://localhost:8080";

export interface VoiceHandlers {
  onReady?: () => void;
  onError?: (message: string) => void;
  /** New interviewer question — display text. */
  onInterviewerTurn?: (text: string, index: number, total: number) => void;
  /** PCM16 mono 16kHz audio for the avatar to speak. */
  onInterviewerAudio?: (pcm16: ArrayBuffer) => void;
  /** Candidate's live speech-to-text. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Technical round only — persona phase is done, switch to coding. */
  onPersonaComplete?: () => void;
  /** HR round only — interview finished. */
  onRoundComplete?: () => void;
  onDisconnect?: () => void;
}

/**
 * Thin wrapper around the backend voice interview socket
 * (services/voiceInterviewEngine.js). One instance per voice round.
 */
export class VoiceInterviewClient {
  private socket: Socket | null = null;

  constructor(
    private sessionId: string,
    private roundId: string,
    private roundType: "hr" | "technical",
    private handlers: VoiceHandlers = {}
  ) {}

  connect() {
    if (this.socket) return;
    this.socket = io(SOCKET_URL, { transports: ["websocket"], withCredentials: true });

    this.socket.on("connect", () => {
      this.socket!.emit("voice:join", {
        sessionId: this.sessionId,
        roundId: this.roundId,
        roundType: this.roundType,
      });
    });

    this.socket.on("voice:ready", () => this.handlers.onReady?.());
    this.socket.on("voice:error", (d: { message: string }) => this.handlers.onError?.(d?.message ?? "Voice service error"));
    this.socket.on("voice:interviewer-turn", (d: { text: string; index: number; total: number }) =>
      this.handlers.onInterviewerTurn?.(d.text, d.index, d.total)
    );
    this.socket.on("voice:interviewer-audio", (buf: ArrayBuffer) => this.handlers.onInterviewerAudio?.(buf));
    this.socket.on("voice:transcript", (d: { text: string; isFinal: boolean }) =>
      this.handlers.onTranscript?.(d.text, d.isFinal)
    );
    this.socket.on("voice:persona-complete", () => this.handlers.onPersonaComplete?.());
    this.socket.on("voice:round-complete", () => this.handlers.onRoundComplete?.());
    this.socket.on("disconnect", () => this.handlers.onDisconnect?.());
  }

  /** Forward a mic PCM16 chunk to the server. */
  sendAudio(pcm16: ArrayBuffer) {
    this.socket?.emit("voice:candidate-audio", pcm16);
  }

  disconnect() {
    try { this.socket?.emit("voice:leave"); } catch { /* noop */ }
    this.socket?.disconnect();
    this.socket = null;
  }
}
