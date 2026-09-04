"use client";

import { useEffect, useRef } from "react";

type Report = (
  type: "multiple_faces" | "mobile_detected" | "face_absence",
  extra?: Record<string, unknown>
) => void;

/**
 * Object-level proctoring using COCO-SSD (the standard in-browser object
 * detector). More reliable than face-mesh for two things face-mesh cannot see:
 *
 *   - counting PEOPLE in frame  → `multiple_faces`  (>= 2 persons)
 *   - spotting a PHONE in frame → `mobile_detected` ("cell phone")
 *
 * Notes on robustness:
 *  - COCO-SSD internally flips to the CPU backend for non-max-suppression, so
 *    BOTH `tfjs-backend-webgl` and `tfjs-backend-cpu` must be registered or
 *    `detect()` throws "Backend name 'cpu' not found in registry".
 *  - every model call is `.then/.catch` (never a bare `await`) so a rejected
 *    inference promise can never surface as an unhandledRejection and break the
 *    page it is mounted on.
 *  - lazy-loaded; degrades silently if TF or the weights can't load.
 */
export function useObjectProctor(
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
    let model: any = null;

    const WARMUP_MS = 5000;
    const TICK_MS = 4000;

    const PERSON_MIN_SCORE = 0.6;
    const PHONE_MIN_SCORE = 0.45;

    const MULTI_STREAK = 2;
    const PHONE_STREAK = 2;
    const ABSENCE_STREAK = 4;

    const MULTI_COOLDOWN_MS = 18000;
    const PHONE_COOLDOWN_MS = 18000;
    const ABSENCE_COOLDOWN_MS = 22000;

    let multiStreak = 0;
    let phoneStreak = 0;
    let absenceStreak = 0;
    let lastMulti = 0;
    let lastPhone = 0;
    let lastAbsence = 0;
    let readyAt = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePreds = (preds: any[]) => {
      if (disposed || !Array.isArray(preds)) return;
      const persons = preds.filter((p) => p.class === "person" && p.score >= PERSON_MIN_SCORE);
      const phones = preds.filter(
        (p) => (p.class === "cell phone" || p.class === "remote") && p.score >= PHONE_MIN_SCORE
      );
      const now = Date.now();

      if (persons.length >= 2) {
        multiStreak += 1;
        if (multiStreak >= MULTI_STREAK && now - lastMulti >= MULTI_COOLDOWN_MS) {
          lastMulti = now;
          multiStreak = 0;
          reportRef.current("multiple_faces", { count: persons.length, via: "coco-ssd" });
        }
      } else {
        multiStreak = 0;
      }

      if (persons.length === 0) {
        absenceStreak += 1;
        if (absenceStreak >= ABSENCE_STREAK && now - lastAbsence >= ABSENCE_COOLDOWN_MS) {
          lastAbsence = now;
          absenceStreak = 0;
          reportRef.current("face_absence", { via: "coco-ssd" });
        }
      } else {
        absenceStreak = 0;
      }

      if (phones.length >= 1) {
        phoneStreak += 1;
        if (phoneStreak >= PHONE_STREAK && now - lastPhone >= PHONE_COOLDOWN_MS) {
          lastPhone = now;
          phoneStreak = 0;
          reportRef.current("mobile_detected", { score: Number(phones[0].score.toFixed(2)) });
        }
      } else {
        phoneStreak = 0;
      }
    };

    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        await import("@tensorflow/tfjs-backend-cpu"); // required by coco-ssd's NMS step
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        await tf.ready();

        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        if (disposed) return;
        // lite_mobilenet_v2 = smallest / fastest base — least main-thread jank,
        // still solid for a phone or a second face at webcam distance.
        model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (disposed) return;
        readyAt = Date.now();

        interval = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !model || disposed || inFlight) return;
          if (Date.now() - readyAt < WARMUP_MS) return;

          inFlight = true;
          Promise.resolve()
            .then(() => model.detect(video, 20))
            .then((preds: unknown) => handlePreds(preds as unknown[]))
            .catch(() => {
              /* frame skipped — never rethrow */
            })
            .finally(() => {
              inFlight = false;
            });
        }, TICK_MS);
      } catch {
        /* model unavailable — face + DOM checks still cover the essentials */
      }
    })().catch(() => {
      /* never let setup failure escape */
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      try {
        model?.dispose?.();
      } catch {
        /* ignore */
      }
    };
  }, [active, videoRef]);
}
