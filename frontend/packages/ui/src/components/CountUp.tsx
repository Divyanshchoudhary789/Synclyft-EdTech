"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  start?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  onComplete?: () => void;
}

export function CountUp({
  end,
  duration = 900,
  start = 0,
  suffix = "",
  prefix = "",
  decimals = 0,
  className = "",
  onComplete,
}: CountUpProps) {
  const [value, setValue] = useState(start);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const timer = setTimeout(() => {
        setValue(end);
        onComplete?.();
      }, 0);
      return () => clearTimeout(timer);
    }

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const current = start + (end - start) * easedProgress;

      setValue(parseFloat(current.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(end);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    // Fallback: rAF is heavily throttled in unfocused / background tabs, which
    // can leave the counter stuck at a partial value. Guarantee the final
    // number lands regardless.
    const settle = setTimeout(() => {
      setValue(end);
      onComplete?.();
    }, duration + 250);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(settle);
    };
  }, [end, duration, start, decimals, onComplete]);

  return (
    <span className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
