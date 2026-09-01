"use client";

import { Logo } from "@synclyft/ui/components/Logo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FirstNav() {
  return (
    <nav
      className="sticky top-0 z-50 mx-auto w-[100%] max-w-[100%] backdrop-blur-sm shadow-sm transition-all"
      style={{ backgroundColor: "transparent", border: "1px solid var(--th-nav-border)" }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-semibold text-m" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Synclyft AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {["Features", "Pricing", "About"].map((item) => (
            <Link
              key={item}
              href={item === "Pricing" ? "/subscription" : `/${item.toLowerCase()}`}
              className="px-3 py-1.5 rounded-full text-l font-large transition-all duration-200"
              style={{ color: "var(--th-text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 98, 255, 0.06)";
                e.currentTarget.style.color = "#0062FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--th-text-muted)";
              }}
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">

          <Link
            href="/login"
            className="text-m transition-colors px-3 py-1.5 rounded-full"
            style={{ color: "var(--th-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 98, 255, 0.06)";
              e.currentTarget.style.color = "#0062FF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--th-text-muted)";
            }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-primary font-semibold bg-[#0062FF] hover:bg-[#004BE6] text-[#FFFFFF] px-4 py-2 text-l rounded-full shadow-sm shadow-[#0062FF]/10 transition-all hover:shadow-[#0062FF]/20"
          >
            Get started <ArrowRight size={12} className="inline ml-1" />
          </Link>
        </div>
      </div>
    </nav>
  )
}