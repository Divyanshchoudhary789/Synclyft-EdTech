"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Eye, AlertTriangle, X } from "lucide-react";
import { useInterviewStore } from "@synclyft/lib/store/interview";
import { useAudioProctor } from "@/components/hooks/useAudioProctor";

interface ViolationToast {
  id: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export function ProctoringOverlay() {
  const { proctoring, addViolation } = useInterviewStore();
  const [toasts, setToasts] = useState<ViolationToast[]>([]);
  
  const handleVoiceFlagged = useCallback(() => {
    // showToast is declared later, but we can't easily reference it here if it's a const. Let's rely on setToasts directly to avoid dependency on showToast inside useCallback, or we can just use showToast as long as it doesn't change
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message: "Background noise/voice detected", severity: "medium" }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
    addViolation("voice", "medium");
  }, [addViolation]);

  useAudioProctor(true, handleVoiceFlagged);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Draggable positioning state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const activePosition = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only allow primary (left) button click
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - activePosition.current.x,
      y: e.clientY - activePosition.current.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    const nextPos = { x: newX, y: newY };
    setPosition(nextPos);
    activePosition.current = nextPos;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    let isMounted = true;
    let streamRef: MediaStream | null = null;

    // Request camera on mount
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        // Camera denied — show a placeholder
        alert("something went wrong")
        console.log(error)
      });

    return () => {
      isMounted = false;
      if (streamRef) {
        streamRef.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const showToast = (message: string, severity: "low" | "medium" | "high") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Simulate a proctoring alert for demo
  useEffect(() => {
    const timeout = setTimeout(() => {
      showToast("Multiple faces detected in frame", "medium");
    }, 15000);
    return () => clearTimeout(timeout);
  }, []);

  const statusColor = proctoring.violations.length === 0 ? "#3DDC84" : "#0062FF";

  return (
    <>
      {/* Camera preview — corner anchored & draggable */}
      <div
        className="fixed bottom-4 right-4 z-40 w-32 h-24 rounded-[8px] overflow-hidden border select-none transition-[border-color] duration-200"
        style={{
          borderColor: statusColor + "40",
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag to reposition"
        data-testid="proctoring-camera"
      >
        {cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full bg-[#1B1F26] flex items-center justify-center">
            <Camera size={20} className="text-[#4A5260]" />
          </div>
        )}

        {/* Status ring indicator */}
        <div className="absolute top-1.5 right-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Label */}
        <div className="absolute bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5">
          <span className="font-mono text-[0.6rem] text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
            <Eye size={8} />
            Proctored
          </span>
        </div>
      </div>

      {/* Violation toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs" data-testid="proctoring-toasts">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-2.5 p-3 rounded-[8px] border"
            style={{
              backgroundColor: "#3D1010",
              borderColor: "rgba(255,92,92,0.25)",
            }}
            data-testid="violation-toast"
          >
            <AlertTriangle size={14} className="text-[#FF5C5C] shrink-0 mt-0.5" />
            <span className="text-[#FF5C5C] text-xs leading-relaxed flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#FF5C5C] opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
