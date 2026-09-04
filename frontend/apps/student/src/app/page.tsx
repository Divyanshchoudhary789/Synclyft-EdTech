"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Brain,
  Code2,
  Terminal,
  Mic2,
  ScanFace,
  Radar as RadarIcon,
  Sparkles,
  FileText,
  BarChart3,
  Check,
  GraduationCap,
  Building2,
  Rocket,
  ClipboardCheck,
  LineChart as LineChartIcon,
  MonitorPlay,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { cn } from "@synclyft/lib/utils";
import { subscriptionService } from "@synclyft/lib/api/services";
import Firstnav from "@/components/layout/Firstnav";
import Footer from "@/components/layout/Footer";

/* ────────────────────────────────────────────────────────────────────────────
   Reveal — IntersectionObserver + CSS transition (+ timer fallback). Never
   freezes at opacity:0 the way framer mount animations can on a back-nav.
   ──────────────────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    const t = setTimeout(() => setShown(true), 1400);
    return () => {
      io.disconnect();
      clearTimeout(t);
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

const HERO_WORDS = ["Aptitude", "Coding", "Technical", "HR"];

const CAPABILITY_STATS: { value: number | null; display?: string; suffix?: string; label: string; sub: string }[] = [
  { value: 4, label: "Adaptive rounds", sub: "Aptitude, Coding, Technical and HR — one complete mock in a single sitting" },
  { value: 3, label: "Free mock interviews", sub: "Plus 2 AI evaluations and 1 PDF report on sign-up — no card required" },
  { value: 6, label: "Readiness bands", sub: "Every attempt places you from “Exceptional” down to “Needs work”" },
  { value: 100, suffix: "%", label: "AI-scored & proctored", sub: "Camera, audio and on-screen checks on every session you run" },
];

const ROUNDS = [
  {
    key: "aptitude",
    icon: Brain,
    name: "Aptitude",
    tag: "Round 1",
    blurb:
      "Quantitative, logical and verbal reasoning under real time pressure. Pick the topics you want, get a question palette, and attempt questions in any order.",
    points: [
      "Topic-wise question selection",
      "Palette to jump between questions",
      "Auto-scored the moment you submit",
      "Answer review once the timer ends",
    ],
  },
  {
    key: "coding",
    icon: Code2,
    name: "Coding",
    tag: "Round 2",
    blurb:
      "A LeetCode-style workspace — problem statement, editor and test cases in resizable panels. Run against public samples, then submit to a real sandboxed judge.",
    points: [
      "Monaco editor in your language",
      "Run public test cases before you submit",
      "Real sandbox execution via Judge0",
      "3 easy · 5 medium · 2 hard problems",
    ],
  },
  {
    key: "technical",
    icon: Terminal,
    name: "Technical",
    tag: "Round 3",
    blurb:
      "A voice AI interviewer digs into your projects and CS fundamentals, then you solve a coding problem live — discussion and hands-on in the same round.",
    points: [
      "Conversational voice persona",
      "Questions grounded in your resume",
      "Live coding after the discussion",
      "Communication and correctness both scored",
    ],
  },
  {
    key: "hr",
    icon: Mic2,
    name: "HR",
    tag: "Round 4",
    blurb:
      "A natural back-and-forth voice conversation with an AI interviewer — behavioural questions, real follow-ups, and scoring on communication, structure and clarity.",
    points: [
      "Real-time voice with genuine follow-ups",
      "Behavioural and situational questions",
      "Scored on structure and clarity",
      "Full transcript saved to your report",
    ],
  },
] as const;

const STEPS = [
  {
    icon: Rocket,
    title: "Create a free account",
    body: "Sign up with your email. Your trial includes 3 mock interviews, 2 AI evaluations and 1 PDF report — nothing to pay.",
  },
  {
    icon: ClipboardCheck,
    title: "Set up your mock",
    body: "Choose the rounds, your target role and coding language. Upload your resume so the Technical round can reference it.",
  },
  {
    icon: MonitorPlay,
    title: "Sit the interview, proctored",
    body: "Take each round back to back. Camera, audio and object checks run quietly in the background — calibrated not to flag honest candidates.",
  },
  {
    icon: LineChartIcon,
    title: "Get your readiness report",
    body: "A score, a competency radar, a trend, an AI narrative and a week-by-week study plan built from your weakest areas.",
  },
];

const REPORT_ITEMS = [
  { icon: BarChart3, title: "Readiness score & band", body: "One number, weighted across every round you took, mapped to a six-level band and a percentile." },
  { icon: RadarIcon, title: "Competency radar", body: "Communication, problem-solving, technical depth and coding — where you're strong and where you're thin." },
  { icon: Sparkles, title: "AI narrative report", body: "A written breakdown of what went well, what didn't, and the specific things to fix before your next attempt." },
  { icon: FileText, title: "Week-by-week study plan", body: "Topics, sub-topics, hours and resources — generated from your weakest areas, tracked as you complete it." },
];

const FAQS = [
  {
    q: "What exactly is a Synclyft mock interview?",
    a: "One sitting of up to four adaptive rounds — Aptitude, Coding, Technical and HR. The Technical and HR rounds use a voice AI interviewer; the Coding round runs real code against a sandboxed judge. Everything is proctored and scored automatically.",
  },
  {
    q: "Is it really free to start?",
    a: "Yes. Every new account gets 3 mock interviews, 2 AI evaluations and 1 PDF report on the trial — no card required. After that you can subscribe, or your college can allocate you a seat at no personal cost.",
  },
  {
    q: "How does the adaptive coding round work?",
    a: "You get a fixed mix of 3 easy, 5 medium and 2 hard problems. You run your solution against public sample cases in the editor, then submit for full evaluation on a real sandbox. Partial credit is given for test cases passed.",
  },
  {
    q: "What does the proctoring actually check?",
    a: "Face presence, multiple people, phone or second-screen detection, plus tab switching and paste attempts. The engine is calibrated to avoid false positives — a quick look away won't flag you.",
  },
  {
    q: "My college uses Synclyft. Do I still need my own plan?",
    a: "No. If your placement cell has allocated you a seat, you get full access to every round for free, and your results feed straight into their dashboards.",
  },
  {
    q: "What happens to my resume and interview recordings?",
    a: "Your resume is used to tailor the Technical round and your ATS analysis. Interview transcripts and scores are attached to your own report and shared with your college only if you're on their seat.",
  },
];

/* ── pricing (live catalogue) ──────────────────────────────────────────── */

type RawPlan = {
  name?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  seats?: number;
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const STUDENT_META: Record<string, { desc: string; highlighted?: boolean }> = {
  STUDENT_BASIC: { desc: "For candidates who want regular, structured practice." },
  STUDENT_PRO: { desc: "For serious candidates targeting top-tier companies.", highlighted: true },
  STUDENT_PREMIUM: { desc: "Unlimited practice for an all-in placement season." },
};
const ORG_META: Record<string, { desc: string; highlighted?: boolean }> = {
  BASIC: { desc: "For placement cells piloting data-driven prep." },
  PRO: { desc: "For teams running drives across the whole cohort.", highlighted: true },
  ENTERPRISE: { desc: "For universities that need scale and custom branding." },
};

function studentFeatures(p: RawPlan): string[] {
  const mi = p.limits?.mockInterviewsPerMonth;
  const rp = p.limits?.studentReportsPerMonth;
  const out: string[] = [];
  out.push(mi !== undefined && mi < 0 ? "Unlimited mock interviews" : `${mi ?? 0} mock interviews / month`);
  out.push("Aptitude, Coding, Technical & HR rounds");
  if (p.features?.aiEvaluation) out.push("AI evaluation & round-by-round feedback");
  out.push(rp !== undefined && rp < 0 ? "Unlimited PDF report exports" : `${rp ?? 0} PDF report exports / month`);
  out.push("Resume upload & ATS analysis");
  if (p.features?.proctoring) out.push("AI proctoring on every mock");
  if (p.features?.placementIntelligence) out.push("Placement-readiness intelligence");
  if (p.features?.advancedAnalytics) out.push("Advanced analytics & percentile");
  return out;
}
function orgFeatures(p: RawPlan): string[] {
  const out: string[] = [];
  if (p.seats) out.push(`Up to ${p.seats.toLocaleString("en-IN")} student seats`);
  out.push("Officer portal with batch analytics");
  if (p.features?.studentReports) out.push("Batch & student performance reports");
  if (p.features?.placementIntelligence) out.push("Placement intelligence & AI insights");
  if (p.features?.batchManagement) out.push("Batch management & campaigns");
  if (p.features?.proctoring) out.push("Proctored assessments");
  if (p.features?.customBranding) out.push("Custom branding");
  return out;
}

interface PlanCard {
  key: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  cta: string;
  href: string;
  highlighted: boolean;
  features: string[];
}

function buildCards(
  map: Record<string, RawPlan>,
  billing: "monthly" | "yearly",
  kind: "student" | "org",
): PlanCard[] {
  const order = kind === "student" ? ["STUDENT_BASIC", "STUDENT_PRO", "STUDENT_PREMIUM"] : ["BASIC", "PRO", "ENTERPRISE"];
  const meta = kind === "student" ? STUDENT_META : ORG_META;
  const officerUrl = process.env.NEXT_PUBLIC_OFFICER_URL;
  return Object.entries(map)
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([key, p]) => {
      const monthly = p.monthlyPrice ?? 0;
      const yearly = p.yearlyPrice ?? monthly * 12;
      return {
        key,
        name: (p.name || key).replace(/^Student /, ""),
        price: billing === "monthly" ? inr(monthly) : inr(yearly),
        period: billing === "monthly" ? "/ month" : "/ year",
        desc: meta[key]?.desc ?? "",
        cta: kind === "student" ? "Start free" : key === "ENTERPRISE" ? "Contact sales" : "Request a demo",
        href: kind === "student" ? "/register" : officerUrl ? `${officerUrl}/register` : "/register",
        highlighted: Boolean(meta[key]?.highlighted),
        features: kind === "student" ? studentFeatures(p) : orgFeatures(p),
      };
    });
}

/* ── hero preview (illustrative) ───────────────────────────────────────── */

const RADAR_DATA = [
  { k: "Communication", v: 78 },
  { k: "Problem solving", v: 64 },
  { k: "Technical", v: 71 },
  { k: "Coding", v: 58 },
  { k: "Aptitude", v: 82 },
];
const TREND = [
  { m: "Mock 1", v: 48 },
  { m: "Mock 2", v: 55 },
  { m: "Mock 3", v: 61 },
  { m: "Mock 4", v: 68 },
  { m: "Mock 5", v: 72 },
];

function HeroPreview() {
  return (
    <div
      className="w-full rounded-2xl border p-4 shadow-xl sm:p-5"
      style={{ backgroundColor: "var(--th-card-bg-alt)", borderColor: "var(--th-card-border)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}
          >
            <BarChart3 size={14} style={{ color: "var(--th-primary)" }} />
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>
              Your readiness
            </p>
            <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>
              After 5 mock interviews
            </p>
          </div>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}
        >
          Sample report
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "Readiness", v: "72" },
          { k: "Percentile", v: "84th" },
          { k: "Band", v: "Strong" },
        ].map((t) => (
          <div
            key={t.k}
            className="rounded-lg border p-2.5"
            style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)" }}
          >
            <p className="whitespace-nowrap text-[9px] uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>
              {t.k}
            </p>
            <p
              className="mt-0.5 text-base font-bold"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
            >
              {t.v}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid items-center gap-2 sm:grid-cols-[1.15fr_1fr]">
        <div className="h-[176px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={RADAR_DATA} outerRadius="70%" margin={{ top: 6, right: 18, bottom: 6, left: 18 }}>
              <PolarGrid stroke="var(--th-border)" />
              <PolarAngleAxis dataKey="k" tick={{ fontSize: 8.5, fill: "var(--th-text-faint)" }} />
              <Radar dataKey="v" stroke="#0062FF" fill="#0062FF" fillOpacity={0.28} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>
            Readiness over time
          </p>
          <div className="h-[132px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3DDC84" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3DDC84" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fontSize: 8, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} interval={1} />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid var(--th-card-border)",
                    background: "var(--th-card-bg-alt)",
                    color: "var(--th-text-primary)",
                  }}
                />
                <Area type="monotone" dataKey="v" name="Readiness" stroke="#3DDC84" strokeWidth={2} fill="url(#heroTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── round visuals ─────────────────────────────────────────────────────── */

function RoundVisual({ roundKey }: { roundKey: string }) {
  const shell = "rounded-xl border p-4 h-full";
  const shellStyle = { borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg-alt)" } as const;

  if (roundKey === "coding") {
    return (
      <div className={`${shell} font-mono`} style={shellStyle}>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#D64545" }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#B7791F" }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#149A5C" }} />
          <span className="ml-2 text-[10px]" style={{ color: "var(--th-text-faint)" }}>two-sum.py</span>
        </div>
        <pre className="text-[10px] leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
{`def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target-n], i]
        seen[n] = i`}
        </pre>
        <div className="mt-3 space-y-1">
          {[["Sample 1", true], ["Sample 2", true], ["Hidden 1", true], ["Hidden 2", false]].map(([n, ok]) => (
            <div key={n as string} className="flex items-center justify-between text-[10px]">
              <span style={{ color: "var(--th-text-muted)" }}>{n as string}</span>
              <span style={{ color: ok ? "#149A5C" : "#D64545" }}>{ok ? "passed" : "failed"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (roundKey === "aptitude") {
    return (
      <div className={shell} style={shellStyle}>
        <p className="text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>Question palette</p>
        <div className="mt-2 grid grid-cols-8 gap-1.5">
          {Array.from({ length: 24 }).map((_, i) => {
            const state = i < 9 ? "done" : i === 9 ? "current" : i < 12 ? "seen" : "todo";
            const bg =
              state === "done" ? "#149A5C" : state === "current" ? "var(--th-primary)" : state === "seen" ? "var(--th-border-strong)" : "var(--th-bg-secondary)";
            return <span key={i} className="aspect-square rounded" style={{ backgroundColor: bg }} />;
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[9px]" style={{ color: "var(--th-text-faint)" }}>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "#149A5C" }} /> Answered</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "var(--th-primary)" }} /> Current</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "var(--th-border-strong)" }} /> Seen</span>
        </div>
      </div>
    );
  }

  if (roundKey === "technical") {
    return (
      <div className={shell} style={shellStyle}>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 14%, transparent)" }}>
            <ScanFace size={15} style={{ color: "var(--th-primary)" }} />
          </span>
          <div className="flex-1">
            <div className="flex items-end gap-0.5">
              {[6, 12, 8, 16, 10, 14, 7, 13, 9].map((h, i) => (
                <span key={i} className="w-1 rounded-full" style={{ height: h, backgroundColor: "var(--th-primary)" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <p className="rounded-lg px-2.5 py-1.5 text-[10px]" style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-secondary)" }}>
            “Walk me through the caching layer in your project.”
          </p>
          <p className="ml-6 rounded-lg px-2.5 py-1.5 text-[10px]" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 10%, transparent)", color: "var(--th-text-secondary)" }}>
            “We used Redis with a 60-second TTL and…”
          </p>
        </div>
      </div>
    );
  }

  // hr
  return (
    <div className={shell} style={shellStyle}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold" style={{ color: "var(--th-text-primary)" }}>Live scoring</p>
        <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#D64545" }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: "#D64545" }} /> REC
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {[["Communication", 82], ["Structure", 68], ["Clarity", 74], ["Confidence", 71]].map(([k, v]) => (
          <div key={k as string}>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: "var(--th-text-muted)" }}>{k as string}</span>
              <span className="font-semibold" style={{ color: "var(--th-text-secondary)" }}>{v as number}</span>
            </div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
              <span className="block h-full rounded-full" style={{ width: `${v as number}%`, backgroundColor: "var(--th-primary)" }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function StudentLanding() {
  const [heroWord, setHeroWord] = useState(0);
  const [round, setRound] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const [audience, setAudience] = useState<"student" | "college">("student");
  const [pricingTab, setPricingTab] = useState<"student" | "org">("student");
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [studentCat, setStudentCat] = useState<Record<string, RawPlan> | null>(null);
  const [orgCat, setOrgCat] = useState<Record<string, RawPlan> | null>(null);
  const [statsIn, setStatsIn] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setHeroWord((i) => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let off = false;
    subscriptionService.plansPublic().then((m) => !off && setStudentCat(m as Record<string, RawPlan>)).catch(() => {});
    subscriptionService.orgPlans().then((m) => !off && setOrgCat(m as Record<string, RawPlan>)).catch(() => {});
    return () => {
      off = true;
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

  const cards = useMemo(() => {
    const map = pricingTab === "student" ? studentCat : orgCat;
    return map ? buildCards(map, billing, pricingTab === "student" ? "student" : "org") : [];
  }, [pricingTab, studentCat, orgCat, billing]);

  const activeRound = ROUNDS[round];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}
    >
      <style>{`
        @keyframes slLift { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .sl-lift { animation: slLift 260ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes slWord { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .sl-word { animation: slWord 320ms ease; }
        @media (prefers-reduced-motion: reduce) { .sl-lift, .sl-word { animation: none; } }
      `}</style>

      <Firstnav />

      <main>
        {/* ── hero ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--th-hero-grad)" }} />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)", color: "var(--th-text-secondary)" }}
              >
                <Sparkles size={13} style={{ color: "var(--th-primary)" }} />
                Built for campus placements
              </span>

              <h1
                className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem] md:text-[3.4rem]"
                style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
              >
                Practise the{" "}
                <span className="relative inline-grid align-bottom">
                  <span key={heroWord} className="sl-word col-start-1 row-start-1" style={{ color: "var(--th-primary)" }}>
                    {HERO_WORDS[heroWord]}
                  </span>
                </span>{" "}
                round before it counts.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: "var(--th-text-secondary)" }}>
                Four adaptive interview rounds, a real coding sandbox, voice AI interviewers and a readiness report
                that tells you exactly where you stand — start with 3 free mock interviews.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="btn-primary w-full justify-center !rounded-full !px-6 !py-3 !text-sm sm:w-auto">
                    Start free — no card <ArrowRight size={15} />
                  </button>
                </Link>
                <Link href="/pricing" className="w-full sm:w-auto">
                  <button className="btn-secondary w-full justify-center !rounded-full !px-6 !py-3 !text-sm sm:w-auto">
                    See plans
                  </button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: Code2, label: "Real code sandbox" },
                  { icon: Mic2, label: "Voice AI interviewers" },
                  { icon: ScanFace, label: "Calibrated proctoring" },
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
          <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4">
            {CAPABILITY_STATS.map((s) => (
              <div key={s.label}>
                <div
                  className="text-[2.1rem] font-bold leading-none tracking-tight"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-primary)" }}
                >
                  {s.value !== null ? (statsIn ? <CountUp end={s.value} suffix={s.suffix ?? ""} /> : `0${s.suffix ?? ""}`) : s.display}
                </div>
                <div className="mt-2 text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{s.label}</div>
                <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── the four rounds ── */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
              One mock, four rounds
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              The whole interview, not a quiz.
            </h2>
          </Reveal>

          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {ROUNDS.map((r, i) => {
              const Icon = r.icon;
              const on = i === round;
              return (
                <button
                  key={r.key}
                  onClick={() => setRound(i)}
                  className="relative flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors"
                  style={{
                    color: on ? "#fff" : "var(--th-text-secondary)",
                    backgroundColor: on ? "var(--th-primary)" : "var(--th-surface)",
                    borderColor: on ? "var(--th-primary)" : "var(--th-border)",
                  }}
                >
                  {on && (
                    <motion.span
                      layoutId="roundPill"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: "var(--th-primary)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon size={13} />
                    {r.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            key={activeRound.key}
            className="sl-lift grid gap-6 rounded-2xl border p-6 sm:p-8 lg:grid-cols-2 lg:items-center"
            style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
          >
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--th-primary)" }}>
                {activeRound.tag}
              </span>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight md:text-2xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                {activeRound.name} round
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{activeRound.blurb}</p>
              <ul className="mt-5 space-y-2.5">
                {activeRound.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--th-text-secondary)" }}>
                    <Check size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: "var(--th-primary)" }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-h-[220px]">
              <RoundVisual roundKey={activeRound.key} />
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
                From sign-up to study plan in one sitting.
              </h2>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ── your readiness report ── */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                After every mock
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                An intelligence briefing, not a scorecard.
              </h2>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                Your report weighs every round into one readiness score, then breaks down exactly what to fix — and
                hands you a study plan to fix it.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {REPORT_ITEMS.map((it) => (
                  <div key={it.title} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                      <it.icon size={16} style={{ color: "var(--th-primary)" }} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{it.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{it.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--th-primary)" }}>
                Run your first mock <ChevronRight size={15} />
              </Link>
            </Reveal>

            <Reveal delay={90}>
              <HeroPreview />
            </Reveal>
          </div>
        </section>

        {/* ── two audiences ── */}
        <section className="border-y" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal className="mx-auto mb-8 max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                Two ways in
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Prep on your own — or through your college.
              </h2>
            </Reveal>

            <div className="mx-auto mb-8 flex w-full max-w-xs rounded-full border p-1" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)" }}>
              {(["student", "college"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className="flex-1 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={audience === a ? { backgroundColor: "var(--th-primary)", color: "#fff" } : { color: "var(--th-text-muted)" }}
                >
                  {a === "student" ? "As a student" : "Through college"}
                </button>
              ))}
            </div>

            <div
              key={audience}
              className="sl-lift grid gap-6 rounded-2xl border p-6 sm:p-8 lg:grid-cols-[1fr_0.85fr] lg:items-center"
              style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
            >
              {audience === "student" ? (
                <>
                  <div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}>
                      <GraduationCap size={18} style={{ color: "var(--th-primary)" }} />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                      The focused candidate console
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                      Everything you need to walk in ready — adaptive rounds, an ATS resume analyzer, a readiness score
                      and an AI study plan. Free to start, subscribe when you&apos;re serious.
                    </p>
                    <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {["Adaptive interview rounds", "ATS resume analyzer", "Readiness radar & trend", "AI study plans", "Percentile bands", "Past-report history"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                          <Check size={13} strokeWidth={2.5} style={{ color: "var(--th-primary)" }} /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--th-primary)" }}>
                      Create a free account <ChevronRight size={15} />
                    </Link>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg-alt)" }}>
                    <RoundVisual roundKey="hr" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}>
                      <Building2 size={18} style={{ color: "var(--th-primary)" }} />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                      Seated by your placement cell
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                      If your college runs Synclyft, a seat gives you full access to every round at no personal cost —
                      and your results roll straight up into your placement cell&apos;s dashboards.
                    </p>
                    <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {["Full access, zero cost to you", "Assigned placement drives", "Officer-scheduled follow-ups", "Batch benchmarking", "Proctored, credible scores", "Board-ready reports"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                          <Check size={13} strokeWidth={2.5} style={{ color: "var(--th-primary)" }} /> {f}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={process.env.NEXT_PUBLIC_OFFICER_URL || "/pricing"}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
                      style={{ color: "var(--th-primary)" }}
                    >
                      For placement cells <ChevronRight size={15} />
                    </a>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg-alt)" }}>
                    <RoundVisual roundKey="aptitude" />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── pricing ── */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
              Transparent pricing
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Free to start. Fair when you scale.
            </h2>
            <p className="mt-3 text-sm" style={{ color: "var(--th-text-muted)" }}>
              Pulled live from our billing catalogue.
            </p>
          </Reveal>

          <div className="mb-6 flex flex-wrap justify-center gap-3">
            <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)" }}>
              {(["student", "org"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPricingTab(t)}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={pricingTab === t ? { backgroundColor: "var(--th-primary)", color: "#fff" } : { color: "var(--th-text-muted)" }}
                >
                  {t === "student" ? "For students" : "For colleges"}
                </button>
              ))}
            </div>
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
                <div key={i} className="h-[440px] animate-pulse rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }} />
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
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                      style={{ backgroundColor: "var(--th-primary)" }}
                    >
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
                  <Link href={p.href} className="mt-6">
                    <button className={cn("w-full justify-center !rounded-full !py-2.5 !text-xs", p.highlighted ? "btn-primary" : "btn-secondary")}>
                      {p.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            Prices in INR, taxes as applicable. Students on a college seat get full access at no personal cost.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section id="faqs" className="border-y" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                Questions
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Good to know before you start.
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
                      <ChevronDown
                        size={16}
                        className="shrink-0 transition-transform"
                        style={{ transform: open ? "rotate(180deg)" : "none", color: "var(--th-text-muted)" }}
                      />
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
          </div>
        </section>

        {/* ── final CTA ── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl border px-5 py-12 text-center sm:px-12 sm:py-16"
              style={{ borderColor: "var(--th-card-border)", background: "var(--th-hero-grad)" }}
            >
              <Rocket size={22} className="mx-auto mb-4" style={{ color: "var(--th-primary)" }} />
              <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight md:text-3xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Your first mock is free. Take it today.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                3 mock interviews, 2 AI evaluations and a PDF report on the house. No card, cancel anytime.
              </p>
              <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="btn-primary w-full justify-center !rounded-full !px-8 !py-3 !text-sm sm:w-auto">
                    Create free account <ArrowRight size={16} />
                  </button>
                </Link>
                <Link href="/about" className="w-full sm:w-auto">
                  <button className="btn-secondary w-full justify-center !rounded-full !px-8 !py-3 !text-sm sm:w-auto">
                    Learn more
                  </button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
