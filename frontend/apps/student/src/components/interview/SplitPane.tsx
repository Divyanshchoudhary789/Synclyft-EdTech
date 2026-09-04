"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SplitPaneProps {
  direction: "horizontal" | "vertical";
  /** first pane content (left / top) */
  first: React.ReactNode;
  /** second pane content (right / bottom) */
  second: React.ReactNode;
  /** localStorage key to remember the split ratio */
  storageKey?: string;
  /** default size of the first pane, as a percentage 0–100 */
  defaultRatio?: number;
  /** clamp: min % for the first pane */
  minFirst?: number;
  /** clamp: min % for the second pane */
  minSecond?: number;
  className?: string;
}

/**
 * A lightweight, dependency-free resizable split — the LeetCode-style draggable
 * divider between the problem and the editor, and between the editor and the
 * console. Ratio persists per `storageKey`, double-click the handle resets it.
 */
export function SplitPane({
  direction,
  first,
  second,
  storageKey,
  defaultRatio = 50,
  minFirst = 15,
  minSecond = 15,
  className = "",
}: SplitPaneProps) {
  const isH = direction === "horizontal";
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [dragging, setDragging] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!storageKey || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      const v = raw ? parseFloat(raw) : NaN;
      if (!Number.isNaN(v) && v >= minFirst && v <= 100 - minSecond) setRatio(v);
    } catch {
      /* ignore */
    }
  }, [storageKey, minFirst, minSecond]);

  const persist = useCallback(
    (v: number) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, String(v));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pos = isH ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
      const pct = Math.min(100 - minSecond, Math.max(minFirst, pos * 100));
      setRatio(pct);
    },
    [isH, minFirst, minSecond]
  );

  const stop = useCallback(() => {
    setDragging(false);
    setRatio((r) => {
      persist(r);
      return r;
    });
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [onPointerMove, persist]);

  const start = useCallback(() => {
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    document.body.style.userSelect = "none";
    document.body.style.cursor = isH ? "col-resize" : "row-resize";
  }, [onPointerMove, stop, isH]);

  useEffect(() => () => stop(), [stop]);

  const reset = () => {
    setRatio(defaultRatio);
    persist(defaultRatio);
  };

  return (
    <div
      ref={containerRef}
      className={`flex ${isH ? "flex-row" : "flex-col"} h-full w-full min-h-0 min-w-0 ${className}`}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={isH ? { width: `${ratio}%` } : { height: `${ratio}%` }}
      >
        {first}
      </div>

      <div
        role="separator"
        aria-orientation={isH ? "vertical" : "horizontal"}
        onPointerDown={start}
        onDoubleClick={reset}
        title="Drag to resize · double-click to reset"
        className={`group relative shrink-0 ${
          isH ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"
        } bg-[var(--iv-elevated)] hover:bg-[#0062FF]/40 ${dragging ? "bg-[#0062FF]/60" : ""} transition-colors`}
      >
        <div
          className={`absolute ${
            isH ? "inset-y-0 left-1/2 w-px -translate-x-1/2" : "inset-x-0 top-1/2 h-px -translate-y-1/2"
          } bg-[var(--iv-border)] group-hover:bg-[#0062FF]`}
        />
        {/* grip */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[3px] opacity-0 transition-opacity group-hover:opacity-100 ${
            isH ? "flex-col" : "flex-row"
          }`}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-[#0062FF]" />
          ))}
        </div>
      </div>

      <div
        className="min-h-0 min-w-0 overflow-hidden flex-1"
        style={isH ? { width: `${100 - ratio}%` } : { height: `${100 - ratio}%` }}
      >
        {second}
      </div>
    </div>
  );
}
