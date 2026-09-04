"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { VoiceInterviewClient } from "@/lib/voiceInterview";
import { startMicCapture, type MicCapture } from "@/lib/micCapture";
import { useAuthStore } from "@synclyft/lib/store/auth";
import type { RoundType } from "@synclyft/lib/types";
import toast from "react-hot-toast";
import { Mic, MicOff, Loader2, AlertTriangle, MessageSquare, Video, VideoOff } from "lucide-react";

interface Props {
  sessionId: string;
  roundId: string;
  simliSessionToken: string;
  roundType: "hr" | "technical";
  endsAt: number | null;
  totalSeconds: number;
  /** hr: go to report. technical: switch to coding phase. */
  onComplete: () => void;
  onExit: () => void;
}

type Status = "connecting" | "live" | "avatar-degraded" | "error";

export function VoiceRound({
  sessionId, roundId, simliSessionToken, roundType, endsAt, totalSeconds, onComplete, onExit,
}: Props) {
  const userId = useAuthStore((s) => s.user?._id ?? "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);

  const simliRef = useRef<{ sendAudioData: (d: Uint8Array) => void; close: () => Promise<void> } | null>(null);
  const voiceRef = useRef<VoiceInterviewClient | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const completedRef = useRef(false);

  const [status, setStatus] = useState<Status>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [question, setQuestion] = useState("");
  const [qIndex, setQIndex] = useState({ i: 0, total: roundType === "hr" ? 4 : 3 });
  const [interim, setInterim] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // ── Candidate camera (visual only) ──
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { width: 320, height: 240 } })
      .then((s) => { stream = s; if (camRef.current) camRef.current.srcObject = s; setCamOn(true); })
      .catch(() => setCamOn(false));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // ── Simli avatar + voice pipeline ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Simli avatar (best-effort — the round still works on audio alone).
      try {
        const { SimliClient, LogLevel } = await import("simli-client");
        if (cancelled) return;
        const client = new SimliClient(
          simliSessionToken,
          videoRef.current as HTMLVideoElement,
          audioRef.current as HTMLAudioElement,
          null,
          LogLevel.ERROR,
          "livekit"
        );
        client.on("speaking", () => setAvatarSpeaking(true));
        client.on("silent", () => setAvatarSpeaking(false));
        client.on("error", (d: string) => console.warn("simli error", d));
        client.on("startup_error", (d: string) => {
          console.warn("simli startup_error", d);
          if (!cancelled) setStatus((s) => (s === "connecting" ? "avatar-degraded" : s));
        });
        await client.start();
        simliRef.current = client as unknown as typeof simliRef.current;
      } catch (e) {
        console.warn("Simli avatar unavailable:", e);
        if (!cancelled) setStatus((s) => (s === "connecting" ? "avatar-degraded" : s));
      }

      // 2. Voice socket
      const voice = new VoiceInterviewClient(sessionId, roundId, roundType, {
        onReady: () => { if (!cancelled) setStatus((s) => (s === "connecting" ? "live" : s)); },
        onError: (m) => {
          if (cancelled) return;
          setErrorMsg(m);
          setStatus("error");
        },
        onInterviewerTurn: (text, index, total) => {
          if (cancelled) return;
          setQuestion(text);
          setQIndex({ i: index, total });
        },
        onInterviewerAudio: (buf) => {
          try { simliRef.current?.sendAudioData(new Uint8Array(buf)); } catch { /* noop */ }
        },
        onTranscript: (text, isFinal) => {
          if (cancelled) return;
          setInterim(isFinal ? "" : text);
        },
        onPersonaComplete: () => finish(),
        onRoundComplete: () => finish(),
        onDisconnect: () => { if (!cancelled) setStatus((s) => (s === "live" ? "connecting" : s)); },
      });
      voice.connect();
      voiceRef.current = voice;

      // 3. Microphone → server
      try {
        const mic = await startMicCapture((chunk) => voiceRef.current?.sendAudio(chunk));
        if (cancelled) { mic.stop(); return; }
        micRef.current = mic;
        setMicOn(true);
      } catch {
        if (!cancelled) toast.error("Microphone access is required for this round.");
      }
    })();

    return () => {
      cancelled = true;
      micRef.current?.stop();
      voiceRef.current?.disconnect();
      simliRef.current?.close().catch(() => {});
      micRef.current = null;
      voiceRef.current = null;
      simliRef.current = null;
    };
  }, [sessionId, roundId, roundType, simliSessionToken, finish]);

  const statusLabel =
    status === "connecting" ? "Connecting to your interviewer…"
      : status === "avatar-degraded" ? "Live (audio only)"
        : status === "error" ? "Connection problem"
          : "Live";

  return (
    <InterviewShell
      round={roundType as RoundType}
      roundLabel={roundType === "hr" ? "HR / Behavioral" : "Technical"}
      questionCounter={qIndex.i ? `Question ${qIndex.i}/${qIndex.total}` : undefined}
      pulseMode={avatarSpeaking ? "speaking" : micOn ? "listening" : "steady"}
      totalSeconds={endsAt ? undefined : totalSeconds}
      endsAt={endsAt}
      onExit={onExit}
      onTimeUp={() => { toast("Time's up — wrapping this round"); finish(); }}
    >
      <div className="h-full overflow-y-auto p-4 sm:p-6">
        {status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle size={28} className="text-[#FF5C5C]" />
            <p className="text-[var(--iv-text)] text-sm">Couldn&apos;t run the {roundType === "hr" ? "HR" : "technical"} round</p>
            <p className="text-[var(--iv-text-faint)] text-xs max-w-sm">{errorMsg}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => window.location.reload()} className="btn-secondary">Retry</button>
              <button onClick={finish} className="btn-primary">
                {roundType === "hr" ? "Finish & see report" : "Continue to coding"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl grid gap-4 lg:grid-cols-3">
            {/* Avatar */}
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-[var(--iv-border)] bg-[var(--iv-card)] aspect-video">
              <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
              <audio ref={audioRef} autoPlay />
              {(status === "connecting" || status === "avatar-degraded") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--iv-bg)]/85">
                  {status === "connecting" ? (
                    <>
                      <Loader2 size={22} className="animate-spin text-[#0062FF]" />
                      <p className="text-xs text-[var(--iv-text-muted)]">Connecting to your interviewer…</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[var(--iv-elevated)] border border-[var(--iv-border)] flex items-center justify-center">
                        <MessageSquare size={22} className="text-[#4D7CFF]" />
                      </div>
                      <p className="text-xs text-[var(--iv-text-muted)]">Audio interview — the interviewer&apos;s voice will play</p>
                    </>
                  )}
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 border border-white/10">
                <span className={`h-2 w-2 rounded-full ${avatarSpeaking ? "bg-[#4D7CFF] animate-pulse" : "bg-[#3DDC84]"}`} />
                <span className="text-[11px] font-medium text-[var(--iv-text-secondary)]">
                  {avatarSpeaking ? "Interviewer speaking" : "Interviewer listening"}
                </span>
              </div>
            </div>

            {/* Candidate + status */}
            <div className="flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-[var(--iv-border)] bg-[var(--iv-card)] aspect-video">
                <video ref={camRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center"><VideoOff size={20} className="text-[var(--iv-text-faintest)]" /></div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
                  {camOn ? <Video size={10} className="text-[#3DDC84]" /> : <VideoOff size={10} className="text-[var(--iv-text-faint)]" />}
                  <span className="text-[10px] text-[var(--iv-text-secondary)]">You</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--iv-border)] bg-[var(--iv-card)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${status === "live" || status === "avatar-degraded" ? "bg-[#3DDC84]" : "bg-[#F59E0B]"}`} />
                  <span className="text-[var(--iv-text-muted)]">{statusLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {micOn ? <Mic size={13} className="text-[#3DDC84]" /> : <MicOff size={13} className="text-[#FF5C5C]" />}
                  <span className="text-[var(--iv-text-muted)]">{micOn ? "Microphone live — speak naturally" : "Microphone off"}</span>
                </div>
                {micOn && (
                  <div className="flex h-6 items-center gap-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i}
                        className="w-1 rounded-full bg-[#0062FF]/70"
                        style={{ height: avatarSpeaking ? 3 : `${8 + ((i * 5) % 16)}px`, transition: "height .15s" }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Question + transcript */}
            <div className="lg:col-span-3 rounded-2xl border border-[var(--iv-border)] bg-[var(--iv-card)] p-4 sm:p-5 space-y-2">
              <p className="label-caption text-[var(--iv-text-faintest)]">Current question</p>
              <p className="text-[var(--iv-text)] text-sm sm:text-base leading-relaxed min-h-[1.5rem]">
                {question || (status === "connecting" ? "…" : "Waiting for the interviewer…")}
              </p>
              {interim && (
                <p className="text-xs text-[var(--iv-text-faint)] italic border-t border-[var(--iv-border)] pt-2">“{interim}”</p>
              )}
              <p className="text-[11px] text-[var(--iv-text-faintest)] pt-1">
                {roundType === "hr"
                  ? "Answer out loud using the STAR method (Situation, Task, Action, Result)."
                  : "Talk through your design — data model, trade-offs, scaling. The coding challenge follows."}
              </p>
            </div>
          </div>
        )}
      </div>

      {userId && (
        <ProctoringOverlay
          sessionId={sessionId}
          candidateId={userId}
          roundType={roundType}
          onTerminate={(reason) => { toast.error(reason); finish(); }}
        />
      )}
    </InterviewShell>
  );
}
