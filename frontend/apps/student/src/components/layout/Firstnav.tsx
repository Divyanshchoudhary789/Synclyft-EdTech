"use client";

import { Logo } from "@synclyft/ui/components/Logo";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuthStore } from "@synclyft/lib/store/auth";

const SECTIONS = [
  { label: "Features", id: "features" },
  { label: "How it works", id: "how" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faqs" },
];

export default function FirstNav() {
  const pathname = usePathname();
  const onLanding = pathname === "/";
  const { isAuthenticated, fetchUser } = useAuthStore();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Real data: know whether this visitor is signed in, so the CTA can send them
  // straight to their dashboard instead of the sign-up flow.
  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy — highlight the section link the reader is currently in.
  useEffect(() => {
    if (!onLanding) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.6, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [onLanding]);

  // Lock scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const linkHref = (id: string) => (onLanding ? `#${id}` : `/#${id}`);
  const solid = scrolled || open || !onLanding;

  return (
    <nav
      className="sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300"
      style={{
        backgroundColor: solid ? "var(--th-nav-bg)" : "transparent",
        borderBottom: `1px solid ${solid ? "var(--th-nav-border)" : "transparent"}`,
        boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.05)" : "none",
        backdropFilter: solid ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <Logo size={28} className="transition-transform duration-300 group-hover:scale-105" />
          <span
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            Synclyft AI
          </span>
        </Link>

        {/* desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => {
            const active = onLanding && activeId === s.id;
            return (
              <Link
                key={s.id}
                href={linkHref(s.id)}
                className="relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ color: active ? "var(--th-primary)" : "var(--th-text-muted)" }}
              >
                {s.label}
                <span
                  className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: "var(--th-primary)",
                    opacity: active ? 1 : 0,
                    transform: active ? "scaleX(1)" : "scaleX(0.3)",
                  }}
                />
              </Link>
            );
          })}
        </div>

        {/* right cluster */}
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 sm:inline-flex"
              style={{ backgroundColor: "var(--th-primary)", boxShadow: "0 2px 10px color-mix(in srgb, var(--th-primary) 22%, transparent)" }}
            >
              <LayoutDashboard size={14} /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--th-hover-bg)] sm:inline-block"
                style={{ color: "var(--th-text-muted)" }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 sm:inline-flex"
                style={{ backgroundColor: "var(--th-primary)", boxShadow: "0 2px 10px color-mix(in srgb, var(--th-primary) 22%, transparent)" }}
              >
                Get started <ArrowRight size={13} />
              </Link>
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-lg border transition-colors md:hidden"
            style={{ borderColor: "var(--th-nav-border)", color: "var(--th-text-primary)" }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile sheet */}
      <div
        className="overflow-hidden border-t transition-[max-height,opacity] duration-300 md:hidden"
        style={{
          maxHeight: open ? "22rem" : "0",
          opacity: open ? 1 : 0,
          borderColor: open ? "var(--th-nav-border)" : "transparent",
          backgroundColor: "var(--th-nav-bg)",
        }}
      >
        <div className="space-y-1 px-4 py-3">
          {SECTIONS.map((s) => {
            const active = onLanding && activeId === s.id;
            return (
              <Link
                key={s.id}
                href={linkHref(s.id)}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--th-primary)" : "var(--th-text-secondary)",
                  backgroundColor: active ? "color-mix(in srgb, var(--th-primary) 10%, transparent)" : "transparent",
                }}
              >
                {s.label}
                {active && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--th-primary)" }} />}
              </Link>
            );
          })}
          <div className="flex gap-2 pt-2">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="flex-1">
                <span
                  className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--th-primary)" }}
                >
                  <LayoutDashboard size={14} /> Go to dashboard
                </span>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="flex-1">
                  <span
                    className="flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold"
                    style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}
                  >
                    Sign in
                  </span>
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="flex-1">
                  <span
                    className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: "var(--th-primary)" }}
                  >
                    Get started <ArrowRight size={13} />
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
