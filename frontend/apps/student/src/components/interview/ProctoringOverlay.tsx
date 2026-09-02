"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Eye, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { useAudioProctor } from "@/components/hooks/useAudioProctor";
import { useFaceProctor } from "@/components/hooks/useFaceProctor";
import { ProctorSocket, type ProctorViolationType } from "@/lib/proctorSocket";

interface ViolationToast {
  id: string;
  message: string;
}

interface Props {
  sessionId: string;
  candidateId: string;
  roundType: "aptitude" | "coding" | "technical" | "hr";
  /** Called when the server disqualifies the session. */
  onTerminate?: (reason: string) => void;
}

const HUMAN: Record<ProctorViolationType, string> = {
  face_absence: "Your face is not visible",
  multiple_faces: "More than one person detected",
  gaze_deviation: "Looking away from the screen",
  tab_switch: "You switched away from this tab",
  window_minimize: "The interview window lost focus",
  paste_attempt: "Pasting is disabled during the interview",
  scripted_input: "Automated input detected",
  multiple_voices: "Background voices detected",
  mobile_detected: "A phone was detected",
};

export function ProctoringOverlay({ sessionId, candidateId, roundType, onTerminate }: Props) {
  const [toasts, setToasts] = useState<ViolationToast[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const proctorRef = useRef<ProctorSocket | null>(null);

  const toast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const report = useCallback(
    (type: ProctorViolationType, rawData?: Record<string, unknown>) => {
      proctorRef.current?.report(type, roundType, rawData);
      toast(HUMAN[type]);
    },
    [roundType, toast]
  );

  // ── Socket ──
  useEffect(() => {
    if (!sessionId || !candidateId) return;
    const p = new ProctorSocket(sessionId, candidateId, {
      onReady: (s) => setRiskScore(s),
      onRiskUpdate: (s, msg) => {
        setRiskScore(s);
        if (msg) toast(msg);
      },
      onTerminate: (reason) => onTerminate?.(reason),
    });
    p.connect();
    proctorRef.current = p;
    return () => {
      p.disconnect();
      proctorRef.current = null;
    };
  }, [sessionId, candidateId, onTerminate, toast]);

  // ── Camera ──
  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240 } })
      .then((s) => {
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCameraOn(true);
      })
      .catch(() => {
        setCameraOn(false);
        report("face_absence", { reason: "camera_denied" });
      });
    return () => {
      mounted = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [report]);

  // ── Face + audio detectors ──
  useFaceProctor(videoRef, cameraOn, report);
  useAudioProctor(true, useCallback(() => report("multiple_voices"), [report]));

  // ── DOM-level violations ──
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("tab_switch");
    };
    const onBlur = () => report("window_minimize");
    const onPaste = (e: ClipboardEvent) => {
      // Allow paste inside the code editor only.
      const el = e.target as HTMLElement;
      if (el?.closest?.(".monaco-editor")) return;
      report("paste_attempt");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [report]);

  const ringColor = riskScore >= 60 ? "#FF5C5C" : riskScore >= 25 ? "#F59E0B" : "#3DDC84";

  return (
    <>
      {/* Camera preview */}
      <div
        className="fixed bottom-4 right-4 z-40 h-24 w-32 overflow-hidden rounded-lg border"
        style={{ borderColor: ringColor + "55" }}
        data-testid="proctoring-camera"
      >
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1B1F26]">
            <Camera size={20} className="text-[#4A5260]" />
          </div>
        )}
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: ringColor }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5">
          <span className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-[#9CA3AF]">
            <Eye size={8} /> {riskScore > 0 ? `Risk ${riskScore}` : "Proctored"}
          </span>
        </div>
      </div>

      {/* Violation toasts */}
      <div className="fixed right-4 top-16 z-50 max-w-xs space-y-2" data-testid="proctoring-toasts">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2.5 rounded-lg border p-3"
            style={{ backgroundColor: "#3D1010", borderColor: "rgba(255,92,92,0.25)" }}
            data-testid="violation-toast"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#FF5C5C]" />
            <span className="flex-1 text-xs leading-relaxed text-[#FF5C5C]">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-[#FF5C5C] opacity-60 hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {riskScore >= 75 && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-rose-500/30 bg-[#3D1010] px-4 py-2 text-xs text-[#FF5C5C]">
          <ShieldAlert size={14} /> High proctoring risk — further violations will end the session.
        </div>
      )}
    </>
  );
}
