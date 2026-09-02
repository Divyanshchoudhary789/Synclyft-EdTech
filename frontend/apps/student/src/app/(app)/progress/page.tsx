"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { Button } from "@synclyft/ui/components/Button";
import { useProgress, useAnalyticsDashboard, useInterviewHistory, useCurrentSubscription } from "@synclyft/lib/api/hooks";
import { studentService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { Code2, GitBranch, ExternalLink, Trophy, CheckCircle2, AlertCircle, Award, ChevronRight, ShieldAlert, FileBarChart, Lock } from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";

type Metrics = Record<string, Record<string, unknown>>;

const PLATFORM_META: Record<string, { label: string; icon: typeof Code2; url: (u: string) => string }> = {
  leetcode: { label: "LeetCode", icon: Code2, url: (u) => `https://leetcode.com/${u}` },
  github: { label: "GitHub", icon: GitBranch, url: (u) => `https://github.com/${u}` },
  codeforces: { label: "Codeforces", icon: Trophy, url: (u) => `https://codeforces.com/profile/${u}` },
  codechef: { label: "CodeChef", icon: Trophy, url: (u) => `https://codechef.com/users/${u}` },
  hackerrank: { label: "HackerRank", icon: Trophy, url: (u) => `https://hackerrank.com/${u}` },
  gfg: { label: "GeeksforGeeks", icon: Code2, url: (u) => `https://auth.geeksforgeeks.org/user/${u}` },
};

const STAT_FIELDS: Record<string, [string, string][]> = {
  leetcode: [["totalSolved", "Solved"], ["easySolved", "Easy"], ["mediumSolved", "Medium"], ["hardSolved", "Hard"], ["contestRating", "Rating"], ["streak", "Streak"]],
  github: [["totalCommits", "Commits"], ["publicRepos", "Repos"], ["starsEarned", "Stars"], ["followers", "Followers"]],
  codeforces: [["rating", "Rating"], ["maxRating", "Max"], ["totalSolved", "Solved"]],
  codechef: [["globalRank", "Global rank"]],
  hackerrank: [["badgesCount", "Badges"], ["totalSubmissions", "Submissions"]],
  gfg: [["totalProblems", "Problems"]],
};

interface HistoryRow {
  sessionId: string;
  startedAt?: string;
  completedAt?: string;
  overallScore?: number;
  finalGrade?: string;
  proctoringRiskScore?: number;
  isDisqualified?: boolean;
  formattedDuration?: string;
  campaign?: { title?: string } | null;
  roundAnalytics?: { roundType: string }[];
}

export default function ProgressPage() {
  const { data, isLoading, isError, refetch } = useProgress();
  const { data: analytics } = useAnalyticsDashboard(180);
  const { data: history } = useInterviewHistory(20);

  const sessions = ((history as { analytics?: HistoryRow[] })?.analytics ?? []) as HistoryRow[];
  const gradeDist = ((history as { summary?: { gradeDistribution?: Record<string, number> } })?.summary?.gradeDistribution ?? {}) as Record<string, number>;

  const profile = data?.profile;
  const metrics = (profile?.externalMetrics ?? {}) as unknown as Metrics;
  const connected = Object.entries(metrics).filter(
    ([, v]) => v && (v.isVerified || v.username)
  );

  const readiness = Math.round(data?.placementReadinessScore ?? 0);
  const band = getGradeBand(readiness);
  const color = getGradeColor(band);

  const trend = (analytics?.performanceTrend ?? [])
    .filter((p) => typeof p.score === "number")
    .map((p) => ({ date: new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), score: Math.round(p.score) }));

  return (
    <div className="space-y-8">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Progress Tracker</p>
          <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Your progress
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Readiness, mock-interview history and your connected coding platforms</p>
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border p-4 text-sm"
            style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
            <span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> Couldn&apos;t load progress.</span>
            <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3"><SkeletonCard className="h-40" /><SkeletonCard className="h-40" /><SkeletonCard className="h-40" /></div>
        ) : (
          <>
            {/* Summary tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Readiness score", value: `${readiness}`, sub: band === "high" ? "Interview ready" : band === "mid" ? "Progressing" : "Needs work", color },
                { label: "Mock interviews", value: `${data?.completedCount ?? 0}`, sub: `${data?.sessionCount ?? 0} started` },
                { label: "AI insights", value: `${data?.insightCount ?? 0}`, sub: "generated" },
                { label: "Platforms linked", value: `${data?.verifiedPlatforms ?? 0}`, sub: "verified" },
              ].map((t) => (
                <div key={t.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--th-text-faint)" }}>{t.label}</p>
                  <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: t.color ?? "var(--th-text-primary)" }}>{t.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{t.sub}</p>
                </div>
              ))}
            </div>

            {/* Trend */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--th-text-primary)" }}>Interview score history</h3>
              <p className="text-[10px] mb-4" style={{ color: "var(--th-text-faint)" }}>Composite score across your completed mock interviews</p>
              {trend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11, color: "var(--th-text-primary)" }} />
                    <Area type="monotone" dataKey="score" stroke={color} strokeWidth={2.5} fill="url(#pg)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
                  Complete at least two mock interviews to see your trend.
                </p>
              )}
            </div>

            {/* Interview history */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="label-caption" style={{ color: "var(--th-text-primary)" }}>Mock interview history</p>
                <Link href="/interview/setup" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">New interview →</Link>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <Award size={26} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
                  <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>No mock interviews yet.</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>Each session takes ~30 minutes and gives you an AI-scored readiness breakdown.</p>
                  <Link href="/interview/setup"><Button variant="secondary">Start your first interview</Button></Link>
                </div>
              ) : (
                <>
                  {Object.values(gradeDist).some((n) => n > 0) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {Object.entries(gradeDist).filter(([, n]) => n > 0).map(([g, n]) => (
                        <span key={g} className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}>
                          Grade {g}: {n}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    {sessions.map((s) => {
                      const score = Math.round(s.overallScore ?? 0);
                      const sBand = getGradeBand(score);
                      const sColor = getGradeColor(sBand);
                      const when = s.completedAt ?? s.startedAt;
                      return (
                        <Link key={s.sessionId} href={`/interview/report?session=${s.sessionId}`}
                          className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                          style={{ borderColor: "var(--th-border)" }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sColor + "15" }}>
                            <Award size={16} style={{ color: sColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>
                              {s.campaign?.title || "Mock interview"}
                              {(s.roundAnalytics ?? []).length > 0 && (
                                <span className="ml-2 font-normal" style={{ color: "var(--th-text-faint)" }}>
                                  {(s.roundAnalytics ?? []).map((r) => r.roundType).join(" · ")}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono mt-0.5 flex items-center gap-2" style={{ color: "var(--th-text-faint)" }}>
                              {when ? new Date(when).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                              {s.formattedDuration && <span>· {s.formattedDuration}</span>}
                              {s.isDisqualified && <span className="flex items-center gap-0.5 text-rose-500"><ShieldAlert size={9} /> flagged</span>}
                            </div>
                          </div>
                          {s.completedAt ? (
                            <>
                              <span className="font-mono font-bold text-sm" style={{ color: sColor }}>{score}%</span>
                              <Badge variant={sBand === "high" ? "verdant" : sBand === "mid" ? "amber" : "coral"}>{s.finalGrade ?? "—"}</Badge>
                            </>
                          ) : (
                            <Badge variant="neutral">in progress</Badge>
                          )}
                          <ChevronRight size={14} style={{ color: "var(--th-text-faint)" }} />
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Detailed performance report */}
            <PerformanceReportSection />

            {/* Connected platforms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="label-caption" style={{ color: "var(--th-text-primary)" }}>Connected coding platforms</p>
                <Link href="/settings" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Manage connections →</Link>
              </div>

              {connected.length === 0 ? (
                <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <Code2 size={26} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
                  <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>No platforms connected yet.</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>Link LeetCode, GitHub and more so your readiness score reflects your real activity.</p>
                  <Link href="/settings"><Button variant="secondary">Connect a platform</Button></Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {connected.map(([key, v]) => {
                    const meta = PLATFORM_META[key] ?? { label: key, icon: Code2, url: (u: string) => "#" };
                    const username = String(v.username ?? "");
                    const fields = (STAT_FIELDS[key] ?? []).filter(([f]) => Number(v[f] ?? 0) > 0);
                    return (
                      <div key={key} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <meta.icon size={16} style={{ color: "var(--th-primary)" }} />
                            <div>
                              <p className="font-semibold text-sm" style={{ color: "var(--th-text-primary)" }}>{meta.label}</p>
                              <p className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>@{username || "—"}</p>
                            </div>
                          </div>
                          {v.isVerified ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <Badge variant="amber">Unverified</Badge>
                          )}
                        </div>
                        {fields.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {fields.map(([f, label]) => (
                              <div key={f} className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                                <div className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{String(v[f])}</div>
                                <div className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {username && (
                          <a href={meta.url(username)} target="_blank" rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                            View profile <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}

// ── Detailed performance report (seat/subscription-gated, generated on demand) ──
interface DashReport {
  cards?: { key: string; label: string; value: number }[];
  series?: { grades?: Record<string, number>; strengths?: string[]; weaknesses?: string[] };
  entity?: { profile?: { branch?: string; targetRole?: string; placementReadinessScore?: number } | null; batch?: { name?: string } | null };
  generatedAt?: string;
}

function PerformanceReportSection() {
  const { data: sub } = useCurrentSubscription();
  const [report, setReport] = useState<DashReport | null>(null);
  const [busy, setBusy] = useState(false);

  const ent = sub?.entitlement;
  const quota = ent?.quota?.studentReports;
  const gated = !ent || ent.source === "none" || ent.source === "pending";
  const noCredits = quota && !quota.unlimited && quota.remaining <= 0;

  const generate = async () => {
    setBusy(true);
    try {
      setReport((await studentService.performanceReport()) as DashReport);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caption" style={{ color: "var(--th-text-primary)" }}>Detailed performance report</p>
        {quota && (
          <span className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>
            {quota.unlimited ? "Unlimited reports" : `${quota.remaining} of ${quota.limit} left this month`}
          </span>
        )}
      </div>

      {gated ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Lock size={22} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>Detailed reports need an active plan or a college seat.</p>
          <Link href="/subscription"><Button variant="secondary" className="mt-3">See plans</Button></Link>
        </div>
      ) : !report ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <FileBarChart size={22} className="mx-auto mb-2" style={{ color: "var(--th-primary)" }} />
          <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>Generate a full breakdown of your interview metrics, grade mix and AI-identified strengths &amp; gaps.</p>
          {noCredits ? (
            <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">You&apos;ve used all your report credits for this month.</p>
          ) : (
            <Button className="mt-3" loading={busy} onClick={generate} icon={<FileBarChart size={13} />}>Generate report</Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border p-6 space-y-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(report.cards ?? []).map((c) => (
              <div key={c.key} className="rounded-xl p-3" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                <p className="text-[9px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{c.label}</p>
                <p className="mt-1 text-lg font-bold" style={{ color: "var(--th-text-primary)" }}>{Math.round(c.value ?? 0)}</p>
              </div>
            ))}
          </div>

          {report.series?.grades && Object.values(report.series.grades).some((n) => n > 0) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>Grade mix</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.series.grades).filter(([, n]) => n > 0).map(([g, n]) => (
                  <span key={g} className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}>Grade {g}: {n}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            {(report.series?.strengths ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}><CheckCircle2 size={12} className="text-emerald-500" /> Strengths</p>
                <ul className="space-y-1">{report.series!.strengths!.map((s, i) => <li key={i} className="text-xs" style={{ color: "var(--th-text-secondary)" }}>· {s}</li>)}</ul>
              </div>
            )}
            {(report.series?.weaknesses ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}><AlertCircle size={12} className="text-rose-500" /> Focus areas</p>
                <ul className="space-y-1">{report.series!.weaknesses!.map((s, i) => <li key={i} className="text-xs" style={{ color: "var(--th-text-secondary)" }}>· {s}</li>)}</ul>
              </div>
            )}
          </div>

          <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>
            Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString("en-IN") : "just now"}
          </p>
        </div>
      )}
    </div>
  );
}
