"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  Play, TrendingUp, Award, Bell, ChevronRight, BookOpen, BarChart2, Sparkles, AlertCircle,
  CheckCircle2, Circle, FileText, Link2, ArrowRight, Building2, Flame, Target,
} from "lucide-react";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { getGradeBand, getGradeColor, planLabel } from "@synclyft/lib/utils";
import {
  useDashboard, useInsightsDashboard, useCurrentSubscription, useInterviewHistory,
} from "@synclyft/lib/api/hooks";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

interface HistoryRow {
  sessionId?: string; _id?: string; status?: string; targetRole?: string;
  completedAt?: string; startedAt?: string; finalCompositeScore?: number;
  overallScore?: number; finalGrade?: string; campaign?: { title?: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: dash, isLoading, isError, refetch } = useDashboard();
  const { data: insights } = useInsightsDashboard();
  const { data: current } = useCurrentSubscription();
  const { data: history } = useInterviewHistory(6);

  const profile = dash?.profile ?? null;
  const ins = insights as {
    readinessScore?: number; lastInterviewScore?: number | null; totalInterviews?: number; activeStreak?: number;
    nextScheduledMock?: { targetRole?: string; date?: string; isEstimated?: boolean; resumable?: boolean } | null;
    chartData?: {
      radarData?: { labels: string[]; data: number[] };
      lineData?: { date: string; score: number }[];
      barData?: { labels: string[]; data: number[] };
    };
  } | undefined;

  const readiness = Math.round(ins?.readinessScore ?? profile?.placementReadinessScore ?? 0);
  const band = getGradeBand(readiness);
  const gradeColor = getGradeColor(band);
  const ent = current?.entitlement;

  const competency = useMemo(() => {
    const b = ins?.chartData?.barData;
    if (b?.labels?.length) return b.labels.map((l, i) => ({ subject: l, score: Math.round(b.data[i] ?? 0) }));
    const sb = profile?.scoreBreakdown as unknown as Record<string, number> | undefined;
    if (!sb) return [];
    const map: Record<string, string> = {
      academicPerformance: "Academics", codingPerformance: "Coding", aptitudePerformance: "Aptitude",
      communicationSkills: "Communication", mockInterviewPerformance: "Mock", professionalActivities: "Prof.", projectsPortfolio: "Projects",
    };
    return Object.entries(map).map(([k, subject]) => ({ subject, score: Math.round(sb[k] ?? 0) }));
  }, [ins, profile]);

  const roundRadar = useMemo(() => {
    const r = ins?.chartData?.radarData;
    if (!r?.labels?.length) return [];
    return r.labels.map((l, i) => ({ subject: l, score: Math.round(r.data[i] ?? 0) }));
  }, [ins]);

  const trend = useMemo(() => {
    const l = ins?.chartData?.lineData ?? [];
    return l.map((p) => ({ date: new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), score: Math.round(p.score) }));
  }, [ins]);

  const recentSessions: HistoryRow[] = ((history as { analytics?: HistoryRow[] })?.analytics ?? dash?.recentSessions ?? []) as HistoryRow[];
  const skills = profile?.skills ?? [];
  const verifiedPlatforms = (dash as unknown as { verifiedPlatforms?: string[] })?.verifiedPlatforms ?? [];
  const hasCodingProfiles = verifiedPlatforms.length > 0;
  const hasProfile = Boolean(profile?.branch);
  const firstRun = !isLoading && !isError && readiness === 0 && recentSessions.length === 0;

  const checklist = [
    { done: hasProfile, label: "Complete your academic profile", href: "/settings", icon: FileText },
    { done: skills.length > 0, label: "Add your skills & projects", href: "/settings", icon: Sparkles },
    { done: hasCodingProfiles, label: "Sync a coding platform", href: "/settings", icon: Link2 },
    { done: recentSessions.length > 0, label: "Take your first mock interview", href: "/interview/setup", icon: Play },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Student portal</p>
          <h1 className="text-[1.6rem] sm:text-[2rem] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}>
            {greeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-xs flex items-center gap-2 mt-1 flex-wrap" style={{ color: "var(--th-text-muted)" }}>
            <span>{user?.organization || "—"}</span>
            {profile?.branch && <><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /><span>{profile.branch}{profile.graduationYear ? ` · ${profile.graduationYear}` : ""}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/interview/setup" className="flex-1 sm:flex-none"><Button className="w-full sm:w-auto justify-center" icon={<Play size={14} />} data-testid="dashboard-start-interview">New interview</Button></Link>
          <Link href="/resume" className="flex-1 sm:flex-none"><Button className="w-full sm:w-auto justify-center" variant="secondary">Resume analyzer</Button></Link>
        </div>
      </div>

      {/* Entitlement strip */}
      {ent?.source === "seat" && ent.seat ? (
        <div className="rounded-xl border p-3.5 flex flex-wrap items-center gap-3 text-xs" style={{ borderColor: "var(--th-card-border)", backgroundColor: "color-mix(in srgb, #3DDC84 8%, var(--th-card-bg))" }}>
          <Building2 size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span style={{ color: "var(--th-text-primary)" }}>Access provided by <strong>{ent.seat.organizationName}</strong></span>
          {ent.quota && (
            <span style={{ color: "var(--th-text-muted)" }}>· {ent.quota.mockInterviews.unlimited ? "Unlimited" : `${ent.quota.mockInterviews.remaining}/${ent.quota.mockInterviews.limit}`} mock interviews left this month</span>
          )}
          <Link href="/subscription" className="ml-auto text-blue-600 dark:text-blue-400 hover:underline">Details →</Link>
        </div>
      ) : ent?.source === "individual" && ent.plan ? (
        <div className="rounded-xl border p-3.5 flex flex-wrap items-center gap-3 text-xs" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Sparkles size={15} className="text-blue-600 dark:text-blue-400" />
          <span style={{ color: "var(--th-text-primary)" }}>You&apos;re on <strong>{planLabel(ent.plan.planType)}</strong></span>
          {ent.quota && <span style={{ color: "var(--th-text-muted)" }}>· {ent.quota.mockInterviews.unlimited ? "Unlimited" : `${ent.quota.mockInterviews.remaining}/${ent.quota.mockInterviews.limit}`} mock interviews left</span>}
          <Link href="/subscription" className="ml-auto text-blue-600 dark:text-blue-400 hover:underline">Manage →</Link>
        </div>
      ) : ent?.source === "trial" && ent.trials ? (
        <div className="rounded-xl border p-3.5 flex flex-wrap items-center gap-4 text-xs" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <span className="font-semibold" style={{ color: "var(--th-text-primary)" }}>Free trial</span>
          {([["Mock interviews", ent.trials.mockInterviews], ["Reports", ent.trials.studentReports], ["AI evaluations", ent.trials.aiEvaluation]] as const).map(([label, b]) => b && (
            <span key={label} style={{ color: "var(--th-text-muted)" }}>{label}: <strong style={{ color: "var(--th-text-secondary)" }}>{Math.max(0, b.total - b.used)}/{b.total}</strong> left</span>
          ))}
          <Link href="/subscription" className="ml-auto text-blue-600 dark:text-blue-400 hover:underline">Upgrade →</Link>
        </div>
      ) : null}

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> Couldn&apos;t load your dashboard.</span>
          <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {firstRun && (
        <div className="grid gap-6 rounded-2xl border p-6 lg:grid-cols-2 lg:p-8"
          style={{ borderColor: "var(--th-card-border)", background: "linear-gradient(150deg, color-mix(in srgb, var(--th-primary) 10%, var(--th-card-bg)) 0%, var(--th-card-bg) 60%)" }}>
          <div className="flex flex-col justify-center">
            <p className="label-caption" style={{ color: "var(--th-primary)" }}>Getting started</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight lg:text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}>Let&apos;s build your readiness score</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
              Finish these {checklist.length} steps and Synclyft can tell you exactly where you stand before placement season.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/interview/setup"><Button icon={<Play size={14} />}>Start a mock interview</Button></Link>
              <span className="text-xs font-mono" style={{ color: "var(--th-text-faint)" }}>{doneCount}/{checklist.length} done</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {checklist.map((c) => (
              <Link key={c.label} href={c.href} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-[color:var(--th-primary)]"
                style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg-alt)" }}>
                {c.done ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> : <Circle size={18} className="shrink-0" style={{ color: "var(--th-text-faint)" }} />}
                <span className="flex-1 text-sm font-medium" style={{ color: c.done ? "var(--th-text-faint)" : "var(--th-text-primary)", textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
                {!c.done && <ArrowRight size={14} style={{ color: "var(--th-text-faint)" }} />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — readiness hero + competency radar */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        {isLoading ? <SkeletonCard className="h-72 lg:col-span-2" /> : (
          <div className="lg:col-span-2 rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <p className="label-caption" style={{ color: "var(--th-text-faint)" }}>Placement readiness</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl sm:text-6xl font-bold leading-none" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: gradeColor }}>{readiness}</span>
              <span className="text-sm mb-2" style={{ color: "var(--th-text-faint)" }}>/ 100</span>
            </div>
            <Badge variant={band === "high" ? "verdant" : band === "mid" ? "amber" : "coral"}>
              {band === "high" ? "Interview ready" : band === "mid" ? "Progressing" : "Needs work"}
            </Badge>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Mocks done", value: ins?.totalInterviews ?? recentSessions.length, icon: Award },
                { label: "Last score", value: ins?.lastInterviewScore != null ? Math.round(ins.lastInterviewScore) : "—", icon: Target },
                { label: "Day streak", value: ins?.activeStreak ?? profile?.streakDays ?? 0, icon: Flame },
              ].map((k) => (
                <div key={k.label} className="rounded-lg p-2" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                  <k.icon size={12} className="mx-auto mb-1" style={{ color: "var(--th-text-faint)" }} />
                  <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{k.value}</p>
                  <p className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                </div>
              ))}
            </div>
            {ins?.nextScheduledMock && (
              <Link href={ins.nextScheduledMock.resumable ? "/interview/setup" : "/campaigns"}
                className="mt-4 text-[11px] flex items-center gap-1.5 hover:underline" style={{ color: "var(--th-text-muted)" }}>
                <Play size={11} className="text-blue-500" />
                {ins.nextScheduledMock.resumable
                  ? `Resume your ${ins.nextScheduledMock.targetRole || "mock"} interview →`
                  : ins.nextScheduledMock.isEstimated
                    ? `Suggested next: ${ins.nextScheduledMock.targetRole || "mock interview"}`
                    : `Scheduled: ${ins.nextScheduledMock.targetRole || "mock interview"}`}
              </Link>
            )}
          </div>
        )}

        {isLoading ? <SkeletonCard className="h-72 lg:col-span-3" /> : (
          <div className="lg:col-span-3 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Competency profile</h3>
            <p className="text-[10px] mb-1" style={{ color: "var(--th-text-faint)" }}>Where your placement readiness comes from</p>
            {competency.some((c) => c.score > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={competency} outerRadius="72%">
                  <PolarGrid stroke="var(--th-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--th-text-muted)" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#0062FF" fill="#0062FF" fillOpacity={0.22} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-2 text-center" style={{ color: "var(--th-text-faint)" }}>
                <BarChart2 size={26} />
                <p className="text-xs">Complete a mock interview and sync your coding profiles to build your competency profile.</p>
                <Link href="/interview/setup" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Start a mock interview →</Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2 — score trend + last-session round breakdown */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {isLoading ? <SkeletonCard className="h-64 lg:col-span-2" /> : (
          <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Interview score trend</h3>
                <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Composite score across your completed mock interviews</p>
              </div>
              {trend.length >= 2 && (
                <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: trend[trend.length - 1].score >= trend[0].score ? "#3DDC84" : "#FF5C5C" }}>
                  <TrendingUp size={12} />{trend[trend.length - 1].score - trend[0].score >= 0 ? "+" : ""}{trend[trend.length - 1].score - trend[0].score} pts
                </span>
              )}
            </div>
            {trend.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={gradeColor} stopOpacity={0.25} /><stop offset="95%" stopColor={gradeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                  <Area type="monotone" dataKey="score" stroke={gradeColor} strokeWidth={2.5} fill="url(#trendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>Complete at least two mock interviews to see your trend.</p>
            )}
          </div>
        )}

        {isLoading ? <SkeletonCard className="h-64" /> : (
          <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <h3 className="font-bold text-sm mb-3" style={{ color: "var(--th-text-primary)" }}>Last interview by round</h3>
            {roundRadar.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roundRadar} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="subject" tick={{ fontSize: 10, fill: "var(--th-text-muted)" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                    {roundRadar.map((r, i) => <Cell key={i} fill={getGradeColor(getGradeBand(r.score))} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>Your per-round scores show here after your first interview.</p>
            )}
          </div>
        )}
      </div>

      {/* Row 3 — recent interviews + shortcuts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {isLoading ? <SkeletonCard className="h-64 lg:col-span-2" /> : (
          <div className="lg:col-span-2 rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Recent mock interviews</h3>
                <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Tap one to open its full report</p>
              </div>
              <Link href="/progress" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">View all <ChevronRight size={13} /></Link>
            </div>
            {recentSessions.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
                {recentSessions.slice(0, 5).map((s, idx) => {
                  const sid = s.sessionId ?? s._id ?? String(idx);
                  const score = Math.round(s.overallScore ?? s.finalCompositeScore ?? 0);
                  const sBand = getGradeBand(score);
                  const sColor = getGradeColor(sBand);
                  const done = Boolean(s.completedAt) || s.status === "completed";
                  const when = s.completedAt ?? s.startedAt;
                  const content = (
                    <div className="flex items-center gap-4 py-3.5 px-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sColor + "15" }}>
                        <Award size={16} style={{ color: sColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs md:text-sm truncate" style={{ color: "var(--th-text-primary)" }}>
                          {s.campaign?.title || s.targetRole || "Mock interview"}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                          {when ? new Date(when).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </div>
                      </div>
                      {done ? (
                        <><span className="font-mono font-bold text-sm" style={{ color: sColor }}>{score}%</span>
                        <Badge variant={sBand === "high" ? "verdant" : sBand === "mid" ? "amber" : "coral"}>{s.finalGrade ?? "—"}</Badge></>
                      ) : <Badge variant="neutral">in progress</Badge>}
                    </div>
                  );
                  return s.sessionId
                    ? <Link key={sid} href={`/interview/report?session=${s.sessionId}`}>{content}</Link>
                    : <div key={sid}>{content}</div>;
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
                <Play size={26} style={{ color: "var(--th-text-faint)" }} />
                <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>No mock interviews yet. Your first one takes about 30 minutes.</p>
                <Link href="/interview/setup"><Button variant="secondary"><Play size={13} /> Start your first interview</Button></Link>
              </div>
            )}
          </div>
        )}

        {isLoading ? <SkeletonCard className="h-64" /> : (
          <div className="space-y-6">
            <Link href="/notifications" className="block p-5 rounded-2xl border transition-colors hover:border-[color:var(--th-primary)]" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="label-caption" style={{ color: "var(--th-text-faint)" }}>Notifications</p>
                <span className="relative">
                  <Bell size={14} className="text-gray-400" />
                  {(dash?.unreadNotifications ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-blue-500 text-white rounded-full px-1">{dash?.unreadNotifications}</span>}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
                {(dash?.unreadNotifications ?? 0) > 0 ? `${dash?.unreadNotifications} unread. Open inbox →` : "You're all caught up."}
              </p>
            </Link>

            <div className="p-5 rounded-2xl border" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="label-caption mb-3" style={{ color: "var(--th-text-faint)" }}>Shortcuts</p>
              <div className="space-y-2">
                {[
                  { label: "AI study plan", icon: BookOpen, href: "/study-plan" },
                  { label: "My campaigns", icon: Target, href: "/campaigns" },
                  { label: "Progress & history", icon: BarChart2, href: "/progress" },
                  { label: "Resume analyzer", icon: FileText, href: "/resume" },
                ].map((a) => (
                  <Link key={a.label} href={a.href} className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group" style={{ color: "var(--th-text-secondary)" }}>
                    <a.icon size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{a.label}</span>
                    <ChevronRight size={12} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {skills.length > 0 && (
              <div className="p-5 rounded-2xl border" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>Skills</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 12).map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/15">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
