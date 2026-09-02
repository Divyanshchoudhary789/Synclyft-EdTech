"use client";

import { Logo } from "@synclyft/ui/components/Logo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export default function FirstNav() {
  return (
    <nav
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      style={{ backgroundColor: "var(--th-nav-bg)", borderColor: "var(--th-nav-border)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Synclyft AI
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--th-hover-bg)]"
              style={{ color: "var(--th-text-muted)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--th-hover-bg)]"
            style={{ color: "var(--th-text-muted)" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--th-primary)", boxShadow: "0 2px 10px color-mix(in srgb, var(--th-primary) 20%, transparent)" }}
          >
            Get started <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
