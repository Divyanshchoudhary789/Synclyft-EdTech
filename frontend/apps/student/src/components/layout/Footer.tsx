"use client";

import Link from "next/link";
import { Logo } from "@synclyft/ui/components/Logo";
import { ArrowUp, ArrowRight, Heart } from "lucide-react";

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/synclyft/posts/?feedView=all",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/SynclyftAI",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="h-4 w-4">
        <path d="M18.901 1.153H22.58l-8.03 9.179L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.59-9.817L0 1.153h7.594l5.243 6.932L18.9 1.153zm-1.296 19.482h2.046L6.482 3.26H4.287l13.318 17.375z" />
      </svg>
    ),
  },
];

const PLATFORM_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQs", href: "/#faqs" },
  { label: "Sign in", href: "/login" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "For colleges", href: process.env.NEXT_PUBLIC_OFFICER_URL || "/pricing" },
  { label: "Contact", href: "mailto:support@synclyft.in" },
];

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className="relative overflow-hidden border-t"
      style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-footer-bg)" }}
    >
      <div
        className="pointer-events-none absolute -bottom-48 left-1/3 -z-10 h-96 w-96 rounded-full blur-[120px]"
        style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 6%, transparent)" }}
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] lg:gap-8">
          {/* Brand */}
          <div className="space-y-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <Logo size={30} className="transition-transform duration-300 group-hover:scale-105" />
              <span
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
              >
                Synclyft AI
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
              Adaptive mock interviews, real proctoring and readiness analytics — built for campus placements.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="rounded-lg border p-2 transition-colors hover:border-[color:var(--th-primary)] hover:text-[color:var(--th-primary)]"
                  style={{ backgroundColor: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-primary)" }}>
              Platform
            </h3>
            <ul className="space-y-3 text-sm">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-[color:var(--th-primary)]" style={{ color: "var(--th-text-secondary)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-primary)" }}>
              Company
            </h3>
            <ul className="space-y-3 text-sm">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="transition-colors hover:text-[color:var(--th-primary)]" style={{ color: "var(--th-text-secondary)" }}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
          >
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Your first mock is free
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
              3 mock interviews, 2 AI evaluations and a PDF report on the trial — no card needed.
            </p>
            <Link
              href="/register"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              Create free account <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs md:flex-row"
          style={{ borderColor: "var(--th-border)" }}
        >
          <div className="flex flex-col items-center gap-1.5 md:items-start" style={{ color: "var(--th-text-muted)" }}>
            <span>© {new Date().getFullYear()} Synclyft AI. All rights reserved.</span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--th-text-faint)" }}>
              Made with <Heart size={10} className="fill-current" style={{ color: "#FF5C5C" }} /> for candidates.
            </span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors hover:border-[color:var(--th-primary)] hover:text-[color:var(--th-primary)]"
            style={{ backgroundColor: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
          >
            Back to top <ArrowUp size={12} />
          </button>
        </div>
      </div>
    </footer>
  );
}
