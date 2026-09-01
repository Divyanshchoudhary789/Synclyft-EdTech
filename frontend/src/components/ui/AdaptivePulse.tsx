"use client";

import { useEffect, useRef } from "react";

interface AdaptivePulseProps {
  mode?: "listening" | "speaking" | "processing" | "steady" | "static";
  intensity?: number; // 0–1
  className?: string;
}

export function AdaptivePulse({
  mode = "steady",
  intensity = 0.6,
  className = "",
}: AdaptivePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    resizeObserver.observe(canvas);

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      if (prefersReduced || mode === "static") {
        // Static amber glow line
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "rgba(0, 98, 255, 0)");
        grad.addColorStop(0.2, "rgba(0, 98, 255, 0.6)");
        grad.addColorStop(0.5, "rgba(0, 98, 255, 0.9)");
        grad.addColorStop(0.8, "rgba(0, 98, 255, 0.6)");
        grad.addColorStop(1, "rgba(0, 98, 255, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      timeRef.current += 0.016;
      const t = timeRef.current;

      const baseAmplitude = H * 0.3 * intensity;
      const points: { x: number; y: number }[] = [];
      const segments = 120;

      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * W;
        const progress = i / segments;

        let y = H / 2;

        if (mode === "listening") {
          y +=
            Math.sin(progress * Math.PI * 6 + t * 3) * baseAmplitude * 0.8 +
            Math.sin(progress * Math.PI * 14 + t * 5) * baseAmplitude * 0.3 +
            Math.sin(progress * Math.PI * 2 + t * 1.5) * baseAmplitude * 0.4;
        } else if (mode === "speaking") {
          y +=
            Math.sin(progress * Math.PI * 8 + t * 4) * baseAmplitude +
            Math.sin(progress * Math.PI * 20 + t * 7) * baseAmplitude * 0.2 +
            Math.cos(progress * Math.PI * 4 + t * 2) * baseAmplitude * 0.3;
        } else if (mode === "processing") {
          const wave = Math.sin(progress * Math.PI * 4 + t * 2) * baseAmplitude * 0.5;
          const pulse = Math.sin(t * 3 + progress * 2) * baseAmplitude * 0.4;
          y += wave + pulse;
        } else {
          // steady — gentle sine
          y +=
            Math.sin(progress * Math.PI * 3 + t * 1.2) * baseAmplitude * 0.4 +
            Math.sin(progress * Math.PI * 6 + t * 0.8) * baseAmplitude * 0.15;
        }

        points.push({ x, y });
      }

      // Draw glow (wide, transparent)
      const glowGrad = ctx.createLinearGradient(0, 0, W, 0);
      glowGrad.addColorStop(0, "rgba(0, 98, 255, 0)");
      glowGrad.addColorStop(0.1, "rgba(0, 98, 255, 0.15)");
      glowGrad.addColorStop(0.5, "rgba(0, 98, 255, 0.25)");
      glowGrad.addColorStop(0.9, "rgba(0, 98, 255, 0.15)");
      glowGrad.addColorStop(1, "rgba(0, 98, 255, 0)");

      ctx.strokeStyle = glowGrad;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw crisp line
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
      lineGrad.addColorStop(0, "rgba(0, 98, 255, 0)");
      lineGrad.addColorStop(0.08, "rgba(0, 98, 255, 0.7)");
      lineGrad.addColorStop(0.5, "rgba(0, 98, 255, 1)");
      lineGrad.addColorStop(0.92, "rgba(0, 98, 255, 0.7)");
      lineGrad.addColorStop(1, "rgba(0, 98, 255, 0)");

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [mode, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full ${className}`}
      style={{ height: "16px" }}
      aria-hidden="true"
    />
  );
}
