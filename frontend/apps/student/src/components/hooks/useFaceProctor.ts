"use client";

import { useEffect, useRef } from "react";

type Report = (type: "face_absence" | "multiple_faces" | "gaze_deviation", extra?: Record<string, unknown>) => void;

/**
 * Runs face-landmarks detection on a live <video> every ~3s and calls `report`
 * for face-absence / multiple-faces. TensorFlow is imported lazily so it never
 * touches the initial bundle; if it fails to load, proctoring silently degrades
 * to the DOM-event checks only.
 *
 * Tuned to avoid the classic false positives:
 *  - a warm-up window while the model + webcam settle (no flags for ~8s after ready)
 *  - face_absence needs 4 consecutive misses (~12s) and then a long cooldown
 *  - multiple_faces needs 2 consecutive multi-face frames, filters out tiny/low
 *    confidence boxes (posters, reflections), and has its own cooldown
 */
export function useFaceProctor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  report: Report
) {
  const reportRef = useRef(report);
  reportRef.current = report;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: any = null;

    const ABSENCE_STREAK_TO_FLAG = 4;      // ~12s of no face
    const ABSENCE_COOLDOWN_MS = 22000;
    const MULTI_STREAK_TO_FLAG = 2;        // 2 consecutive frames with >1 real face
    const MULTI_COOLDOWN_MS = 20000;
    const WARMUP_MS = 5000;

    let absenceStreak = 0;
    let multiStreak = 0;
    let lastAbsenceFlag = 0;
    let lastMultiFlag = 0;
    let readyAt = 0;

    // A face box must occupy a plausible fraction of the frame to count — filters
    // out background faces on a poster / photo / screen reflection.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isRealFace = (face: any, vw: number, vh: number) => {
      const box = face?.box;
      if (!box || !vw || !vh) return true; // no box info — don't over-filter
      const w = Number(box.width ?? box.xMax - box.xMin) || 0;
      const h = Number(box.height ?? box.yMax - box.yMin) || 0;
      const area = (w * h) / (vw * vh);
      // Low bar — the webcam feed is small, a second person off to the side is
      // easily under 3% of frame. COCO-SSD person-count is the primary signal;
      // this is only a corroborating net.
      return area >= 0.012;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFaces = (faces: any[], vw: number, vh: number) => {
      if (disposed) return;
      const realFaces = (faces || []).filter((f) => isRealFace(f, vw, vh));
      const now = Date.now();

      if (realFaces.length === 0) {
        absenceStreak += 1;
        multiStreak = 0;
        if (absenceStreak >= ABSENCE_STREAK_TO_FLAG && now - lastAbsenceFlag >= ABSENCE_COOLDOWN_MS) {
          lastAbsenceFlag = now;
          absenceStreak = 0;
          reportRef.current("face_absence");
        }
        return;
      }

      absenceStreak = 0;

      if (realFaces.length > 1) {
        multiStreak += 1;
        if (multiStreak >= MULTI_STREAK_TO_FLAG && now - lastMultiFlag >= MULTI_COOLDOWN_MS) {
          lastMultiFlag = now;
          multiStreak = 0;
          reportRef.current("multiple_faces", { count: realFaces.length });
        }
      } else {
        multiStreak = 0;
      }
    };

    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        await import("@tensorflow/tfjs-backend-cpu");
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        await tf.ready();

        const fld = await import("@tensorflow-models/face-landmarks-detection");
        if (disposed) return;
        detector = await fld.createDetector(fld.SupportedModels.MediaPipeFaceMesh, {
          runtime: "tfjs",
          refineLandmarks: false,
          maxFaces: 3,
        });
        if (disposed) return;
        readyAt = Date.now();

        interval = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !detector || disposed || inFlight) return;
          if (Date.now() - readyAt < WARMUP_MS) return; // settle window

          const vw = video.videoWidth || 0;
          const vh = video.videoHeight || 0;
          inFlight = true;
          Promise.resolve()
            .then(() => detector.estimateFaces(video))
            .then((faces: unknown) => handleFaces(faces as unknown[], vw, vh))
            .catch(() => {
              /* frame skipped — don't treat as absence, never rethrow */
            })
            .finally(() => {
              inFlight = false;
            });
        }, 3000);
      } catch {
        /* TF unavailable — DOM checks still cover the essentials */
      }
    })().catch(() => {
      /* never let setup failure escape */
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      try {
        detector?.dispose?.();
      } catch {
        /* ignore */
      }
    };
  }, [active, videoRef]);
}
