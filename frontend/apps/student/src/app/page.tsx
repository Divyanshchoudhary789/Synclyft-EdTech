"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Brain,
  Code2,
  Mic2,
  BarChart3,
  Shield,
  Users,
  Star,
  CheckCircle,
  Play,
  Target,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { AdaptivePulse } from "@synclyft/ui/components/AdaptivePulse";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Badge } from "@synclyft/ui/components/Badge";
import Firstnav from "@/components/layout/Firstnav";
import { useTheme } from "@synclyft/lib/theme";
import { cn } from "@synclyft/lib/utils";
import { subscriptionService } from "@synclyft/lib/api/services";
import Footer from "@/components/layout/Footer";

const HERO_WORDS = ["Aptitude", "Coding", "Technical", "HR"];

const floatingOrbs = [
  { size: 500, x: "-10%", y: "-20%", color: "rgba(0,98,255,0.06)", delay: 0 },
  { size: 380, x: "70%", y: "10%", color: "rgba(0,145,255,0.05)", delay: 0.5 },
  { size: 300, x: "30%", y: "60%", color: "rgba(0,75,230,0.04)", delay: 1 },
];

const features = [
  {
    icon: Brain,
    title: "Adaptive Intelligence",
    desc: "Questions calibrate to your level in real-time harder when you excel targeted when you struggle every session is unique.",
    tag: "AI Engine",
  },
  {
    icon: Code2,
    title: "Monaco Coding Environment",
    desc: "Full IDE experience with syntax highlighting, auto-complete and real test-case execution against a sandboxed judge.",
    tag: "Coding Round",
  },
  {
    icon: Mic2,
    title: "Voice-First HR Round",
    desc: "AI interviewer with natural conversation flow. Waveform visualization, silence detection and behavioral scoring.",
    tag: "HR Round",
  },
  {
    icon: Shield,
    title: "Intelligent Proctoring",
    desc: "Multi-signal proctoring that flags anomalies without false positives respecting candidates while ensuring integrity.",
    tag: "Proctoring",
  },
  {
    icon: BarChart3,
    title: "Readiness Analytics",
    desc: "Radar charts, score trends, percentile bands and AI narrative reports not a scorecard an intelligence briefing.",
    tag: "Analytics",
  },
  {
    icon: Users,
    title: "Placement Officer Portal",
    desc: "Batch dashboards, student drill-downs, AI report generation and natural language queries across your cohort.",
    tag: "Officer Portal",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "SDE-2, Google",
    college: "IIT Delhi",
    content: "The technical round felt more realistic than actual Google interviews. The system design questions and adaptive follow-ups were genuinely challenging.",
    score: 94,
    grade: "A+",
  },
  {
    name: "Dr. Rajesh Kumar",
    role: "Placement Officer",
    college: "NIT Trichy",
    content: "The officer portal transformed how we track placement readiness. The AI-generated batch reports save us 20+ hours of manual assessment each semester.",
    score: null,
    grade: null,
  },
  {
    name: "Aryan Kapoor",
    role: "ML Engineer, Flipkart",
    college: "BITS Pilani",
    content: "The resume ATS analyzer identified three critical gaps I'd missed. After applying the suggestions, I went from 3 callbacks to 11 in two weeks.",
    score: 88,
    grade: "A",
  },
];

// ── Pricing: rendered from the live catalogue (/subscriptions/plans/public + /plans/org) ──
interface PlanCard {
  key: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

type RawPlan = {
  name?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  seats?: number;
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtLimit = (n?: number) => (n === undefined ? "" : n < 0 ? "Unlimited" : `${n}`);

const STUDENT_PLAN_META: Record<string, { desc: string; highlighted?: boolean }> = {
  STUDENT_BASIC: { desc: "For individual candidates preparing for campus or off-campus drives." },
  STUDENT_PRO: { desc: "For serious candidates targeting top-tier companies.", highlighted: true },
  STUDENT_PREMIUM: { desc: "Unlimited practice for candidates going all-in on placements." },
};
const ORG_PLAN_META: Record<string, { desc: string; highlighted?: boolean }> = {
  BASIC: { desc: "For placement cells and coaching institutes starting out." },
  PRO: { desc: "For established placement teams running batch-wide drives.", highlighted: true },
  ENTERPRISE: { desc: "For large universities needing custom integrations and scale." },
};

function studentFeatures(p: RawPlan): string[] {
  const mi = p.limits?.mockInterviewsPerMonth;
  const rp = p.limits?.studentReportsPerMonth;
  const out: string[] = [];
  out.push(mi !== undefined && mi < 0 ? "Unlimited mock interviews" : `${fmtLimit(mi)} mock interviews / month`);
  out.push("Aptitude, Coding, Technical & HR rounds");
  if (p.features?.aiEvaluation) out.push("AI evaluation & round-by-round feedback");
  out.push(rp !== undefined && rp < 0 ? "Unlimited PDF report exports" : `${fmtLimit(rp)} PDF report exports / month`);
  out.push("Resume upload & ATS analysis");
  if (p.features?.proctoring) out.push("AI proctoring on mock interviews");
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
  if (p.features?.advancedAnalytics) out.push("Advanced analytics");
  if (p.features?.apiAccess) out.push("API access");
  if (p.features?.customBranding) out.push("Custom branding");
  return out;
}

function buildStudentCards(map: Record<string, RawPlan>, billing: "monthly" | "yearly"): PlanCard[] {
  const order = ["STUDENT_BASIC", "STUDENT_PRO", "STUDENT_PREMIUM"];
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
        desc: STUDENT_PLAN_META[key]?.desc ?? "",
        features: studentFeatures(p),
        cta: "Start free trial",
        href: "/register",
        highlighted: Boolean(STUDENT_PLAN_META[key]?.highlighted),
      };
    });
}
function buildOrgCards(map: Record<string, RawPlan>, billing: "monthly" | "yearly"): PlanCard[] {
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
        desc: ORG_PLAN_META[key]?.desc ?? "",
        features: orgFeatures(p),
        cta: key === "ENTERPRISE" ? "Contact sales" : "Request demo",
        href: process.env.NEXT_PUBLIC_OFFICER_URL ? `${process.env.NEXT_PUBLIC_OFFICER_URL}/register` : "/register",
        highlighted: Boolean(ORG_PLAN_META[key]?.highlighted),
      };
    });
}

const stats = [
  { value: 94, suffix: "%", label: "Placement rate improvement" },
  { value: 12, suffix: "K+", label: "Students assessed" },
  { value: 340, suffix: "+", label: "Partner companies" },
  { value: 4.9, suffix: "/5", label: "Average rating", decimals: 1 },
];

// Motion Animation Configs
const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
} as const;

const heroItem = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 90, damping: 18 },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 14 } },
} as const;

const FAQS = [
  {
    question: "What is Synclyft AI and how does it work?",
    answer: "Synclyft AI is an end-to-end interview prep platform designed for campus placements. It offers four adaptive mock interview rounds—Aptitude, Coding, Technical, and HR—leveraging voice AI, Monaco IDE playground, proctoring, and comprehensive readiness analytics."
  },
  {
    question: "How does the adaptive coding round calibrate difficulty?",
    answer: "Our engine monitors your submissions in real-time. If you solve test cases quickly and correctly, the platform automatically escalates difficulty and adds challenging follow-up constraints. If you struggle, it simplifies target scenarios to pinpoint and patch your core conceptual gaps."
  },
  {
    question: "Can college placement offices use the platform?",
    answer: "Yes, Synclyft features a comprehensive Placement Officer Portal. Admins and officers can view cohort performance dashboards, perform academic audits, generate batch-wide AI readiness reports, and query students' statistics in natural language."
  },
  {
    question: "What proctoring features are included?",
    answer: "Our system implements multi-signal, non-intrusive proctoring (tab switching tracking, audio-visual anomaly detection) that flags integrity violations in real-time without disrupting the candidate's flow, preserving privacy while ensuring assessment validity."
  },
  {
    question: "How does the AI HR round evaluate candidates?",
    answer: "The HR module features conversational voice AI with live waveform feedback. It listens to candidate responses and analyzes communication structure, language clarity, keyword usage, behavioral intent, and sentiment analytics."
  }
];

export default function LandingPage() {
  const [activePortal, setActivePortal] = useState<"student" | "officer">("student");
  const [pricingTab, setPricingTab] = useState<"student" | "org">("student");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [studentCatalog, setStudentCatalog] = useState<Record<string, RawPlan> | null>(null);
  const [orgCatalog, setOrgCatalog] = useState<Record<string, RawPlan> | null>(null);
  const [activeFaqIdx, setActiveFaqIdx] = useState<number | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [heroWordIdx, setHeroWordIdx] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    subscriptionService.plansPublic().then((m) => { if (!cancelled) setStudentCatalog(m as Record<string, RawPlan>); }).catch(() => {});
    subscriptionService.orgPlans().then((m) => { if (!cancelled) setOrgCatalog(m as Record<string, RawPlan>); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroWordIdx((i) => (i + 1) % HERO_WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>

      {/* ── Layered mesh-gradient background placed globally ── */}
      <div className="absolute top-0 left-0 right-0 h-[100vh] pointer-events-none overflow-hidden -z-10" aria-hidden>
        <div className="absolute inset-0" style={{ background: "var(--th-hero-grad)" }} />
        {/* Animated floating orbs */}
        {floatingOrbs.map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.15, 1],
              x: [0, 20, -10, 0],
              y: [0, -15, 10, 0],
            }}
            transition={{
              duration: 12 + i * 3,
              ease: "easeInOut",
              repeat: Infinity,
              delay: orb.delay,
            }}
          />
        ))}
        {/* Dot grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#0062FF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* Public Navbar */}
      <Firstnav />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden pt-2 md:pt-4 flex flex-col">

        {/* ── Content (parallax wrapper) ── */}
        <motion.div style={{ y: heroParallaxY, opacity: heroOpacity }} className="relative z-10">
          <motion.div
            variants={heroContainer}
            initial={false}
            animate="show"
            className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-6"
          >
            {/* Two-column layout */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* LEFT: Text content */}
              <div className="text-left space-y-5">

                {/* Headline with cycling word */}
                <motion.h1
                  variants={heroItem}
                  className="text-[clamp(2.4rem,5.5vw,4.2rem)] font-extrabold leading-[1.03] tracking-[-0.04em] "
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
                >
                  Ace your {" "}
                  <span className="relative inline-flex h-[1.1em] overflow-hidden align-bottom">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={heroWordIdx}
                        initial={{ y: 40, opacity: 0, filter: "blur(6px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={{ y: -40, opacity: 0, filter: "blur(6px)" }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className="inline-block text-[#0062FF]"
                      >
                        interview
                      </motion.span>
                    </AnimatePresence>
                  </span>{" "}
                  before Placement.
                </motion.h1>

                {/* Sub-description */}
                <motion.p variants={heroItem} className="text-base max-w-md leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                  Four adaptive interview rounds, intelligent proctoring and deep readiness analytics all in one focused platform built for campus placements.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div variants={heroItem} className="flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 btn-primary !px-6 !py-3 !text-sm !rounded-full shadow-lg shadow-[#0062FF]/15 hover:shadow-xl hover:shadow-[#0062FF]/25 hover:-translate-y-0.5 transition-all font-semibold"
                  >
                    Start for free <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/interview/setup"
                    className="inline-flex items-center gap-2 btn-secondary !px-6 !py-3 !text-sm !rounded-full hover:-translate-y-0.5 transition-all"
                    style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}
                  >
                    <Play size={14} className="text-[#0062FF] fill-[#0062FF]" />
                    Watch demo
                  </Link>
                </motion.div>

                {/* Trust bar */}
                <motion.div variants={heroItem} className="flex flex-wrap items-center gap-4 pt-1">
                  {[
                    { icon: Users, label: "12K+ students" },
                    { icon: Target, label: "94% placement rate" },
                    { icon: TrendingUp, label: "340+ companies" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--th-text-muted)" }}>
                      <Icon size={13} className="text-[#0062FF]" />
                      {label}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* RIGHT: Lottie Hero Animation */}
              <div className="flex justify-center items-center lg:justify-end w-full aspect-[6/4] max-w-[500px] mx-auto relative">
                <iframe
                  src="https://lottie.host/embed/90610a18-c0c2-44a0-a573-af6ce3d8a77d/ymsXZDyPPK.lottie"
                  className="w-full h-full border-none bg-transparent"
                  title="Hero Lottie Animation"
                  style={{
                    background: "transparent",
                    filter: isDark
                      ? "drop-shadow(0 25px 40px rgba(0, 98, 255, 0.35)) drop-shadow(0 4px 12px rgba(0, 98, 255, 0.2))"
                      : "drop-shadow(0 25px 35px rgba(0, 98, 255, 0.18)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.06))",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll chevron */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border-2 border-[#D4D0C5] flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-[#9CA3AF] rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ borderColor: "var(--th-border)", borderTopWidth: 1, borderBottomWidth: 1, backgroundColor: "var(--th-stats-bg)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center space-y-1">
                <div
                  className="text-[2.25rem] font-bold text-[#0062FF] tracking-tight mb-0.5 leading-none"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
                >
                  {statsVisible ? (
                    <CountUp end={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                  ) : (
                    "0" + stat.suffix
                  )}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student vs Officer Portal Interactive Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="label-caption" style={{ color: "var(--th-text-faint)" }}>Two platforms, one unified system</span>
          <h2
            className="text-[2.25rem] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            Built for students AND the teams that place them.
          </h2>
          <p className="text-sm" style={{ color: "var(--th-text-muted)" }}>
            Toggle between the portals below to see how Synclyft AI bridges candidates and administrators.
          </p>

          {/* Interactive Toggle Switch */}
          <div className="inline-flex p-1 rounded-full relative mt-4" style={{ backgroundColor: "var(--th-bg-secondary)", border: "1px solid var(--th-border)" }}>
            <button
              onClick={() => setActivePortal("student")}
              className={cn(
                "relative z-10 px-6 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors",
                activePortal === "student" ? "text-white" : ""
              )}
              style={activePortal !== "student" ? { color: "var(--th-text-muted)" } : {}}
            >
              {activePortal === "student" && (
                <motion.div
                  layoutId="activePortalTab"
                  className="absolute inset-0 bg-[#0062FF] rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Student Portal
            </button>
            <button
              onClick={() => setActivePortal("officer")}
              className={cn(
                "relative z-10 px-6 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors",
                activePortal === "officer" ? "text-white" : ""
              )}
              style={activePortal !== "officer" ? { color: "var(--th-text-muted)" } : {}}
            >
              {activePortal === "officer" && (
                <motion.div
                  layoutId="activePortalTab"
                  className="absolute inset-0 bg-[#0062FF] rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Officer Portal
            </button>
          </div>
        </div>

        <div className="min-h-[430px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {activePortal === "student" ? (
              <motion.div
                key="student"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-5xl"
              >
                <div className="p-6 md:p-8 shadow-lg rounded-2xl grid md:grid-cols-12 gap-8 items-center" style={{ backgroundColor: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}>
                  <div className="md:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="amber">Student Portal</Badge>
                      <span className="text-[0.65rem] font-mono tracking-widest uppercase" style={{ color: "var(--th-text-faint)" }}>Candidate Experience</span>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                        The focused candidate console
                      </h3>
                      <p className="leading-relaxed text-sm" style={{ color: "var(--th-text-muted)" }}>
                        Four AI adaptive interview rounds — Aptitude, Coding, Technical and HR with live proctoring,
                        real-time analytics and a readiness score that tells you exactly where you stand before day zero.
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      {[
                        "AI-adaptive calibration",
                        "Monaco IDE workspace",
                        "Conversational HR round",
                        "ATS resume optimizer",
                        "Narrative AI insights"
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--th-text-secondary)" }}>
                          <CheckCircle size={14} className="text-[#3DDC84] shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--th-border)" }}>
                      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[#0062FF] text-sm font-semibold hover:gap-2.5 transition-all">
                        View student dashboard <ChevronRight size={16} />
                      </Link>
                      <span className="text-[10px] italic" style={{ color: "var(--th-text-faint)" }}>Designed for candidates</span>
                    </div>
                  </div>
                  <div className="md:col-span-5 relative overflow-hidden rounded-xl aspect-[4/3] flex items-center justify-center" style={{ border: "1px solid var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
                    <Image
                      src="/images/coding_mockup.png"
                      alt="Student Coding Console Mockup"
                      fill
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="officer"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-5xl"
              >
                <div className="card-light p-6 md:p-8 shadow-xl rounded-2xl bg-var(--th-bg-secondary) text-var(--th-text-primary) grid md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="cobalt">Officer Portal</Badge>
                      <span className="text-[0.65rem] font-mono tracking-widest text-[var(--th-text-muted)] uppercase">Cohort Analytics</span>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl md:text-2xl font-bold text-[var(--th-text-primary)]" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                        Batch intelligence at scale
                      </h3>
                      <p className="text-[var(--th-text-muted)] leading-relaxed text-sm">
                        See every student&apos;s readiness score round-by-round breakdown and trajectory trend across
                        your entire cohort in a single dense administrative console.
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      {[
                        "Cohort readiness distribution",
                        "Natural Language Querying",
                        "AI batch reports",
                        "Per-student academic audits",
                        "Direct CSV / PDF export"
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs text-[#9CA3AF] font-medium">
                          <CheckCircle size={14} className="text-[#4D7CFF] shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-[#2A2F38] flex items-center justify-between">
                      <Link href="/officer" className="inline-flex items-center gap-1.5 text-[#4D7CFF] text-sm font-semibold hover:gap-2.5 transition-all">
                        Open officer portal <ChevronRight size={16} />
                      </Link>
                      <span className="text-[10px] text-[#6B7280] italic">Optimized for Placement Officers</span>
                    </div>
                  </div>
                  <div className="md:col-span-5 relative overflow-hidden rounded-xl border border-[#2A2F38] shadow-inner bg-[#0B0D10] aspect-[4/3] flex items-center justify-center">
                    <Image
                      src="/images/dashboard_mockup.png"
                      alt="Officer Dashboard Mockup"
                      fill
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Features Grid with Scroll Reveal */}
      <section className="py-10" style={{ backgroundColor: "var(--th-bg-tertiary)", borderTop: "1px solid var(--th-border)", borderBottom: "1px solid var(--th-border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-lg mx-auto mb-16 space-y-2">
            <span className="label-caption" style={{ color: "var(--th-text-faint)" }}>Platform capabilities</span>
            <h2
              className="text-[2.25rem] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
            >
              Everything an interview needs.
            </h2>
          </div>

          <motion.div
            variants={heroContainer}
            initial={false}
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{
                  y: -6,
                  borderColor: "rgba(0, 98, 255, 0.3)",
                  boxShadow: isDark ? "0 12px 30px rgba(0, 98, 255, 0.12)" : "0 12px 30px rgba(0, 98, 255, 0.04)",
                }}
                className="p-6 space-y-4 rounded-xl transition-all duration-300 group"
                style={{ backgroundColor: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl group-hover:bg-[#0062FF]/10 group-hover:text-[#0062FF] transition-colors duration-300" style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-primary)" }}>
                    <feature.icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <Badge variant="neutral">{feature.tag}</Badge>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-base group-hover:text-[#0062FF] transition-colors" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials with Scroll Reveal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-lg mx-auto mb-16 space-y-2">
          <span className="label-caption" style={{ color: "var(--th-text-faint)" }}>What candidates and officers say</span>
          <h2
            className="text-[2.25rem] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            The results speak clearly.
          </h2>
        </div>

        <motion.div
          variants={heroContainer}
          initial={false}
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -5, boxShadow: isDark ? "0 15px 35px rgba(0,0,0,0.3)" : "0 15px 35px rgba(0,0,0,0.04)" }}
              className="p-6 space-y-5 rounded-xl flex flex-col justify-between"
              style={{ backgroundColor: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-[#0062FF] fill-[#0062FF]" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed italic" style={{ color: "var(--th-text-secondary)" }}>&quot;{t.content}&quot;</p>
              </div>
              <div className="flex items-end justify-between pt-4" style={{ borderTop: "1px solid var(--th-border)" }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--th-text-primary)" }}>{t.name}</div>
                  <div className="text-xs" style={{ color: "var(--th-text-muted)" }}>{t.role}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-faint)" }}>{t.college}</div>
                </div>
                {t.grade && (
                  <div className="text-right">
                    <div className="font-mono text-[0.6rem] text-[#9CA3AF] uppercase tracking-wider">Readiness</div>
                    <div
                      className="text-xl font-extrabold text-[#3DDC84] leading-none my-0.5"
                      style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
                    >
                      {t.score}
                    </div>
                    <Badge variant="verdant">{t.grade}</Badge>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing with Highlighted Option */}
      <section id="pricing" className="py-10" style={{ backgroundColor: "var(--th-bg-tertiary)", borderTop: "1px solid var(--th-border)", borderBottom: "1px solid var(--th-border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-lg mx-auto mb-10 space-y-2">
            <span className="label-caption" style={{ color: "var(--th-text-faint)" }}>Transparent pricing</span>
            <h2
              className="text-[2.25rem] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
            >
              Choose your prep level.
            </h2>
          </div>

          {/* Interactive Pricing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1 rounded-full relative" style={{ backgroundColor: "var(--th-bg-secondary)", border: "1px solid var(--th-border)" }}>
              <button
                type="button"
                onClick={() => setPricingTab("student")}
                className={cn(
                  "relative z-10 px-6 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors border-0 cursor-pointer",
                  pricingTab === "student" ? "text-white animate-none" : ""
                )}
                style={pricingTab !== "student" ? { color: "var(--th-text-muted)", backgroundColor: "transparent" } : {}}
              >
                {pricingTab === "student" && (
                  <motion.div
                    layoutId="activePricingTab"
                    className="absolute inset-0 bg-[#0062FF] rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                For Students
              </button>
              <button
                type="button"
                onClick={() => setPricingTab("org")}
                className={cn(
                  "relative z-10 px-6 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors border-0 cursor-pointer",
                  pricingTab === "org" ? "text-white animate-none" : ""
                )}
                style={pricingTab !== "org" ? { color: "var(--th-text-muted)", backgroundColor: "transparent" } : {}}
              >
                {pricingTab === "org" && (
                  <motion.div
                    layoutId="activePricingTab"
                    className="absolute inset-0 bg-[#0062FF] rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                For Organizations
              </button>
            </div>
          </div>

          {/* Monthly / yearly billing toggle */}
          <div className="flex justify-center mb-8 -mt-6">
            <div className="inline-flex p-1 rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)", border: "1px solid var(--th-border)" }}>
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  className="px-4 py-1.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide transition-colors border-0 cursor-pointer"
                  style={billing === b
                    ? { backgroundColor: "#0062FF", color: "#fff" }
                    : { backgroundColor: "transparent", color: "var(--th-text-muted)" }}
                >
                  {b === "yearly" ? "Yearly · save ~17%" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const cards =
              pricingTab === "student"
                ? studentCatalog ? buildStudentCards(studentCatalog, billing) : []
                : orgCatalog ? buildOrgCards(orgCatalog, billing) : [];

            if (cards.length === 0) {
              return (
                <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-96 rounded-2xl border animate-pulse" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }} />
                  ))}
                </div>
              );
            }

            return (
              <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                {cards.map((plan) => (
                  <div
                    key={plan.key}
                    className={cn(
                      "p-7 rounded-2xl border space-y-6 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1",
                      plan.highlighted ? "bg-[#12151A] border-[#0062FF] text-white shadow-xl lg:-translate-y-2 relative" : ""
                    )}
                    style={!plan.highlighted ? { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" } : {}}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0062FF] text-white text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}
                    <div className="space-y-4">
                      <div>
                        <div className={cn("font-semibold text-xs uppercase tracking-wider", plan.highlighted ? "text-[#0062FF]" : "")} style={!plan.highlighted ? { color: "var(--th-text-muted)" } : {}}>
                          {plan.name}
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span
                            className="text-[2rem] font-bold leading-none tracking-tight"
                            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: plan.highlighted ? "#0062FF" : "var(--th-text-primary)" }}
                          >
                            {plan.price}
                          </span>
                          <span className="text-xs font-mono" style={{ color: plan.highlighted ? "#6B7280" : "var(--th-text-faint)" }}>
                            {plan.period}
                          </span>
                        </div>
                        <p className="text-xs mt-3 leading-relaxed" style={{ color: plan.highlighted ? "#9CA3AF" : "var(--th-text-muted)" }}>
                          {plan.desc}
                        </p>
                      </div>

                      <ul className="space-y-2.5 pt-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-xs" style={{ color: plan.highlighted ? "#C8CDD5" : "var(--th-text-secondary)" }}>
                            <CheckCircle size={14} style={{ color: plan.highlighted ? "#0062FF" : "#3DDC84" }} className="shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4">
                      <Link
                        href={plan.href}
                        className={cn(
                          "flex w-full justify-center py-2.5 rounded-xl font-semibold transition-all text-xs",
                          plan.highlighted ? "bg-[#0062FF] hover:bg-[#004BE6] text-white shadow-lg shadow-[#0062FF]/10" : "btn-secondary"
                        )}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <p className="text-center text-[0.7rem] mt-8" style={{ color: "var(--th-text-faint)" }}>
            All plans include a 14-day free trial. Prices in INR, taxes as applicable. Students allocated a seat by their college get full access at no personal cost.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <h2
            className="text-[2.5rem] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            Ready to enter the console?
          </h2>
          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
            14-day free trial. No credit card required. Cancel anytime.
            Your first mock interview takes 90 minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/register" className="btn-primary !px-8 !py-3.5 !text-sm !rounded-full shadow-lg shadow-[#0062FF]/10 hover:shadow-xl hover:shadow-[#0062FF]/20 transition-all">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href="/about" className="btn-secondary !px-8 !py-3.5 !text-sm !rounded-full transition-all" style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
              Learn more
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-10 border-t border-[var(--th-border)] bg-[var(--th-bg-tertiary)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-lg mx-auto mb-16 space-y-2">
            <span className="label-caption" style={{ color: "var(--th-text-faint)" }}>Got questions?</span>
            <h2
              className="text-[2.25rem] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => {
              const isOpen = activeFaqIdx === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border transition-all duration-300 overflow-hidden"
                  style={{
                    backgroundColor: isOpen ? "var(--th-card-bg)" : "var(--th-surface)",
                    borderColor: isOpen ? "var(--th-primary)" : "var(--th-card-border)",
                    boxShadow: isOpen ? "0 4px 20px rgba(0, 98, 255, 0.05)" : "none",
                  }}
                >
                  <button
                    onClick={() => setActiveFaqIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm cursor-pointer transition-colors duration-200"
                    style={{ color: "var(--th-text-primary)", border: "none", background: "transparent" }}
                  >
                    <span>{faq.question}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 ml-4 p-1 rounded-md text-[var(--th-text-muted)]"
                    >
                      <ChevronDown size={16} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div
                          className="px-5 pb-5 pt-1 text-xs leading-relaxed"
                          style={{ color: "var(--th-text-secondary)" }}
                        >
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}