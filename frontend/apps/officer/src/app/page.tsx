"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Users,
  Target,
  ShieldCheck,
  LineChart,
  FileText,
} from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { Button } from "@synclyft/ui/components/Button";

const FEATURES = [
  {
    icon: Users,
    title: "Every student, one roster",
    body: "Onboard batches in bulk. See interview readiness, round-wise scores and last-active status for each student at a glance.",
  },
  {
    icon: BarChart3,
    title: "Batch benchmarking",
    body: "Compare cohorts, branches and graduation years. Spot the bottom quartile before recruiters do.",
  },
  {
    icon: Target,
    title: "Close the loop",
    body: "AI flags weak areas and assigns targeted practice, workshops and mock drives — then tracks whether scores actually moved.",
  },
  {
    icon: LineChart,
    title: "Placement intelligence",
    body: "Readiness trends, drive outcomes and predictive placement scores, updated as students practice.",
  },
  {
    icon: ShieldCheck,
    title: "Proctored, credible data",
    body: "Every mock interview is camera + audio proctored, so the readiness numbers you report to management hold up.",
  },
  {
    icon: FileText,
    title: "Board-ready reports",
    body: "Export placement-cell reports as PDF/CSV in a click — no more manual spreadsheets the night before a review.",
  },
];

export default function OfficerLanding() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: "color-mix(in srgb, var(--th-bg) 85%, transparent)",
          borderColor: "var(--th-border)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
            >
              Synclyft <span style={{ color: "var(--th-text-faint)" }}>for Colleges</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm"
              style={{ color: "var(--th-text-secondary)" }}
            >
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm">
                Request access <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-4xl font-semibold leading-tight md:text-6xl"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
          >
            Run your placement drive on data, not guesswork.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mx-auto mt-6 max-w-2xl text-base md:text-lg"
            style={{ color: "var(--th-text-secondary)" }}
          >
            Synclyft gives your placement cell a live command centre — every student&apos;s
            interview readiness, benchmarked across batches, with AI-driven interventions
            that actually move the numbers.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/register">
              <Button size="lg">
                Request access <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost">
                Sign in to portal
              </Button>
            </Link>
          </motion.div>
        </section>

        <section
          className="border-y py-16"
          style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}
        >
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border p-5"
                style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg)" }}
              >
                <f.icon size={20} style={{ color: "var(--th-primary)" }} />
                <h3
                  className="mt-3 text-sm font-semibold"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
                >
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm" style={{ color: "var(--th-text-secondary)" }}>
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2
            className="text-2xl font-semibold md:text-3xl"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
          >
            Bring your whole batch to interview-ready.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm" style={{ color: "var(--th-text-secondary)" }}>
            College accounts are approved by the Synclyft team. Register with your official
            institute email and we&apos;ll get your placement cell set up.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg">
              Request access <ArrowRight size={16} />
            </Button>
          </Link>
        </section>
      </main>

      <footer
        className="border-t py-8"
        style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} Synclyft. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="https://synclyft.in" style={{ color: "inherit" }}>Main site</a>
            <Link href="/login" style={{ color: "inherit" }}>Portal sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
