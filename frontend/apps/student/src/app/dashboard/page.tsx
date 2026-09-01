"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { mockDashboard } from "@/lib/api/mock";
import { api } from "@synclyft/lib/api";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { getGradeLabel, getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { motion } from "framer-motion";
import {
  Play, TrendingUp, Award, Bell, ChevronRight,
  Target, BookOpen, BarChart2, Settings, Sparkles, User, Briefcase
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [loaded, setLoaded] = useState(false);
  const { user, fetchUser } = useAuthStore();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const [greeting] = useState(getGreeting);
  const data = mockDashboard;
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      const userData = await fetchUser();
      if (!userData) {
        router.push("/login");
        return;
      }
      // Student app only serves students. College / admin accounts have their
      // own deployments; send them back to sign in with an explanation.
      if (userData.role && userData.role !== "student") {
        router.replace(
          "/login?message=" +
            encodeURIComponent("This portal is for students. Please use your college or admin portal.")
        );
      }
    };

    getCurrentUser();
  }, [fetchUser, router]);

  const band = getGradeBand(data.readinessScore);
  const gradeColor = getGradeColor(band);
  const bandVariant = band === "high" ? "verdant" : band === "mid" ? "amber" : "coral";

  // Half-donut (speedometer) chart animation
  const donutRef = useRef<SVGCircleElement>(null);
  const RADIUS = 56;
  const FULL_CIRC = 2 * Math.PI * RADIUS;
  const HALF_CIRC = Math.PI * RADIUS;  // length of the top semicircle arc
  const [fillLen, setFillLen] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      setFillLen((data.readinessScore / 100) * HALF_CIRC);
    }, 120);
    return () => clearTimeout(timeout);
  }, [loaded, HALF_CIRC, data.readinessScore]);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="intelligence" />

      {/* Main Layout Grid Container - Stretched to match max-w-7xl */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Student Portal</p>
            <h1
              className="text-[2rem] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
            >
              {greeting} {user?.name ? user.name.split(" ")[0] : data.profile.name.split(" ")[0]}
            </h1>
            <p className="text-xs flex items-center gap-2 mt-1" style={{ color: "var(--th-text-muted)" }}>
              <span>{user?.college || user?.organization || data.profile.college}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>{user?.degree || data.profile.degree}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">

            <Link href="/interview/setup">
              <Button icon={<Play size={14} />} data-testid="dashboard-start-interview">
                New Interview
              </Button>
            </Link>
            <Link href="/resume">
              <Button variant="secondary">Resume Analyzer</Button>
            </Link>
          </div>
        </div>

        {/* ── ROW 1: Hero readiness card + Performance Analytics bar chart ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Readiness Score Hero Card (col-span-1) */}
          <div className="lg:col-span-1">
            {!loaded ? (
              <SkeletonCard className="h-80" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 h-full flex flex-col justify-between rounded-2xl border"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <div>
                  {/* ── HALF-DONUT SPEEDOMETER ── */}
                  <div className="flex flex-col items-center pt-2 pb-0">
                    <svg
                      width="200"
                      height="150"
                      viewBox="0 0 160 96"
                      className="overflow-visible"
                    >
                      <defs>
                        {/* Vibrant violet → indigo → cyan gradient */}
                        <linearGradient id="halfGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#7C3AED" />
                          <stop offset="40%" stopColor="#4F46E5" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                        {/* Glow filter */}
                        <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>

                      {/* Track arc — top half only */}
                      <circle
                        cx="80" cy="80" r={RADIUS}
                        fill="none"
                        stroke="var(--th-bg-secondary)"
                        strokeWidth="13"
                        strokeDasharray={`${HALF_CIRC} ${FULL_CIRC}`}
                        transform="rotate(180 80 80)"
                        strokeLinecap="round"
                      />

                      {/* Filled arc — animated */}
                      <circle
                        ref={donutRef}
                        cx="80" cy="80" r={RADIUS}
                        fill="none"
                        stroke="url(#halfGrad)"
                        strokeWidth="13"
                        strokeLinecap="round"
                        strokeDasharray={`${fillLen} ${FULL_CIRC}`}
                        transform="rotate(180 80 80)"
                        filter="url(#arcGlow)"
                        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
                      />

                      {/* Score number — centred under arc */}
                      <text x="80" y="75" textAnchor="middle" fontSize="30" fontWeight="900"
                        fill="url(#halfGrad)" fontFamily="var(--font-inter-tight), sans-serif">
                        {data.readinessScore}
                      </text>
                      <text x="80" y="89" textAnchor="middle" fontSize="9.5"
                        fill="var(--th-text-faint)" fontWeight="600" letterSpacing="0.8">
                        OUT OF 100
                      </text>
                    </svg>

                    {/* Status badge row */}
                    <div className="flex items-center gap-2 -mt-1">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white"
                        style={{ background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }}
                      >
                        {band === "high" ? "Excellent" : band === "mid" ? "Progressing" : "Needs Work"}
                      </span>
                    </div>

                    {/* Legend row */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--th-text-secondary)" }}>Readiness</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)", border: "1.5px solid var(--th-border-strong)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--th-text-faint)" }}>Remaining</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs">
                    <span className="opacity-60" style={{ color: "var(--th-text-secondary)" }}>Top</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                      {100 - data.percentile}%
                    </span>
                    <span className="opacity-60" style={{ color: "var(--th-text-secondary)" }}>of class candidates</span>
                  </div>
                </div>

                {/* 8-Week Trend Sparkline */}
                <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--th-text-faint)" }}>8-week trend</p>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <TrendingUp size={12} />
                      <span>+{data.readinessScore - data.readinessTrend[0].score} points</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={64}>
                    <AreaChart data={data.readinessTrend} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                      <defs>
                        <linearGradient id="readyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={gradeColor} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={gradeColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke={gradeColor}
                        strokeWidth={2.5}
                        fill="url(#readyGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </div>

          {/* Round Analytics Bar Chart Card (col-span-2) */}
          <div className="lg:col-span-2">
            {!loaded ? (
              <SkeletonCard className="h-80" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 h-full rounded-2xl border"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Round-wise Assessment breakdown</h3>
                    <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Scores across different mock placement interview rounds</p>
                  </div>
                  <Badge variant="neutral">Active Session</Badge>
                </div>

                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.roundBreakdown} margin={{ top: 10, right: 10, bottom: 10, left: -25 }}>
                      <defs>
                        {/* Dynamic Cobalt blue gradient fill for bar nodes */}
                        <linearGradient id="barBlueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60A5FA" />
                          <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="subject"
                        tick={{ fontSize: 11, fill: "var(--th-text-muted)", fontFamily: "var(--font-inter)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "var(--th-text-faint)", fontFamily: "var(--font-inter)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--th-card-bg)",
                          borderColor: "var(--th-card-border)",
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: "var(--th-text-primary)"
                        }}
                      />
                      <ReferenceLine y={75} stroke="#3DDC84" strokeDasharray="3, 3" label={{ value: "Cutoff (75%)", fill: "#3DDC84", fontSize: 9, position: "top" }} />
                      <Bar
                        dataKey="score"
                        fill="url(#barBlueGrad)"
                        radius={[6, 6, 0, 0]}
                        barSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── ROW 2: CS Topic Progress bars + stacked alerts ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* CS Topic Progress Card (col-span-2) */}
          <div className="lg:col-span-2">
            {!loaded ? (
              <SkeletonCard className="h-80" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-6 rounded-2xl border h-full"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Core CS Topic Analysis</h3>
                    <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Strengths and improvement areas based on coding assessments</p>
                  </div>
                  <Link href="/progress" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                    View Matrix <ChevronRight size={13} />
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                  {data.topicScores.map((t) => {
                    const pct = (t.score / t.maxScore) * 100;
                    const topicBand = getGradeBand(pct);
                    const color = getGradeColor(topicBand);
                    return (
                      <div key={t.topic} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>{t.topic}</span>
                          <span className="font-mono text-xs font-bold" style={{ color }}>{t.score}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Notifications & Shortcuts Card (col-span-1) */}
          <div className="lg:col-span-1 space-y-6">
            {!loaded ? (
              <SkeletonCard className="h-80" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6 h-full flex flex-col justify-between"
              >
                {/* Notifications container */}
                <div className="p-5 rounded-2xl border flex-1" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="label-caption" style={{ color: "var(--th-text-faint)" }}>Announcements</p>
                    <Bell size={14} className="text-gray-400" />
                  </div>
                  <div className="space-y-3.5">
                    {data.notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === "success" ? "bg-emerald-500" : n.type === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                        <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions shortcut list */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <p className="label-caption mb-3" style={{ color: "var(--th-text-faint)" }}>Shortcuts</p>
                  <div className="space-y-2">
                    {[
                      { label: "Practice Assessment", icon: Target, href: "/practice/single-round" },
                      { label: "Resume Optimizer", icon: BookOpen, href: "/resume" },
                      { label: "Placement Reports", icon: BarChart2, href: "/interview/report" },
                    ].map((action) => (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                        style={{ color: "var(--th-text-secondary)" }}
                      >
                        <action.icon size={14} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.label}</span>
                        <ChevronRight size={12} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── ROW 3: Recent Interviews + Skills Chips Tag Profile ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Recent attempts (col-span-2) */}
          <div className="lg:col-span-2">
            {!loaded ? (
              <SkeletonCard className="h-72" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-6 rounded-2xl border h-full flex flex-col justify-between"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Recent Placement Interviews</h3>
                    <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Sessions attempted in the last 30 days</p>
                  </div>
                  <Link href="/interview/report" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                    View History <ChevronRight size={13} />
                  </Link>
                </div>

                <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
                  {data.recentSessions.map((session) => {
                    const sGrade = getGradeLabel(session.overallScore ?? 0);
                    const sBand = getGradeBand(session.overallScore ?? 0);
                    const sColor = getGradeColor(sBand);
                    const sBadgeVariant = sBand === "high" ? "verdant" : sBand === "mid" ? "amber" : "coral";
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 py-3.5 transition-colors group cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01] px-2 rounded-xl"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sColor + "15" }}>
                          <Award size={16} style={{ color: sColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs md:text-sm truncate" style={{ color: "var(--th-text-primary)" }}>
                            {session.role} at {session.company}
                          </div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                            {new Date(session.startedAt || "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ID: {session.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono font-bold text-sm" style={{ color: sColor }}>
                            {session.overallScore}%
                          </span>
                          <Badge variant={sBadgeVariant as "verdant" | "amber" | "coral"}>{sGrade}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Start mock interview button to fill and align spacing perfectly */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--th-border)" }}>
                  <Link href="/interview/setup">
                    <Button variant="secondary" className="w-full justify-center">
                      <Play size={13} /> Start new mock interview
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>

          {/* Skills profile tags (col-span-1) */}
          <div className="lg:col-span-1">
            {!loaded ? (
              <SkeletonCard className="h-72" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl border h-full flex flex-col justify-between"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Sparkles size={14} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                      Placement Skills Profile
                    </span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: "var(--th-text-secondary)" }}>
                    Verified core competencies parsed from your connected repositories and assessment logs:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {data.profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/15"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t mt-6 flex items-center justify-between" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-gray-400" />
                    <span className="text-[10px] font-semibold" style={{ color: "var(--th-text-secondary)" }}>Placement Status</span>
                  </div>
                  <Badge variant="amber">Actively Recruiting</Badge>
                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
