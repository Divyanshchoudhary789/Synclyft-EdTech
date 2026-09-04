"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Size = "sm" | "md" | "lg" | "xl" | "2xl";

const MAX_W: Record<Size, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
  "2xl": "sm:max-w-4xl",
};

/**
 * Centred overlay modal. Header pinned, body scrolls, footer optional.
 * - closes on backdrop click + Escape
 * - locks body scroll
 * - fades/zooms in on open, out on close
 * - on phones it fills the width and docks to the bottom (sheet-like)
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  size = "lg",
  hero,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  size?: Size;
  /** full-bleed banner rendered above the scrollable body (no padding) */
  hero?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setMounted(true);
      // Next frame for the transition — but a timer fallback too, because rAF is
      // heavily throttled in unfocused / background tabs and would otherwise
      // leave the modal stuck invisible.
      const raf = requestAnimationFrame(() => setShow(true));
      const t = setTimeout(() => setShow(true), 30);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }
    setShow(false);
    closeTimer.current = setTimeout(() => setMounted(false), 180);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden border shadow-2xl transition-all duration-200 ease-out
          rounded-t-2xl sm:rounded-2xl ${MAX_W[size]}
          ${show ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:translate-y-0 sm:scale-[0.97]"}`}
        style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
      >
        {/* mobile grab handle */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full" style={{ backgroundColor: "var(--th-border-strong)" }} />
        </div>

        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-3.5 sm:px-6 sm:py-4"
          style={{ borderColor: "var(--th-border)" }}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2
                className="truncate text-sm font-bold sm:text-base"
                style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--th-text-faint)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerRight}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              style={{ color: "var(--th-text-faint)" }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {hero}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-5 py-3.5 sm:px-6 sm:py-4"
            style={{ borderColor: "var(--th-border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Two-column label / value row for detail modals. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="shrink-0" style={{ color: "var(--th-text-faint)" }}>
        {label}
      </span>
      <span className="min-w-0 break-words text-right" style={{ color: "var(--th-text-primary)" }}>
        {children}
      </span>
    </div>
  );
}
