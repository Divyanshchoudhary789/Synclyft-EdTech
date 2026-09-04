"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Users,
  BarChart3,
  Target,
  ShieldCheck,
  LineChart,
  FileText,
  Layers,
  Megaphone,
  Sparkles,
  CalendarClock,
  Check,
  GraduationCap,
  Building2,
  UploadCloud,
  ClipboardCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Logo } from "@synclyft/ui/components/Logo";
import { Button } from "@synclyft/ui/components/Button";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import { subscriptionService } from "@synclyft/lib/api/services";

/* ────────────────────────────────────────────────────────────────────────────
   Small scroll-reveal wrapper. Pure CSS transition toggled by an
   IntersectionObserver — no framer mount state, so it can never freeze at
   opacity:0 on a back-navigation. A timer fallback reveals it regardless.
   ──────────────────────────────────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    const fallback = setTimeout(() => setShown(true), 1400);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity 520ms ease ${delay}ms, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── constants ──────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const CAPABILITY_STATS: { value: number | null; display?: string; suffix?: string; label: string; sub: string }[] = [
  { value: 4, label: "Interview rounds", sub: "Aptitude, Coding, Technical & HR — each one proctored and auto-scored" },
  { value: 6, label: "Readiness bands", sub: "From “Exceptional” to “Critical”, tracked per student and per batch" },
  { value: 100, suffix: "%", label: "Proctored mocks", sub: "Camera, audio and on-screen object detection on every session" },
  { value: null, display: "1-click", label: "Board-ready reports", sub: "Placement-cell PDF & CSV exports — no more spreadsheet nights" },
];

const TOUR = [
  {
    key: "roster",
    icon: Users,
    tab: "Roster",
    title: "Every student in one roster",
    body: "Bulk-import batches, then see interview readiness, round-wise scores and last-active status for each student at a glance — even the ones who haven't started yet.",
    points: [
      "Import by batch, branch and graduation year",
      "Readiness score + round breakdown per student",
      "“Not onboarded” flags so nobody slips through",
      "Deep-dive drawer: radar, score history, recent mocks",
    ],
  },
  {
    key: "benchmark",
    icon: BarChart3,
    tab: "Benchmarking",
    title: "Benchmark batches side by side",
    body: "Compare cohorts, branches and graduation years on one screen. An AI comparative report tells you what's actually driving the gap — so you spot the bottom quartile before recruiters do.",
    points: [
      "Compare up to 4 batches at once",
      "Readiness distribution across all six bands",
      "AI comparative narrative report",
      "Trend lines updated as students practice",
    ],
  },
  {
    key: "campaigns",
    icon: Megaphone,
    tab: "Campaigns",
    title: "Run placement drives end to end",
    body: "Build a drive with its own round configuration and deadline, assign it to whole batches or hand-picked students, and track exactly who attempted and how they did.",
    points: [
      "Custom round config + deadline per drive",
      "Assign to batches or specific students",
      "Notify toggle — students get an inbox alert",
      "Results view: attempts, top and low performers",
    ],
  },
  {
    key: "proctoring",
    icon: ShieldCheck,
    tab: "Proctoring",
    title: "Data your management will trust",
    body: "Every mock is camera, audio and object proctored with a calibrated engine that flags real anomalies without punishing honest candidates. The risk dashboard breaks it down by batch.",
    points: [
      "Face, voice, phone and multi-person detection",
      "Per-batch risk dashboard + flag breakdown",
      "Disqualification and integrity-score view",
      "Readiness numbers that hold up in a review",
    ],
  },
  {
    key: "insights",
    icon: Sparkles,
    tab: "AI insights",
    title: "Ask your cohort anything",
    body: "Type a question in plain English and get an answer grounded in your real cohort data — not a generic chatbot. Plus ready-made lists of placement-ready and at-risk students.",
    points: [
      "Natural-language queries over live cohort data",
      "Placement-ready candidate shortlist",
      "Declining-student alerts with score drop",
      "Targeted workshop recommendations",
    ],
  },
  {
    key: "reports",
    icon: FileText,
    tab: "Reports",
    title: "Board-ready in one click",
    body: "Export placement-cell reports as PDF or CSV whenever you need them — batch-wide or per student. Schedule follow-ups and apply manual score overrides right from the same screen.",
    points: [
      "Batch, student and organisation reports",
      "PDF + CSV, generated on demand",
      "Per-student follow-up scheduler",
      "Manual score overrides with an audit trail",
    ],
  },
] as const;

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Get your cell approved",
    body: "Register with your official institute email. The Synclyft team verifies your placement cell and provisions your organisation account.",
  },
  {
    icon: UploadCloud,
    title: "Import your cohort",
    body: "Bulk-add students by batch, branch and graduation year, then allocate seats from your subscription. No CSV gymnastics.",
  },
  {
    icon: ClipboardCheck,
    title: "Students practise, proctored",
    body: "Candidates take four adaptive rounds — camera and audio proctored — and every attempt is scored and analysed automatically.",
  },
  {
    icon: Target,
    title: "Act on the data",
    body: "Benchmark batches, flag at-risk students, assign interventions and export a board-ready report — all before the next review.",
  },
];

const FEATURES = [
  { icon: Users, title: "Every student, one roster", body: "Onboard batches in bulk. Readiness, round-wise scores and last-active status for each student at a glance." },
  { icon: BarChart3, title: "Batch benchmarking", body: "Compare cohorts, branches and graduation years. Spot the bottom quartile before recruiters do." },
  { icon: Megaphone, title: "Placement campaigns", body: "Configure a drive, assign it to batches or individuals, and track attempts and outcomes in one place." },
  { icon: ShieldCheck, title: "Proctored, credible data", body: "Camera + audio + object proctoring on every mock, with a calibrated engine that avoids false positives." },
  { icon: LineChart, title: "Placement intelligence", body: "Readiness trends, drive outcomes and predictive placement scores, updated as students practise." },
  { icon: Sparkles, title: "Natural-language queries", body: "Ask a question about your cohort in plain English and get an answer grounded in real data." },
  { icon: CalendarClock, title: "Follow-ups & overrides", body: "Schedule per-student follow-ups and apply manual score corrections with a full audit trail." },
  { icon: Layers, title: "Seat management", body: "Allocate and reclaim seats against your subscription as batches graduate and new ones join." },
  { icon: FileText, title: "Board-ready reports", body: "Export placement-cell reports as PDF or CSV in a click — no more manual spreadsheets." },
];

const FAQS = [
  {
    q: "Who is the college portal for?",
    a: "Placement cells, training & placement officers and department coordinators at engineering and management institutes. One organisation account covers your whole team, with role-based access.",
  },
  {
    q: "How do students get access?",
    a: "You allocate seats from your subscription and add students by batch. Seated students get full access to all four interview rounds at no personal cost — their practice data flows straight back to your dashboards.",
  },
  {
    q: "Is the readiness data reliable enough to report upward?",
    a: "Yes. Every mock interview is camera, audio and object proctored by a calibrated engine, and each attempt is scored round by round. The risk dashboard shows you exactly how clean the data is for any batch.",
  },
  {
    q: "Can we run our own placement drives on it?",
    a: "You can build a campaign with its own round configuration and deadline, assign it to whole batches or specific students, notify them, and then review attempts, top performers and students who need a push.",
  },
  {
    q: "What can we export?",
    a: "Batch, per-student and organisation-level performance reports as PDF or CSV, generated on demand. AI comparative reports between batches are available on the Pro and Enterprise plans.",
  },
  {
    q: "How is pricing structured?",
    a: "By student seats and feature tier, billed monthly or yearly (yearly saves roughly 17%). The live plans below are pulled straight from our billing catalogue.",
  },
];

/* ── pricing (real org catalogue) ──────────────────────────────────────── */

type RawPlan = {
  name?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  seats?: number;
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const PLAN_META: Record<string, { desc: string; highlighted?: boolean; cta: string }> = {
  BASIC: { desc: "For placement cells piloting data-driven prep with a single batch.", cta: "Request access" },
  PRO: { desc: "For active placement teams running drives across the whole cohort.", highlighted: true, cta: "Request access" },
  ENTERPRISE: { desc: "For universities that need unlimited scale, custom integrations and branding.", cta: "Contact sales" },
};

function planFeatures(p: RawPlan): string[] {
  const f = p.features ?? {};
  const mi = p.limits?.mockInterviewsPerMonth;
  const out: string[] = [];
  if (p.seats) out.push(`Up to ${p.seats.toLocaleString("en-IN")} student seats`);
  out.push(mi !== undefined && mi < 0 ? "Unlimited mock interviews" : `${mi ?? 0} mock interviews / month`);
  out.push("Officer portal with batch analytics");
  if (f.studentReports) out.push("Batch & student PDF / CSV reports");
  if (f.batchManagement) out.push("Batch management & placement campaigns");
  if (f.proctoring) out.push("Camera + audio proctored assessments");
  if (f.aiEvaluation) out.push("AI round-by-round evaluation");
  if (f.advancedAnalytics) out.push("Advanced cohort analytics");
  if (f.placementIntelligence) out.push("Placement intelligence & AI insights");
  if (f.apiAccess) out.push("API access");
  if (f.customBranding) out.push("Custom branding");
  return out;
}

interface PlanCard {
  key: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  cta: string;
  highlighted: boolean;
  features: string[];
}

function buildCards(map: Record<string, RawPlan>, billing: "monthly" | "yearly"): PlanCard[] {
  const order = ["BASIC", "PRO", "ENTERPRISE"];
  return Object.entries(map)
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([key, p]) => {
      const monthly = p.monthlyPrice ?? 0;
      const yearly = p.yearlyPrice ?? monthly * 12;
      return {
        key,
        name: p.name || key,
        price: billing === "monthly" ? inr(monthly) : inr(yearly),
        period: billing === "monthly" ? "/ month" : "/ year",
        desc: PLAN_META[key]?.desc ?? "",
        cta: PLAN_META[key]?.cta ?? "Request access",
        highlighted: Boolean(PLAN_META[key]?.highlighted),
        features: planFeatures(p),
      };
    });
}

/* ── hero preview (illustrative) ───────────────────────────────────────── */

const TREND = [
  { m: "Apr", v: 54 },
  { m: "May", v: 58 },
  { m: "Jun", v: 61 },
  { m: "Jul", v: 66 },
  { m: "Aug", v: 70 },
  { m: "Sep", v: 72 },
];
const BANDS = [
  { label: "Exceptional", v: 8, c: "#149A5C" },
  { label: "Strong", v: 21, c: "#3DDC84" },
  { label: "On track", v: 32, c: "#0062FF" },
  { label: "Developing", v: 24, c: "#B7791F" },
  { label: "At risk", v: 14, c: "#D64545" },
];

function HeroPreview() {
  return (
    <div
      className="w-full rounded-2xl border p-4 shadow-xl sm:p-5"
      style={{ backgroundColor: "var(--th-card-bg-alt)", borderColor: "var(--th-card-border)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}>
            <BarChart3 size={14} style={{ color: "var(--th-primary)" }} />
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Cohort readiness</p>
            <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>CSE 2026 · 312 students</p>
          </div>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}
        >
          Illustrative preview
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "Avg readiness", v: "72" },
          { k: "Ready rate", v: "61%" },
          { k: "At risk", v: "14" },
        ].map((t) => (
          <div key={t.k} className="rounded-lg border p-2.5" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)" }}>
            <p className="whitespace-nowrap text-[9px] uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>{t.k}</p>
            <p className="mt-0.5 text-lg font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>{t.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 h-[104px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0062FF" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0062FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 9, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: "var(--th-border-strong)" }}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid var(--th-card-border)",
                background: "var(--th-card-bg-alt)",
                color: "var(--th-text-primary)",
              }}
            />
            <Area type="monotone" dataKey="v" stroke="#0062FF" strokeWidth={2} fill="url(#heroArea)" name="Avg readiness" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-1.5">
        {BANDS.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px]" style={{ color: "var(--th-text-muted)" }}>{b.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
              <span className="block h-full rounded-full" style={{ width: `${b.v * 2.6}%`, backgroundColor: b.c }} />
            </span>
            <span className="w-5 shrink-0 text-right text-[10px] font-semibold" style={{ color: "var(--th-text-secondary)" }}>{b.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── tour visuals ──────────────────────────────────────────────────────── */

function TourVisual({ tabKey }: { tabKey: string }) {
  const shell = "rounded-xl border p-4 h-full";
  const shellStyle = { borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg-alt)" } as const;

  if (tabKey === "benchmark") {
    const data = [
      { b: "CSE", v: 74 },
      { b: "ECE", v: 66 },
      { b: "ME", v: 58 },
      { b: "CE", v: 52 },
    ];
    return (
      <div className={shell} style={shellStyle}>
        <p className="mb-2 text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>Avg readiness by branch</p>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="b" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--th-hover-bg)" }}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--th-card-border)", background: "var(--th-card-bg-alt)", color: "var(--th-text-primary)" }}
              />
              <Bar dataKey="v" radius={[5, 5, 0, 0]} name="Readiness">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.v >= 65 ? "#0062FF" : d.v >= 55 ? "#B7791F" : "#D64545"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (tabKey === "proctoring") {
    return (
      <div className={`${shell} flex flex-col items-center justify-center`} style={shellStyle}>
        <div className="relative grid h-28 w-28 place-items-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--th-bg-secondary)" strokeWidth="12" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#149A5C" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${0.91 * 327} 327`} />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>91%</p>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>clean</p>
          </div>
        </div>
        <div className="mt-3 grid w-full grid-cols-3 gap-2 text-center">
          {[["Flagged", "18"], ["Disqualified", "3"], ["Reviewed", "312"]].map(([k, v]) => (
            <div key={k}>
              <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{v}</p>
              <p className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{k}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tabKey === "insights") {
    return (
      <div className={shell} style={shellStyle}>
        <div className="mb-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px]" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
          <Sparkles size={12} style={{ color: "var(--th-primary)" }} />
          Which students dropped the most this month?
        </div>
        {[
          ["A. Verma", "−18", "CSE"],
          ["R. Nair", "−12", "ECE"],
          ["S. Iqbal", "−9", "ME"],
        ].map(([n, d, br]) => (
          <div key={n} className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "var(--th-border)" }}>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>{n}</p>
              <p className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{br}</p>
            </div>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "color-mix(in srgb, #D64545 14%, transparent)", color: "#D64545" }}>{d}</span>
          </div>
        ))}
      </div>
    );
  }

  if (tabKey === "campaigns") {
    return (
      <div className={shell} style={shellStyle}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>Amazon SDE drive</p>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 14%, transparent)", color: "var(--th-primary)" }}>Active</span>
        </div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--th-text-faint)" }}>Aptitude · Coding · Technical — closes in 4 days</p>
        <div className="mt-3 space-y-2">
          {[["Assigned", "180"], ["Attempted", "124"], ["Cleared bar", "47"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--th-text-muted)" }}>{k}</span>
              <span className="font-semibold" style={{ color: "var(--th-text-primary)" }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
          <div className="h-full rounded-full" style={{ width: "69%", backgroundColor: "var(--th-primary)" }} />
        </div>
      </div>
    );
  }

  if (tabKey === "reports") {
    return (
      <div className={`${shell} flex flex-col`} style={shellStyle}>
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: "var(--th-primary)" }} />
          <p className="text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>Placement readiness — CSE 2026.pdf</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {[90, 70, 78, 55, 84].map((w, i) => (
            <div key={i} className="h-2 rounded" style={{ width: `${w}%`, backgroundColor: "var(--th-bg-secondary)" }} />
          ))}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <span className="rounded-md border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>PDF</span>
          <span className="rounded-md border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>CSV</span>
        </div>
      </div>
    );
  }

  // roster (default)
  const rows = [
    ["Aditi Rao", "CSE", 86, "#149A5C"],
    ["Kabir Shah", "ECE", 64, "#B7791F"],
    ["Meera Das", "CSE", 78, "#3DDC84"],
    ["Ravi Kant", "ME", 41, "#D64545"],
  ] as const;
  return (
    <div className={shell} style={shellStyle}>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b pb-2 text-[9px] font-semibold uppercase tracking-wide" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
        <span>Student</span><span>Branch</span><span>Ready</span>
      </div>
      {rows.map(([n, br, sc, c]) => (
        <div key={n} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b py-2 text-[11px] last:border-0" style={{ borderColor: "var(--th-border)" }}>
          <span className="font-medium" style={{ color: "var(--th-text-primary)" }}>{n}</span>
          <span style={{ color: "var(--th-text-muted)" }}>{br}</span>
          <span className="rounded px-1.5 py-0.5 text-right font-bold" style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` }}>{sc}</span>
        </div>
      ))}
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function OfficerLanding() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [catalog, setCatalog] = useState<Record<string, RawPlan> | null>(null);
  const [statsIn, setStatsIn] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    subscriptionService
      .orgPlans()
      .then((m) => {
        if (!cancelled) setCatalog(m as Record<string, RawPlan>);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStatsIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    const t = setTimeout(() => setStatsIn(true), 1600);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const cards = useMemo(() => (catalog ? buildCards(catalog, billing) : []), [catalog, billing]);
  const active = TOUR[tab];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        @keyframes tourSwap { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .tour-swap { animation: tourSwap 260ms cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) { .tour-swap { animation: none; } }
      `}</style>
      {/* ── nav ── */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{ backgroundColor: "var(--th-nav-bg)", borderColor: "var(--th-nav-border)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Synclyft <span style={{ color: "var(--th-text-faint)" }}>for Colleges</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex xl:gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm transition-colors hover:opacity-80" style={{ color: "var(--th-text-secondary)" }}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle size="sm" />
            <Link href="/login" className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm">
                Request access <ArrowRight size={14} />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              className="grid h-9 w-9 place-items-center rounded-lg border"
              style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t lg:hidden"
              style={{ borderColor: "var(--th-nav-border)", backgroundColor: "var(--th-nav-bg)" }}
            >
              <div className="space-y-1 px-4 py-3">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm"
                    style={{ color: "var(--th-text-secondary)" }}
                  >
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 pt-2">
                  <Link href="/login" className="flex-1">
                    <Button size="sm" variant="ghost" className="w-full">Sign in</Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button size="sm" className="w-full">Request access</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ── hero ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--th-hero-grad)" }} />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)", color: "var(--th-text-secondary)" }}
              >
                <GraduationCap size={13} style={{ color: "var(--th-primary)" }} />
                Built for placement cells
              </span>
              <h1
                className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-4xl md:text-[3.4rem]"
                style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
              >
                Run your placement drive on data, not guesswork.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: "var(--th-text-secondary)" }}>
                Synclyft gives your placement cell a live command centre — every student&apos;s interview readiness,
                benchmarked across batches, with proctored mocks and AI-driven interventions that actually move the numbers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full justify-center sm:w-auto">
                    Request access <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="w-full justify-center sm:w-auto">Sign in to portal</Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: ShieldCheck, label: "4 proctored rounds" },
                  { icon: BarChart3, label: "AI batch reports" },
                  { icon: FileText, label: "1-click board exports" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--th-text-muted)" }}>
                    <Icon size={13} style={{ color: "var(--th-primary)" }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <Reveal delay={80}>
              <HeroPreview />
            </Reveal>
          </div>
        </section>

        {/* ── capability stats ── */}
        <section ref={statsRef} className="border-y" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-stats-bg)" }}>
          <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-6 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4">
            {CAPABILITY_STATS.map((s) => (
              <div key={s.label}>
                <div
                  className="text-[2.1rem] font-bold leading-none tracking-tight"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-primary)" }}
                >
                  {s.value !== null ? (
                    statsIn ? <CountUp end={s.value} suffix={s.suffix ?? ""} /> : `0${s.suffix ?? ""}`
                  ) : (
                    s.display
                  )}
                </div>
                <div className="mt-2 text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{s.label}</div>
                <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── product tour ── */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
              Inside the portal
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              One console for the whole placement cycle.
            </h2>
          </Reveal>

          {/* tab bar — wraps to a chip cloud on small screens */}
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {TOUR.map((t, i) => {
              const Icon = t.icon;
              const on = i === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(i)}
                  className="relative flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:px-4"
                  style={{
                    color: on ? "#fff" : "var(--th-text-secondary)",
                    backgroundColor: on ? "var(--th-primary)" : "var(--th-surface)",
                    borderColor: on ? "var(--th-primary)" : "var(--th-border)",
                  }}
                >
                  {on && (
                    <motion.span
                      layoutId="tourPill"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: "var(--th-primary)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon size={13} />
                    {t.tab}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            key={active.key}
            className="grid gap-6 rounded-2xl border p-6 tour-swap sm:p-8 lg:grid-cols-2 lg:items-center"
            style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
          >
            <div>
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}>
                <active.icon size={18} style={{ color: "var(--th-primary)" }} />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                {active.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{active.body}</p>
              <ul className="mt-5 space-y-2.5">
                {active.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--th-text-secondary)" }}>
                    <Check size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: "var(--th-primary)" }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-h-[240px]">
              <TourVisual tabKey={active.key} />
            </div>
          </div>
        </section>

        {/* ── how it works ── */}
        <section id="how" className="border-y" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Live in a week, not a semester.
              </h2>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 70}>
                  <div className="relative h-full rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    <span
                      className="absolute right-4 top-4 text-2xl font-bold tabular-nums"
                      style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "color-mix(in srgb, var(--th-primary) 22%, transparent)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}>
                      <s.icon size={18} style={{ color: "var(--th-primary)" }} />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── features ── */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
              Everything the cell needs
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              From roster to board report.
            </h2>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 60}>
                <div
                  className="group h-full rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1"
                  style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl transition-colors"
                    style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-primary)" }}
                  >
                    <f.icon size={18} className="transition-transform duration-200 group-hover:scale-110" style={{ color: "var(--th-primary)" }} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── pricing ── */}
        <section id="pricing" className="border-y" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal className="mx-auto mb-8 max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                Transparent pricing
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Priced by seats, billed your way.
              </h2>
              <p className="mt-3 text-sm" style={{ color: "var(--th-text-muted)" }}>
                Pulled live from our billing catalogue. All plans include a 14-day trial and onboarding support.
              </p>
            </Reveal>

            <div className="mb-10 flex justify-center">
              <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)" }}>
                {(["monthly", "yearly"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                    style={billing === b ? { backgroundColor: "var(--th-primary)", color: "#fff" } : { color: "var(--th-text-muted)" }}
                  >
                    {b === "yearly" ? "Yearly · save ~17%" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>

            {cards.length === 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[420px] animate-pulse rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }} />
                ))}
              </div>
            ) : (
              <div className="grid items-stretch gap-6 md:grid-cols-3">
                {cards.map((p) => (
                  <div
                    key={p.key}
                    className="relative flex flex-col rounded-2xl border p-6 lg:p-7"
                    style={{
                      borderColor: p.highlighted ? "var(--th-primary)" : "var(--th-card-border)",
                      backgroundColor: "var(--th-card-bg)",
                      boxShadow: p.highlighted ? "0 12px 40px color-mix(in srgb, var(--th-primary) 16%, transparent)" : "none",
                    }}
                  >
                    {p.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: "var(--th-primary)" }}>
                        Most popular
                      </span>
                    )}
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{p.name}</div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                        {p.price}
                      </span>
                      <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>{p.period}</span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{p.desc}</p>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                          <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: "var(--th-primary)" }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/register" className="mt-6">
                      <Button className="w-full" variant={p.highlighted ? "primary" : "secondary"}>
                        {p.cta}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-8 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              Prices in INR, taxes as applicable. Seats can be reallocated as batches graduate.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
              Questions
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Answers for placement teams.
            </h2>
          </Reveal>

          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const open = faq === i;
              return (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border transition-colors"
                  style={{ borderColor: open ? "var(--th-primary)" : "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
                >
                  <button
                    onClick={() => setFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-semibold"
                    style={{ color: "var(--th-text-primary)" }}
                  >
                    {item.q}
                    <ChevronDown size={16} className="shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none", color: "var(--th-text-muted)" }} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="px-4 pb-4 text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── final CTA ── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl border px-5 py-12 text-center sm:px-12 sm:py-14"
              style={{ borderColor: "var(--th-card-border)", background: "var(--th-hero-grad)" }}
            >
              <Building2 size={22} className="mx-auto mb-4" style={{ color: "var(--th-primary)" }} />
              <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight md:text-3xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Bring your whole batch to interview-ready.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                College accounts are approved by the Synclyft team. Register with your official institute email and
                we&apos;ll get your placement cell set up.
              </p>
              <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full justify-center sm:w-auto">
                    Request access <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="w-full justify-center sm:w-auto">Sign in to portal</Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="border-t" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-footer-bg)" }}>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={22} />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Synclyft <span style={{ color: "var(--th-text-faint)" }}>for Colleges</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: "var(--th-text-muted)" }}>
              <a href="#features" className="hover:opacity-80">Features</a>
              <a href="#pricing" className="hover:opacity-80">Pricing</a>
              <a href="#faq" className="hover:opacity-80">FAQ</a>
              <Link href="/login" className="hover:opacity-80">Portal sign in</Link>
              <a href="https://synclyft.in" className="hover:opacity-80">Main site</a>
            </div>
          </div>
          <div className="mt-6 border-t pt-6 text-xs" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            © {new Date().getFullYear()} Synclyft. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
