"use client";

import { useEffect, useRef } from "react";

/**
 * Background-voice detector.
 *
 * The previous version flagged on *any* sound above a fixed dB threshold using
 * frequency-domain data — so a fan, a keyboard, or the AI interviewer's own
 * voice through the speakers tripped it within seconds. This version:
 *
 *  1. Calibrates the room's noise floor over the first few seconds.
 *  2. Only reacts to sound that is BOTH loud in absolute terms AND far above
 *     that calibrated floor (i.e. a distinct nearby speaker, not room tone).
 *  3. Requires the loud sound to be *sustained* for ~2s continuously before it
 *     counts — a single cough or chair creak is ignored.
 *  4. Waits a long cooldown between flags so one noisy stretch is one event.
 *
 * It is intentionally conservative: a false negative is far cheaper than
 * wrongly disqualifying an honest candidate.
 */
export const useAudioProctor = (active: boolean, onVoiceFlagged: () => void) => {
  const cbRef = useRef(onVoiceFlagged);
  cbRef.current = onVoiceFlagged;

  useEffect(() => {
    if (!active || typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let isMounted = true;

    const CALIBRATION_MS = 4000;
    const SUSTAIN_MS = 2000;          // loud sound must persist this long
    const COOLDOWN_MS = 30000;        // min gap between flags
    const ABS_FLOOR = 0.06;           // ignore anything quieter than this (RMS 0..1)
    const OVER_BASELINE = 3.5;        // must be this many× the calibrated floor

    let calibrationEndsAt = 0;
    let noiseSamples: number[] = [];
    let baseline = ABS_FLOOR;
    let loudSince = 0;
    let lastFlaggedAt = 0;

    const init = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
        });
        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = mediaStream;
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new Ctx();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);

        const buf = new Uint8Array(analyser.fftSize);
        calibrationEndsAt = performance.now() + CALIBRATION_MS;

        const loop = () => {
          if (!isMounted) return;
          rafId = requestAnimationFrame(loop);

          analyser.getByteTimeDomainData(buf);
          // Time-domain RMS around the 128 midpoint, normalised to 0..1.
          let sumSq = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / buf.length);
          const nowMs = performance.now();

          if (nowMs < calibrationEndsAt) {
            noiseSamples.push(rms);
            return;
          }
          if (noiseSamples.length) {
            noiseSamples.sort((a, b) => a - b);
            // Use the 75th percentile of the calibration window as the floor.
            const p75 = noiseSamples[Math.floor(noiseSamples.length * 0.75)] || ABS_FLOOR;
            baseline = Math.max(ABS_FLOOR, p75);
            noiseSamples = [];
          }

          const isLoud = rms > ABS_FLOOR && rms > baseline * OVER_BASELINE;
          if (isLoud) {
            if (loudSince === 0) loudSince = nowMs;
            if (
              nowMs - loudSince >= SUSTAIN_MS &&
              nowMs - lastFlaggedAt >= COOLDOWN_MS
            ) {
              lastFlaggedAt = nowMs;
              loudSince = 0;
              cbRef.current();
            }
          } else {
            loudSince = 0;
          }
        };
        loop();
      } catch {
        /* mic unavailable — face + DOM checks still cover the essentials */
      }
    };

    init();

    return () => {
      isMounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      if (audioContext && audioContext.state !== "closed") audioContext.close().catch(() => {});
    };
  }, [active]);
};
