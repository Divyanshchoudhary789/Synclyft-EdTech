"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Eye, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { useAudioProctor } from "@/components/hooks/useAudioProctor";
import { useFaceProctor } from "@/components/hooks/useFaceProctor";
import { useObjectProctor } from "@/components/hooks/useObjectProctor";
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
  face_absence: "Your face isn't visible — center yourself in the camera",
  multiple_faces: "More than one person detected in frame",
  gaze_deviation: "Looking away from the screen",
  tab_switch: "You switched away from this tab",
  window_minimize: "The interview window lost focus",
  paste_attempt: "Pasting is disabled during the interview",
  scripted_input: "Automated input detected",
  multiple_voices: "Background voices detected — find a quiet, private space",
  mobile_detected: "A phone was detected",
};

// Give the candidate time to settle, and let the browser's camera/mic permission
// prompts (which steal window focus) clear before anything is scored.
const GRACE_MS = 12000;
// A quick focus blip (permission dialog, notification) shouldn't count. Only a
// blur that lasts this long is a real "left the window".
const BLUR_GRACE_MS = 2200;

export function ProctoringOverlay({ sessionId, candidateId, roundType, onTerminate }: Props) {
  const [toasts, setToasts] = useState<ViolationToast[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const proctorRef = useRef<ProctorSocket | null>(null);
  const armedAt = useRef<number>(Date.now() + GRACE_MS);
  const cameraReportedRef = useRef(false);

  // Voice rounds: the candidate is *meant* to be talking to the AI and the
  // interviewer's voice plays through the speakers — background-audio proctoring
  // is meaningless here and would fire constantly.
  const audioProctorEnabled = roundType === "aptitude" || roundType === "coding";

  const toast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const report = useCallback(
    (type: ProctorViolationType, rawData?: Record<string, unknown>) => {
      // Hard signals (a phone, a second person) are never acceptable — even in
      // the warm-up window. Everything else is swallowed until the candidate has
      // had a moment to settle and the browser permission prompts have cleared.
      const isHardSignal = type === "mobile_detected" || type === "multiple_faces";
      if (!isHardSignal && Date.now() < armedAt.current) return;
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
      ?.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => {
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCameraOn(true);
        setCameraDenied(false);
      })
      .catch(() => {
        setCameraOn(false);
        setCameraDenied(true);
        // Report once — a denied camera is a real integrity gap, but hammering
        // face_absence every render is not the way to record it.
        if (!cameraReportedRef.current) {
          cameraReportedRef.current = true;
          setTimeout(() => report("face_absence", { reason: "camera_denied" }), GRACE_MS + 500);
        }
      });
    return () => {
      mounted = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [report]);

  // ── Face + object + audio detectors ──
  useFaceProctor(videoRef, cameraOn, report);
  useObjectProctor(videoRef, cameraOn, report);
  useAudioProctor(
    audioProctorEnabled,
    useCallback(() => report("multiple_voices"), [report])
  );

  // ── DOM-level violations ──
  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Debounced inside report() via the grace window; the server also
        // throttles per-type, so a genuine tab-away is one clean event.
        report("tab_switch");
      }
    };
    const onBlur = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => report("window_minimize"), BLUR_GRACE_MS);
    };
    const onFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      // Allow paste inside the code editor only.
      const el = e.target as HTMLElement;
      if (el?.closest?.(".monaco-editor")) return;
      report("paste_attempt");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
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

      {cameraDenied && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-amber-500/30 bg-[#3D2E10] px-4 py-2 text-xs text-[#F59E0B]">
          <Camera size={14} /> Camera access is off — enable it in your browser for a clean proctoring record.
        </div>
      )}

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
