"use client";

import { useEffect, useRef } from "react";

type Report = (type: "face_absence" | "multiple_faces" | "gaze_deviation", extra?: Record<string, unknown>) => void;

/**
 * Runs face-landmarks detection on a live <video> every ~3s and calls `report`
 * for face-absence / multiple-faces. TensorFlow is imported lazily so it never
 * touches the initial bundle; if it fails to load, proctoring silently degrades
 * to the DOM-event checks only.
 */
export function useFaceProctor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  report: Report
) {
  const absenceCount = useRef(0);
  const disposed = useRef(false);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    disposed.current = false;
    let raf: number | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: any = null;

    (async () => {
      try {
        await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        const fld = await import("@tensorflow-models/face-landmarks-detection");
        if (disposed.current) return;
        detector = await fld.createDetector(fld.SupportedModels.MediaPipeFaceMesh, {
          runtime: "tfjs",
          refineLandmarks: false,
          maxFaces: 3,
        });

        interval = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !detector || disposed.current) return;
          try {
            const faces = await detector.estimateFaces(video);
            if (!faces || faces.length === 0) {
              absenceCount.current += 1;
              if (absenceCount.current >= 2) report("face_absence");
            } else {
              absenceCount.current = 0;
              if (faces.length > 1) report("multiple_faces", { count: faces.length });
            }
          } catch {
            /* frame skipped */
          }
        }, 3000);
      } catch {
        /* TF unavailable — DOM checks still cover the essentials */
      }
    })();

    return () => {
      disposed.current = true;
      if (interval) clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
      try {
        detector?.dispose?.();
      } catch {
        /* ignore */
      }
    };
  }, [active, videoRef, report]);
}
