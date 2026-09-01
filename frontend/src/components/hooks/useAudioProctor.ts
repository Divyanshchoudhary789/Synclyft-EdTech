"use client";

import { useEffect, useRef } from "react";

export const useAudioProctor = (active: boolean, onVoiceFlagged: () => void) => {
  const lastFlaggedRef = useRef<number>(0);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    let isMounted = true;

    const initializeAudioRegistry = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const monitorThresholdLoop = () => {
          if (!isMounted) return;

          analyser.getByteFrequencyData(dataArray);

          // Compute Root Mean Square (RMS) via high performance typed array
          let totalSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(totalSquares / bufferLength);

          // Convert to DB
          const db = rms > 0 ? 20 * Math.log10(rms / 255) : -Infinity;

          // Senior Check: Rate limit voice flags to once every 2.5 seconds (Debounce telemetry)
          if (db > -28) {
            const now = Date.now();
            if (now - lastFlaggedRef.current > 2500) {
              onVoiceFlagged();
              lastFlaggedRef.current = now;
            }
          }
          animationFrameId = requestAnimationFrame(monitorThresholdLoop);
        };

        monitorThresholdLoop();
      } catch (err) {
        console.error("Audio telemetry sub-thread execution crash:", err);
      }
    };

    initializeAudioRegistry();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== "closed") audioContext.close();
    };
  }, [active, onVoiceFlagged]);
};
